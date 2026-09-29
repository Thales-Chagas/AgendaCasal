/**
 * Convites, conexão, saída do casal, exportação e exclusão de conta.
 */
import { anonClient, connect, coupleIdOf, createUser, timedEvent, withDb } from './helpers';

async function createInvite(client: Awaited<ReturnType<typeof createUser>>['client']) {
  const { data, error } = await client.rpc('create_couple_invite').single<{ code: string; expires_at: string }>();
  if (error) throw error;
  return data;
}

describe('convite', () => {
  it('gera código de 8 caracteres sem símbolos ambíguos, válido por 48 horas', async () => {
    const ana = await createUser('Ana');
    const invite = await createInvite(ana.client);
    expect(invite.code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{8}$/);
    const hours = (new Date(invite.expires_at).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(47.9);
    expect(hours).toBeLessThanOrEqual(48);
  });

  it('não guarda o código em claro no banco', async () => {
    const ana = await createUser('Ana');
    const invite = await createInvite(ana.client);
    const rows = await withDb((db) =>
      db.query('select code_hash from public.couple_invites where created_by = $1', [ana.id]),
    );
    expect(rows.rows[0].code_hash).toHaveLength(64);
    expect(JSON.stringify(rows.rows)).not.toContain(invite.code);
  });

  it('mostra quem convidou e aceita o código com hífen e minúsculas', async () => {
    const [ana, bruno] = await Promise.all([createUser('Ana'), createUser('Bruno')]);
    const { code } = await createInvite(ana.client);
    const typed = `${code.slice(0, 4).toLowerCase()}-${code.slice(4)} `;

    const { data: preview } = await bruno.client.rpc('preview_invite', { p_code: typed });
    expect(preview).toEqual([expect.objectContaining({ inviter_name: 'Ana', my_event_count: 0 })]);

    const { data: coupleId } = await bruno.client.rpc('accept_invite', { p_code: typed });
    expect(coupleId).toBe(await coupleIdOf(ana));

    const { data: couple } = await ana.client.from('couples').select('connected_at').single();
    expect(couple?.connected_at).not.toBeNull();
  });

  it('leva os compromissos de quem aceita para a agenda do casal', async () => {
    const [ana, bruno] = await Promise.all([createUser('Ana'), createUser('Bruno')]);
    const brunoSolo = await coupleIdOf(bruno);
    const ev = timedEvent(brunoSolo, { title: 'Academia', owner_scope: 'person', responsible_user_id: bruno.id });
    await bruno.client.from('events').insert(ev);

    const coupleId = await connect(ana, bruno);

    const { data } = await ana.client.from('events').select('title, couple_id').eq('id', ev.id).single();
    expect(data).toEqual({ title: 'Academia', couple_id: coupleId });
    const leftover = await withDb((db) => db.query('select 1 from public.couples where id = $1', [brunoSolo]));
    expect(leftover.rowCount).toBe(0);
  });

  it('recusa convite inválido, expirado, revogado ou já usado', async () => {
    const [ana, bruno, carla] = await Promise.all([createUser('Ana'), createUser('Bruno'), createUser('Carla')]);

    const { data: invalid } = await bruno.client.rpc('accept_invite', { p_code: 'ZZZZZZZZ' });
    expect(invalid).toBeNull();

    const expired = await createInvite(ana.client);
    await withDb((db) =>
      db.query(`update public.couple_invites set expires_at = now() - interval '1 minute' where created_by = $1`, [ana.id]),
    );
    const { data: expiredResult } = await bruno.client.rpc('accept_invite', { p_code: expired.code });
    expect(expiredResult).toBeNull();

    const revoked = await createInvite(ana.client);
    const current = await createInvite(ana.client); // criar outro revoga o anterior
    const { data: revokedResult } = await bruno.client.rpc('accept_invite', { p_code: revoked.code });
    expect(revokedResult).toBeNull();

    const { data: ok } = await bruno.client.rpc('accept_invite', { p_code: current.code });
    expect(ok).not.toBeNull();

    const { data: reused } = await carla.client.rpc('accept_invite', { p_code: current.code });
    expect(reused).toBeNull();
  });

  it('não aceita o próprio convite', async () => {
    const ana = await createUser('Ana');
    const { code } = await createInvite(ana.client);
    const { error } = await ana.client.rpc('accept_invite', { p_code: code });
    expect(error?.message).toBe('own_invite');
  });

  it('não permite mais de duas pessoas no casal', async () => {
    const [ana, bruno, carla] = await Promise.all([createUser('Ana'), createUser('Bruno'), createUser('Carla')]);
    const { code } = await createInvite(ana.client);
    // Um segundo convite válido para o mesmo casal, inserido por fora (cenário de corrida).
    await connect(ana, bruno);
    await withDb((db) =>
      db.query(
        `insert into public.couple_invites (couple_id, created_by, code_hash, expires_at)
         select couple_id, $1, private.invite_code_hash('FULL' || $2), now() + interval '1 hour'
           from public.couple_members where user_id = $1`,
        [ana.id, ana.id.slice(0, 4)],
      ),
    );
    const { error } = await carla.client.rpc('accept_invite', { p_code: `FULL${ana.id.slice(0, 4)}` });
    expect(error?.message).toBe('couple_full');
    expect(code).toBeTruthy();

    const { error: inviteError } = await ana.client.rpc('create_couple_invite');
    expect(inviteError?.message).toBe('already_paired');
  });

  it('quem já está conectado não aceita outro convite', async () => {
    const [ana, bruno, carla] = await Promise.all([createUser('Ana'), createUser('Bruno'), createUser('Carla')]);
    await connect(ana, bruno);
    const { code } = await createInvite(carla.client);
    const { error } = await bruno.client.rpc('accept_invite', { p_code: code });
    expect(error?.message).toBe('already_paired');
  });

  it('bloqueia após 10 tentativas erradas em uma hora', async () => {
    const [ana, eva] = await Promise.all([createUser('Ana'), createUser('Eva')]);
    const { code } = await createInvite(ana.client);
    for (let i = 0; i < 10; i++) {
      await eva.client.rpc('accept_invite', { p_code: `ERRADO${i}` });
    }
    const { error } = await eva.client.rpc('accept_invite', { p_code: code });
    expect(error?.message).toBe('too_many_attempts');
  });
});

describe('desfazer vínculo', () => {
  it('leva os compromissos pessoais, copia os do casal e não apaga nada do parceiro', async () => {
    const [ana, bruno] = await Promise.all([createUser('Ana'), createUser('Bruno')]);
    const coupleId = await connect(ana, bruno);

    const mine = timedEvent(coupleId, { title: 'Dentista do Bruno', owner_scope: 'person', responsible_user_id: bruno.id });
    const hers = timedEvent(coupleId, { title: 'Reunião da Ana', owner_scope: 'person', responsible_user_id: ana.id });
    const ours = timedEvent(coupleId, { title: 'Viagem' });
    await bruno.client.from('events').insert([mine, hers, ours]);

    const { data: newCouple, error } = await bruno.client.rpc('leave_couple', { p_keep_shared_copy: true });
    expect(error).toBeNull();

    // Bruno: novo espaço com o dele e a cópia do "Nosso".
    const { data: brunoEvents } = await bruno.client.from('events').select('title, couple_id').is('deleted_at', null);
    expect(brunoEvents?.map((e) => e.title).sort()).toEqual(['Dentista do Bruno', 'Viagem']);
    expect(brunoEvents?.every((e) => e.couple_id === newCouple)).toBe(true);

    // Ana: mantém o dela e o "Nosso". O do Bruno sai por exclusão lógica (sincroniza).
    const { data: anaEvents } = await ana.client.from('events').select('title, deleted_at');
    const byTitle = Object.fromEntries((anaEvents ?? []).map((e) => [e.title, e.deleted_at]));
    expect(byTitle['Reunião da Ana']).toBeNull();
    expect(byTitle['Viagem']).toBeNull();
    expect(byTitle['Dentista do Bruno']).not.toBeNull();

    // Deixam de se enxergar.
    const { data: profiles } = await ana.client.from('profiles').select('id');
    expect(profiles).toEqual([{ id: ana.id }]);
    const { data: brunoSeesAna } = await bruno.client.from('events').select('id').eq('couple_id', coupleId);
    expect(brunoSeesAna).toEqual([]);
  });

  it('não é possível sair quando se está sozinho', async () => {
    const ana = await createUser('Ana');
    const { error } = await ana.client.rpc('leave_couple', { p_keep_shared_copy: true });
    expect(error?.message).toBe('not_paired');
  });
});

describe('LGPD', () => {
  it('exporta somente os próprios dados e os da agenda do casal', async () => {
    const [ana, bruno, carla] = await Promise.all([createUser('Ana'), createUser('Bruno'), createUser('Carla')]);
    const coupleId = await connect(ana, bruno);
    await ana.client.from('events').insert(timedEvent(coupleId, { title: 'Nosso jantar' }));
    await carla.client.from('events').insert(timedEvent(await coupleIdOf(carla), { title: 'Segredo da Carla' }));

    const { data } = await ana.client.rpc('export_my_data');
    const text = JSON.stringify(data);
    expect(data.account.email).toBe(ana.email);
    expect(text).toContain('Nosso jantar');
    expect(text).not.toContain('Segredo da Carla');
    expect(text).not.toContain(bruno.email);
  });

  it('exclui a conta: remove os dados pessoais e mantém os compromissos "Nosso" do parceiro', async () => {
    const [ana, bruno] = await Promise.all([createUser('Ana'), createUser('Bruno')]);
    const coupleId = await connect(ana, bruno);
    await bruno.client.from('events').insert([
      timedEvent(coupleId, { title: 'Pessoal do Bruno', owner_scope: 'person', responsible_user_id: bruno.id }),
      timedEvent(coupleId, { title: 'Nosso' }),
    ]);

    const { error } = await bruno.client.rpc('delete_my_account');
    expect(error).toBeNull();

    const { data: anaEvents } = await ana.client.from('events').select('title');
    expect(anaEvents?.map((e) => e.title)).toEqual(['Nosso']);
    const { data: couple } = await ana.client.from('couples').select('sync_epoch, connected_at').single();
    expect(couple).toEqual({ sync_epoch: 2, connected_at: null });

    const { error: loginError } = await anonClient().auth.signInWithPassword({ email: bruno.email, password: bruno.password });
    expect(loginError).not.toBeNull();

    // Ana pode convidar outra pessoa.
    const { error: inviteError } = await ana.client.rpc('create_couple_invite');
    expect(inviteError).toBeNull();
  });
});
