import type { SupabaseClient } from '@supabase/supabase-js';

import { toAppError } from '@/core/errors/app-error';

import type { EntityName, ServerRow } from './entities';

/** Operações remotas usadas pela sincronização (implementável por um falso em testes). */
export interface RemoteSource {
  /** Alterações desde `since` (inclusive), em ordem de `updated_at`. */
  pullChanges(entity: EntityName, since: string | null, limit: number): Promise<ServerRow[]>;
  fetchById(entity: EntityName, id: string): Promise<ServerRow | null>;
  /** Insere; se o ID já existir (reenvio), devolve a linha existente. */
  insert(entity: EntityName, row: Record<string, unknown>): Promise<ServerRow>;
  /** Atualiza só se a versão no servidor ainda for `baseVersion`. `null` = conflito. */
  updateIfVersion(
    entity: EntityName,
    id: string,
    baseVersion: number,
    patch: Record<string, unknown>,
  ): Promise<ServerRow | null>;
  /** Exclusão lógica (sempre vence edições). `null` se o item não existe/não é visível. */
  softDelete(entity: EntityName, id: string): Promise<ServerRow | null>;
  getSyncEpoch(): Promise<{ coupleId: string; epoch: number }>;
}

export function createSupabaseRemoteSource(client: SupabaseClient): RemoteSource {
  const check = <T>(result: { data: T; error: unknown }): T => {
    if (result.error) throw toAppError(result.error);
    return result.data;
  };

  return {
    async pullChanges(entity, since, limit) {
      let query = client.from(entity).select('*').order('updated_at', { ascending: true }).limit(limit);
      if (since) query = query.gte('updated_at', since);
      return check(await query) as ServerRow[];
    },

    async fetchById(entity, id) {
      return check(await client.from(entity).select('*').eq('id', id).maybeSingle()) as ServerRow | null;
    },

    async insert(entity, row) {
      const result = await client.from(entity).insert(row).select('*').single();
      if (result.error && (result.error as { code?: string }).code === '23505') {
        const existing = check(
          await client
            .from(entity)
            .select('*')
            .eq('id', row.id as string)
            .maybeSingle(),
        );
        if (existing) return existing as ServerRow;
      }
      return check(result) as ServerRow;
    },

    async updateIfVersion(entity, id, baseVersion, patch) {
      const result = await client
        .from(entity)
        .update(patch)
        .eq('id', id)
        .eq('version', baseVersion)
        .select('*');
      const rows = check(result) as ServerRow[];
      return rows[0] ?? null;
    },

    async softDelete(entity, id) {
      const rows = check(
        await client.from(entity).update({ deleted_at: new Date().toISOString() }).eq('id', id).select('*'),
      ) as ServerRow[];
      return rows[0] ?? null;
    },

    async getSyncEpoch() {
      const row = check(await client.from('couples').select('id, sync_epoch').single()) as {
        id: string;
        sync_epoch: number;
      };
      return { coupleId: row.id, epoch: row.sync_epoch };
    },
  };
}
