/**
 * Financeiro: contas do casal são compartilhadas; contas pessoais são privadas de verdade
 * (o parceiro não vê, não altera e não recebe nem por sincronização).
 */
import { randomUUID } from 'node:crypto';

import { anonClient, connect, coupleIdOf, createUser, type TestUser } from './helpers';

function bill(coupleId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    couple_id: coupleId,
    title: 'Aluguel',
    category: 'housing',
    amount_cents: 180000,
    frequency: 'monthly',
    first_due_date: '2026-10-05',
    owner_scope: 'couple',
    ...overrides,
  };
}

let ana: TestUser;
let bruno: TestUser;
let carla: TestUser;
let coupleA: string;
let sharedBill: ReturnType<typeof bill>;
let anaPrivate: ReturnType<typeof bill>;

beforeAll(async () => {
  [ana, bruno, carla] = await Promise.all([createUser('Ana'), createUser('Bruno'), createUser('Carla')]);
  coupleA = await connect(ana, bruno);

  sharedBill = bill(coupleA);
  anaPrivate = bill(coupleA, {
    title: 'Cartão da Ana',
    category: 'card',
    owner_scope: 'person',
    owner_user_id: ana.id,
  });
  const { error } = await ana.client.from('bills').insert([sharedBill, anaPrivate]);
  if (error) throw error;
});

describe('contas do casal', () => {
  it('os dois veem e podem marcar como paga', async () => {
    const { data } = await bruno.client.from('bills').select('id').eq('id', sharedBill.id);
    expect(data).toHaveLength(1);

    const { data: updated, error } = await bruno.client
      .from('bills')
      .update({ paid_periods: ['2026-10-05'] })
      .eq('id', sharedBill.id)
      .select('paid_periods, version, updated_by')
      .single();
    expect(error).toBeNull();
    expect(updated).toMatchObject({ paid_periods: ['2026-10-05'], version: 2, updated_by: bruno.id });
  });
});

describe('contas pessoais', () => {
  it('só quem criou vê', async () => {
    const { data: mine } = await ana.client.from('bills').select('id').eq('id', anaPrivate.id);
    expect(mine).toHaveLength(1);

    const { data: partner } = await bruno.client.from('bills').select('id').eq('id', anaPrivate.id);
    expect(partner).toHaveLength(0);
  });

  it('o parceiro não consegue alterar nem excluir', async () => {
    const { data } = await bruno.client
      .from('bills')
      .update({ title: 'Mexido', deleted_at: new Date().toISOString() })
      .eq('id', anaPrivate.id)
      .select('id');
    expect(data).toHaveLength(0);

    const { data: still } = await ana.client
      .from('bills')
      .select('title, deleted_at')
      .eq('id', anaPrivate.id);
    expect(still).toEqual([{ title: 'Cartão da Ana', deleted_at: null }]);
  });

  it('ninguém cria conta pessoal em nome do parceiro', async () => {
    const { error } = await bruno.client
      .from('bills')
      .insert(bill(coupleA, { owner_scope: 'person', owner_user_id: ana.id }));
    expect(error).not.toBeNull();
  });

  it('não dá para transformar uma conta privada em compartilhada (nem o contrário)', async () => {
    const { error: toShared } = await ana.client
      .from('bills')
      .update({ owner_scope: 'couple', owner_user_id: null })
      .eq('id', anaPrivate.id);
    expect(toShared).not.toBeNull();

    const { error: toPrivate } = await ana.client
      .from('bills')
      .update({ owner_scope: 'person', owner_user_id: ana.id })
      .eq('id', sharedBill.id);
    expect(toPrivate).not.toBeNull();
  });
});

describe('isolamento', () => {
  it('outro casal e visitantes não veem nenhuma conta', async () => {
    const { data: other } = await carla.client.from('bills').select('id').eq('couple_id', coupleA);
    expect(other).toHaveLength(0);

    const { data: anon } = await anonClient().from('bills').select('id');
    expect(anon ?? []).toHaveLength(0);
  });

  it('outro casal não cria contas no espaço de A', async () => {
    const { error } = await carla.client.from('bills').insert(bill(coupleA));
    expect(error).not.toBeNull();
  });

  it('valida os campos no servidor', async () => {
    const { error: badTitle } = await ana.client.from('bills').insert(bill(coupleA, { title: '  ' }));
    expect(badTitle).not.toBeNull();
    const { error: badAmount } = await ana.client.from('bills').insert(bill(coupleA, { amount_cents: -1 }));
    expect(badAmount).not.toBeNull();
    const { error: badReminder } = await ana.client
      .from('bills')
      .insert(bill(coupleA, { reminder_days: [30] }));
    expect(badReminder).not.toBeNull();
  });
});

describe('desfazer vínculo e LGPD', () => {
  it('ao sair, as contas pessoais vão junto e as do casal viram cópia', async () => {
    const [eva, fabio] = await Promise.all([createUser('Eva'), createUser('Fabio')]);
    const couple = await connect(eva, fabio);
    const shared = bill(couple, { title: 'Internet', category: 'internet' });
    const evaOnly = bill(couple, { title: 'Academia', owner_scope: 'person', owner_user_id: eva.id });
    const fabioOnly = bill(couple, { title: 'Curso', owner_scope: 'person', owner_user_id: fabio.id });
    await eva.client.from('bills').insert([shared, evaOnly]);
    await fabio.client.from('bills').insert(fabioOnly);

    const { error } = await eva.client.rpc('leave_couple', { p_keep_shared_copy: true });
    expect(error).toBeNull();
    const evaSpace = await coupleIdOf(eva);

    const { data: evaBills } = await eva.client.from('bills').select('title, owner_scope, couple_id');
    expect(evaBills?.map((b) => b.title).sort()).toEqual(['Academia', 'Internet']);
    expect(evaBills?.every((b) => b.couple_id === evaSpace)).toBe(true);

    const { data: fabioBills } = await fabio.client.from('bills').select('title').is('deleted_at', null);
    expect(fabioBills?.map((b) => b.title).sort()).toEqual(['Curso', 'Internet']);
  });

  it('a exportação inclui as contas do casal e as minhas, nunca as privadas do parceiro', async () => {
    const { data } = await bruno.client.rpc('export_my_data');
    const titles = (data as { bills: { title: string }[] }).bills.map((b) => b.title);
    expect(titles).toContain('Aluguel');
    expect(titles).not.toContain('Cartão da Ana');
  });
});
