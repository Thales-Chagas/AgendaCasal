import * as Crypto from 'expo-crypto';
import { AppState, type NativeEventSubscription } from 'react-native';
import { create } from 'zustand';

import { logger } from '@/core/logging/logger';
import { queryClient } from '@/core/query/query-client';
import { deleteEncryptedDatabase, openEncryptedDatabase } from '@/core/storage/encrypted-database';
import { getSupabase } from '@/core/supabase/client';
import { toast } from '@/design-system';
import { onSignOut } from '@/features/auth/auth-service';

import type { EntityName } from './entities';
import { createLocalStore, type LocalStore } from './local-store';
import { createSupabaseRemoteSource } from './remote-source';
import { createSyncEngine, type SyncEngine } from './sync-engine';
import { createSyncedMutations, type SyncedMutations } from './synced-mutations';

export type SyncStatus = 'idle' | 'syncing' | 'offline';

type RuntimeState = {
  ready: boolean;
  status: SyncStatus;
  pending: number;
  lastSyncedAt: string | null;
};

/** Estado observável da agenda local (para indicadores discretos na interface). */
export const useAgendaStatus = create<RuntimeState>(() => ({
  ready: false,
  status: 'idle',
  pending: 0,
  lastSyncedAt: null,
}));

export type AgendaRuntime = {
  userId: string;
  coupleId: string;
  local: LocalStore;
  engine: SyncEngine;
  events: SyncedMutations<'events'>;
  specialDates: SyncedMutations<'special_dates'>;
  requestSync: () => void;
};

let runtime: AgendaRuntime | null = null;
let cleanup: (() => void) | null = null;
let starting: Promise<AgendaRuntime> | null = null;

export const agendaKeys = {
  all: ['agenda'] as const,
  entity: (entity: EntityName) => ['agenda', entity] as const,
};

const changeListeners = new Set<() => void>();

/** Avisa outras features (ex.: lembretes) quando a agenda local mudou. */
export function onAgendaChanged(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

function notifyChanged(entities: Iterable<EntityName>) {
  for (const entity of entities) void queryClient.invalidateQueries({ queryKey: agendaKeys.entity(entity) });
  for (const listener of changeListeners) listener();
}

export function getAgendaRuntime(): AgendaRuntime | null {
  return runtime;
}

export function requireAgendaRuntime(): AgendaRuntime {
  if (!runtime) throw new Error('Agenda runtime not started');
  return runtime;
}

/**
 * Abre a agenda local do usuário (um banco criptografado por conta), liga a
 * sincronização (ao abrir, ao voltar para o app, ao reconectar e por tempo real).
 */
export async function startAgendaRuntime(userId: string, coupleId: string): Promise<AgendaRuntime> {
  if (runtime && runtime.userId === userId) {
    runtime.coupleId = coupleId;
    runtime.requestSync();
    return runtime;
  }
  if (starting) return starting;

  starting = (async () => {
    await stopAgendaRuntime();
    const db = await openEncryptedDatabase(`agenda-${userId}`, 'background');
    const local = await createLocalStore(db);
    const supabase = getSupabase();
    const engine = createSyncEngine({
      local,
      remote: createSupabaseRemoteSource(supabase),
      onDataChanged: notifyChanged,
      onConflict: ({ kind }) =>
        toast.info(
          kind === 'deleted_remotely'
            ? 'Este compromisso foi excluído no outro celular.'
            : 'Este compromisso também foi alterado no outro celular. Juntamos as alterações.',
        ),
      onRejected: () => toast.error('Não conseguimos salvar uma alteração. Ela foi desfeita.'),
    });

    let timer: ReturnType<typeof setTimeout> | null = null;
    const runSync = async () => {
      useAgendaStatus.setState({ status: 'syncing' });
      const result = await engine.sync();
      useAgendaStatus.setState({
        status: result.offline ? 'offline' : 'idle',
        pending: result.pending,
        lastSyncedAt: result.offline ? useAgendaStatus.getState().lastSyncedAt : new Date().toISOString(),
      });
    };
    const requestSync = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void runSync(), 250);
    };

    const context = () => ({ userId, coupleId: runtime?.coupleId ?? coupleId });
    const afterChange = (entity: EntityName) => {
      notifyChanged([entity]);
      void local.pendingCount().then((pending) => useAgendaStatus.setState({ pending }));
      requestSync();
    };
    const mutationDeps = { local, context, newId: () => Crypto.randomUUID(), afterChange };

    const instance: AgendaRuntime = {
      userId,
      coupleId,
      local,
      engine,
      events: createSyncedMutations('events', mutationDeps),
      specialDates: createSyncedMutations('special_dates', mutationDeps),
      requestSync,
    };

    // Tempo real: apenas um "sinal" para buscar as mudanças (sem polling).
    const channel = supabase
      .channel(`agenda:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `couple_id=eq.${coupleId}` },
        requestSync,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'special_dates', filter: `couple_id=eq.${coupleId}` },
        requestSync,
      )
      .subscribe();

    const appState: NativeEventSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') requestSync();
    });

    cleanup = () => {
      if (timer) clearTimeout(timer);
      appState.remove();
      void supabase.removeChannel(channel);
    };

    runtime = instance;
    useAgendaStatus.setState({ ready: true });
    notifyChanged(['events', 'special_dates']);
    requestSync();
    return instance;
  })();

  try {
    return await starting;
  } finally {
    starting = null;
  }
}

export async function stopAgendaRuntime(): Promise<void> {
  cleanup?.();
  cleanup = null;
  const current = runtime;
  runtime = null;
  useAgendaStatus.setState({ ready: false, status: 'idle', pending: 0 });
  if (current) {
    await current.local.db.closeAsync().catch((error) => logger.warn('Close agenda db failed', { error }));
  }
}

// Ao sair da conta, a cópia local da agenda (dados compartilhados do casal) é apagada
// deste aparelho. As notas privadas NÃO são tocadas.
onSignOut(async (userId) => {
  await stopAgendaRuntime();
  await deleteEncryptedDatabase(`agenda-${userId}`);
});
