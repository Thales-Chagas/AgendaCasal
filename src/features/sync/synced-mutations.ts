import { AppError } from '@/core/errors/app-error';

import type { EntityName } from './entities';
import type { EntityMap, LocalStore } from './local-store';

export type MutationContext = { userId: string; coupleId: string };

export type MutationDeps = {
  local: LocalStore;
  context: () => MutationContext;
  newId: () => string;
  now?: () => Date;
  /** Chamado após cada alteração local (atualizar telas + disparar envio). */
  afterChange: (entity: EntityName) => void;
};

type Editable<E extends EntityName> = Omit<
  EntityMap[E],
  'id' | 'coupleId' | 'version' | 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

/**
 * Alterações "otimistas": gravam na cópia local na hora (a tela responde imediatamente)
 * e entram na fila de envio. Funcionam sem internet.
 */
export function createSyncedMutations<E extends EntityName>(entity: E, deps: MutationDeps) {
  const now = () => (deps.now ?? (() => new Date()))().toISOString();

  async function current(id: string): Promise<EntityMap[E]> {
    const value = await deps.local.get(entity, id);
    if (!value) throw new AppError('not_found');
    return value;
  }

  return {
    async create(fields: Editable<E>): Promise<EntityMap[E]> {
      const { userId, coupleId } = deps.context();
      const timestamp = now();
      const id = deps.newId();
      const value = {
        ...fields,
        id,
        coupleId,
        version: 0,
        createdBy: userId,
        updatedBy: userId,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      } as unknown as EntityMap[E];
      await deps.local.put(entity, value);
      await deps.local.enqueue(entity, id, 'create', { ...fields, id, coupleId }, null);
      deps.afterChange(entity);
      return value;
    },

    async update(id: string, patch: Partial<Editable<E>>): Promise<EntityMap[E]> {
      const before = await current(id);
      const { userId } = deps.context();
      const value = { ...before, ...patch, updatedAt: now(), updatedBy: userId } as EntityMap[E];
      await deps.local.put(entity, value);
      await deps.local.enqueue(entity, id, 'update', patch as Record<string, unknown>, before);
      deps.afterChange(entity);
      return value;
    },

    /** Exclui e devolve uma função "Desfazer". */
    async remove(id: string): Promise<() => Promise<void>> {
      const before = await current(id);
      await deps.local.put(entity, { ...before, deletedAt: now() });
      await deps.local.enqueue(entity, id, 'delete', {}, before);
      deps.afterChange(entity);

      return async () => {
        const cancelled = await deps.local.cancelPendingDelete(entity, id);
        if (cancelled) {
          await deps.local.put(entity, before);
        } else {
          // Já foi enviada: desfazemos no servidor também.
          const tombstone = await current(id);
          await deps.local.put(entity, { ...tombstone, deletedAt: null });
          await deps.local.enqueue(entity, id, 'update', { deletedAt: null }, tombstone);
        }
        deps.afterChange(entity);
      };
    },
  };
}

export type SyncedMutations<E extends EntityName> = ReturnType<typeof createSyncedMutations<E>>;
