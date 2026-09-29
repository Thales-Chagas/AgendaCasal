/**
 * Testes de autorização contra o banco real (RLS + RPCs).
 * Regra de ouro: o Casal A nunca acessa dados do Casal B.
 */
import { randomUUID } from 'node:crypto';

import { anonClient, connect, coupleIdOf, createUser, timedEvent, type TestUser } from './helpers';

let ana: TestUser;
let bruno: TestUser;
let carla: TestUser;
let davi: TestUser;
let coupleA: string;
let coupleB: string;
let eventB: string;

beforeAll(async () => {
  [ana, bruno, carla, davi] = await Promise.all([
    createUser('Ana'),
    createUser('Bruno'),
    createUser('Carla'),
    createUser('Davi'),
  ]);
  coupleA = await connect(ana, bruno);
  coupleB = await connect(carla, davi);

  const ev = timedEvent(coupleB, {
    title: 'Consulta da Carla',
    owner_scope: 'person',
    responsible_user_id: carla.id,
  });
  const { error } = await carla.client.from('events').insert(ev);
  if (error) throw error;
  eventB = ev.id;
});

describe('cadastro', () => {
  it('cria perfil, preferências e um espaço próprio para cada novo usuário', async () => {
    const eva = await createUser('Eva');
    const { data: profile } = await eva.client.from('profiles').select('*').eq('id', eva.id).single();
    expect(profile).toMatchObject({ display_name: 'Eva', terms_version: '2026-09' });

    const { data: settings } = await eva.client.from('notification_settings').select('*').single();
    expect(settings).toMatchObject({ user_id: eva.id, show_details_in_push: false });

    const { data: members } = await eva.client.from('couple_members').select('user_id');
    expect(members).toEqual([{ user_id: eva.id }]);
  });
});

describe('usuário não autenticado (anon)', () => {
  const tables = [
    'profiles',
    'couples',
    'couple_members',
    'couple_invites',
    'events',
    'special_dates',
    'notification_settings',
    'push_tokens',
  ];

  it.each(tables)('não lê a tabela %s', async (table) => {
    const { data, error } = await anonClient().from(table).select('*');
    expect(error ?? (data && data.length === 0 ? 'vazio' : null)).toBeTruthy();
    expect(data ?? []).toHaveLength(0);
  });

  it('não cria compromissos', async () => {
    const { error } = await anonClient().from('events').insert(timedEvent(coupleA));
    expect(error).not.toBeNull();
  });

  it('não executa RPCs', async () => {
    const { error } = await anonClient().rpc('create_couple_invite');
    expect(error).not.toBeNull();
  });
});

describe('Casal A não acessa dados do Casal B', () => {
  it('não lê compromissos do outro casal', async () => {
    const { data } = await ana.client.from('events').select('id').eq('couple_id', coupleB);
    expect(data).toEqual([]);
    const { data: byId } = await ana.client.from('events').select('id').eq('id', eventB);
    expect(byId).toEqual([]);
  });

  it('não cria compromisso no outro casal', async () => {
    const { error } = await ana.client.from('events').insert(timedEvent(coupleB));
    expect(error?.code).toBe('42501');
  });

  it('não edita nem exclui (logicamente) compromisso do outro casal', async () => {
    const { data: updated } = await ana.client
      .from('events')
      .update({ title: 'hackeado' })
      .eq('id', eventB)
      .select();
    expect(updated).toEqual([]);
    const { data: deleted } = await ana.client
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', eventB)
      .select();
    expect(deleted).toEqual([]);

    const { data: still } = await carla.client
      .from('events')
      .select('title, deleted_at')
      .eq('id', eventB)
      .single();
    expect(still).toEqual({ title: 'Consulta da Carla', deleted_at: null });
  });

  it('não apaga fisicamente nenhum compromisso (nem do próprio casal)', async () => {
    const { error } = await carla.client.from('events').delete().eq('id', eventB);
    expect(error).not.toBeNull();
  });

  it('não lê perfis, vínculos ou espaço do outro casal', async () => {
    const { data: profiles } = await ana.client.from('profiles').select('id');
    expect(new Set(profiles?.map((p) => p.id))).toEqual(new Set([ana.id, bruno.id]));

    const { data: couples } = await ana.client.from('couples').select('id');
    expect(couples).toEqual([{ id: coupleA }]);

    const { data: members } = await ana.client
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', coupleB);
    expect(members).toEqual([]);
  });

  it('não lê datas especiais do outro casal', async () => {
    await carla.client
      .from('special_dates')
      .insert({ couple_id: coupleB, title: 'Aniversário', date: '1990-05-10' });
    const { data } = await ana.client.from('special_dates').select('id').eq('couple_id', coupleB);
    expect(data).toEqual([]);
  });

  it('não move um compromisso próprio para o outro casal', async () => {
    const ev = timedEvent(coupleA);
    await ana.client.from('events').insert(ev);
    const { error } = await ana.client.from('events').update({ couple_id: coupleB }).eq('id', ev.id);
    expect(error).not.toBeNull();
  });

  it('não define como responsável alguém de fora do casal', async () => {
    const { error } = await ana.client
      .from('events')
      .insert(timedEvent(coupleA, { owner_scope: 'person', responsible_user_id: carla.id }));
    expect(error?.code).toBe('42501');
  });
});

describe('integridade dos vínculos', () => {
  it('não entra em outro casal inserindo vínculo diretamente', async () => {
    const { error } = await ana.client.from('couple_members').insert({ couple_id: coupleB, user_id: ana.id });
    expect(error).not.toBeNull();
  });

  it('não altera nem cria espaços diretamente', async () => {
    const { error: insertError } = await ana.client.from('couples').insert({});
    expect(insertError).not.toBeNull();
    const { data } = await ana.client
      .from('couples')
      .update({ connected_at: null })
      .eq('id', coupleA)
      .select();
    expect(data ?? []).toEqual([]);
  });

  it('não lê convites diretamente (nem o hash)', async () => {
    const { data } = await ana.client.from('couple_invites').select('*');
    expect(data ?? []).toEqual([]);
  });

  it('não altera o perfil do parceiro nem campos protegidos do próprio perfil', async () => {
    const { data } = await ana.client
      .from('profiles')
      .update({ display_name: 'x' })
      .eq('id', bruno.id)
      .select();
    expect(data).toEqual([]);
    const { error } = await ana.client.from('profiles').update({ terms_version: 'forjado' }).eq('id', ana.id);
    expect(error).not.toBeNull();
  });

  it('não lê preferências nem tokens do parceiro', async () => {
    const { data } = await ana.client.from('notification_settings').select('user_id');
    expect(data).toEqual([{ user_id: ana.id }]);
    const { error } = await ana.client
      .from('push_tokens')
      .insert({ user_id: bruno.id, token: `ExponentPushToken[${randomUUID()}]`, platform: 'ios' });
    expect(error).not.toBeNull();
  });
});

describe('campos controlados pelo servidor', () => {
  it('ignora versão, autoria e datas enviadas pelo cliente', async () => {
    const ev = timedEvent(coupleA, {
      version: 99,
      created_by: bruno.id,
      created_at: '2000-01-01T00:00:00Z',
    });
    await ana.client.from('events').insert(ev);
    const { data } = await ana.client
      .from('events')
      .select('version, created_by, created_at')
      .eq('id', ev.id)
      .single();
    expect(data?.version).toBe(1);
    expect(data?.created_by).toBe(ana.id);
    expect(data?.created_at).not.toContain('2000-01-01');

    await bruno.client.from('events').update({ title: 'Jantar às 21h', version: 50 }).eq('id', ev.id);
    const { data: after } = await ana.client
      .from('events')
      .select('version, updated_by')
      .eq('id', ev.id)
      .single();
    expect(after).toEqual({ version: 2, updated_by: bruno.id });
  });
});

describe('parceiros compartilham a agenda', () => {
  it('o compromisso criado por um aparece para o outro', async () => {
    const ev = timedEvent(coupleA, { title: 'Cinema' });
    await bruno.client.from('events').insert(ev);
    const { data } = await ana.client.from('events').select('title').eq('id', ev.id).single();
    expect(data?.title).toBe('Cinema');
  });

  it('confirma a coupleId de cada um', async () => {
    expect(await coupleIdOf(ana)).toBe(coupleA);
    expect(await coupleIdOf(bruno)).toBe(coupleA);
    expect(await coupleIdOf(carla)).toBe(coupleB);
    expect(coupleA).not.toBe(coupleB);
  });
});
