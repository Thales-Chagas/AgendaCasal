import { z } from 'zod';

import { parseRule } from './recurrence';
import { CATEGORIES, PRIORITIES, type EventFields } from './types';

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');
const isoInstant = z.iso.datetime({ offset: true });

/**
 * Regras de um compromisso. Espelham as constraints do banco: um compromisso criado
 * sem internet nunca será recusado depois pelo servidor.
 */
export const eventFieldsSchema = z
  .object({
    title: z.string().trim().min(1, 'Dê um nome ao compromisso.').max(120, 'Use no máximo 120 caracteres.'),
    description: z.string().trim().max(2000, 'Use no máximo 2000 caracteres.').nullable(),
    location: z.string().trim().max(200, 'Use no máximo 200 caracteres.').nullable(),
    allDay: z.boolean(),
    startsAt: isoInstant.nullable(),
    endsAt: isoInstant.nullable(),
    startDate: dateKey.nullable(),
    endDate: dateKey.nullable(),
    timezone: z.string().min(1).max(64),
    category: z.enum(CATEGORIES),
    priority: z.enum(PRIORITIES),
    ownerScope: z.enum(['person', 'couple']),
    responsibleUserId: z.uuid().nullable(),
    recurrenceRule: z
      .string()
      .max(500)
      .refine((rule) => parseRule(rule) !== null, 'Repetição inválida.')
      .nullable(),
    recurrenceExdates: z.array(dateKey).max(500),
    reminderMinutes: z.array(z.number().int().min(0).max(40320)).max(5, 'Escolha no máximo 5 lembretes.'),
    showCountdown: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.allDay) {
      if (!v.startDate || !v.endDate)
        ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Escolha a data.' });
      else if (v.endDate < v.startDate)
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'O fim precisa ser depois do início.' });
      if (v.startsAt || v.endsAt)
        ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'Dia inteiro não tem horário.' });
    } else {
      if (!v.startsAt || !v.endsAt)
        ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'Escolha o horário.' });
      else if (Date.parse(v.endsAt) < Date.parse(v.startsAt))
        ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'O fim precisa ser depois do início.' });
      else if (Date.parse(v.endsAt) - Date.parse(v.startsAt) > 366 * 86_400_000)
        ctx.addIssue({
          code: 'custom',
          path: ['endsAt'],
          message: 'O compromisso pode durar no máximo um ano.',
        });
      if (v.startDate || v.endDate)
        ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Formato de data inválido.' });
    }
    if (v.ownerScope === 'person' && !v.responsibleUserId)
      ctx.addIssue({
        code: 'custom',
        path: ['responsibleUserId'],
        message: 'Escolha de quem é o compromisso.',
      });
    if (v.ownerScope === 'couple' && v.responsibleUserId)
      ctx.addIssue({
        code: 'custom',
        path: ['responsibleUserId'],
        message: 'Compromisso "Nosso" não tem responsável.',
      });
  });

/** Normaliza textos vazios para null e valida. Lança `ZodError` quando inválido. */
export function validateEventFields(fields: EventFields): EventFields {
  const blankToNull = (s: string | null) => (s && s.trim() ? s.trim() : null);
  return eventFieldsSchema.parse({
    ...fields,
    title: fields.title.trim(),
    description: blankToNull(fields.description),
    location: blankToNull(fields.location),
    reminderMinutes: [...new Set(fields.reminderMinutes)].sort((a, b) => a - b),
  }) as EventFields;
}
