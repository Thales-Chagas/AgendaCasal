import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { toast } from '@/design-system';
import { agendaKeys, requireAgendaRuntime, useAgendaStatus } from '@/features/sync/agenda-runtime';

import { upcomingSpecialDates } from './domain/presentation';
import { REMINDER_DAY_OPTIONS, SPECIAL_DATE_KINDS, type SpecialDateFields } from './domain/types';

export function useSpecialDates() {
  const ready = useAgendaStatus((s) => s.ready);
  return useQuery({
    queryKey: [...agendaKeys.entity('special_dates'), 'upcoming'],
    enabled: ready,
    staleTime: 60_000,
    queryFn: async () => upcomingSpecialDates(await requireAgendaRuntime().local.allActive('special_dates')),
  });
}

export function useSpecialDate(id: string | undefined) {
  const ready = useAgendaStatus((s) => s.ready);
  return useQuery({
    queryKey: [...agendaKeys.entity('special_dates'), 'one', id],
    enabled: ready && !!id,
    queryFn: async () => (await requireAgendaRuntime().local.get('special_dates', id as string)) ?? null,
  });
}

export const specialDateSchema = z.object({
  title: z.string().trim().min(1, 'Dê um nome para a data.').max(80, 'Use no máximo 80 caracteres.'),
  kind: z.enum(SPECIAL_DATE_KINDS),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  repeatsYearly: z.boolean(),
  reminderDays: z.array(z.number().refine((n) => (REMINDER_DAY_OPTIONS as readonly number[]).includes(n))),
});

export async function saveSpecialDate(id: string | null, fields: SpecialDateFields) {
  const valid = specialDateSchema.parse(fields) as SpecialDateFields;
  const runtime = requireAgendaRuntime();
  return id ? runtime.specialDates.update(id, valid) : runtime.specialDates.create(valid);
}

export async function deleteSpecialDateWithUndo(id: string) {
  const undo = await requireAgendaRuntime().specialDates.remove(id);
  toast.success('Data excluída', { label: 'Desfazer', onPress: () => void undo() });
}
