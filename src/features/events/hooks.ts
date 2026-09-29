import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { toAppError } from '@/core/errors/app-error';
import { logger } from '@/core/logging/logger';
import { toast } from '@/design-system';
import { useNow } from '@/shared/hooks/use-now';
import { agendaKeys, requireAgendaRuntime, useAgendaStatus } from '@/features/sync/agenda-runtime';

import { occurrencesInRange } from './domain/recurrence';
import type { CalendarEvent, EventFields, Occurrence } from './domain/types';
import { validateEventFields } from './domain/validation';

/** Ocorrências no intervalo [from, to), lidas da cópia local (instantâneo e offline). */
export function useOccurrences(from: Date, to: Date) {
  const ready = useAgendaStatus((s) => s.ready);
  const fromMs = from.getTime();
  const toMs = to.getTime();
  return useQuery({
    queryKey: [...agendaKeys.entity('events'), 'range', fromMs, toMs],
    enabled: ready,
    staleTime: Infinity,
    queryFn: async (): Promise<Occurrence[]> => {
      const events = await requireAgendaRuntime().local.eventsForRange(new Date(fromMs), new Date(toMs));
      return occurrencesInRange(events, new Date(fromMs), new Date(toMs));
    },
  });
}

export function useEvent(id: string | undefined) {
  const ready = useAgendaStatus((s) => s.ready);
  return useQuery({
    queryKey: [...agendaKeys.entity('events'), 'one', id],
    enabled: ready && !!id,
    staleTime: Infinity,
    queryFn: async () => (await requireAgendaRuntime().local.get('events', id as string)) ?? null,
  });
}

/** Busca local em compromissos (título, descrição, lugar, categoria). */
export function useEventSearch(term: string) {
  const ready = useAgendaStatus((s) => s.ready);
  const trimmed = term.trim();
  return useQuery({
    queryKey: [...agendaKeys.entity('events'), 'search', trimmed],
    enabled: ready && trimmed.length >= 2,
    staleTime: Infinity,
    queryFn: () => requireAgendaRuntime().local.search('events', trimmed),
  });
}

/** Próximas ocorrências (padrão: 60 dias) a partir de agora. */
export function useUpcoming(days = 60) {
  // "Agora" avança a cada minuto, então a lista nunca fica velha.
  const now = useNow();
  const { from, to } = useMemo(() => {
    const start = new Date(now);
    start.setSeconds(0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    return { from: start, to: end };
  }, [now, days]);
  const query = useOccurrences(from, to);
  const upcoming = useMemo(
    () => (query.data ?? []).filter((o) => o.end.getTime() > now.getTime() || o.allDay),
    [query.data, now],
  );
  return { ...query, data: upcoming, now };
}

// ---------------------------------------------------------------- ações

export async function createEvent(fields: EventFields): Promise<CalendarEvent> {
  const valid = validateEventFields(fields);
  return requireAgendaRuntime().events.create(valid);
}

export async function updateEvent(id: string, fields: EventFields): Promise<CalendarEvent> {
  const valid = validateEventFields(fields);
  return requireAgendaRuntime().events.update(id, valid);
}

/** Exclui e mostra "Desfazer" em vez de pedir confirmação. */
export async function deleteEventWithUndo(id: string, message = 'Compromisso excluído'): Promise<void> {
  try {
    const undo = await requireAgendaRuntime().events.remove(id);
    toast.success(message, {
      label: 'Desfazer',
      onPress: () => {
        undo().catch((error) => {
          logger.warn('Undo delete failed', { error });
          toast.error('Não conseguimos desfazer. Tente de novo.');
        });
      },
    });
  } catch (error) {
    toast.error(
      toAppError(error).code === 'not_found'
        ? 'Este compromisso já foi excluído.'
        : 'Não conseguimos excluir. Tente de novo.',
    );
  }
}

/** Remove só uma ocorrência de um compromisso que se repete. */
export async function skipOccurrence(event: CalendarEvent, localDate: string): Promise<void> {
  const exdates = [...new Set([...event.recurrenceExdates, localDate])].sort();
  const undoValue = event.recurrenceExdates;
  await requireAgendaRuntime().events.update(event.id, { recurrenceExdates: exdates });
  toast.success('Só esta ocorrência foi removida', {
    label: 'Desfazer',
    onPress: () => void requireAgendaRuntime().events.update(event.id, { recurrenceExdates: undoValue }),
  });
}
