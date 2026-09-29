import type { EventFields } from '@/features/events/domain/types';

/** Campos mínimos de um compromisso para testes. */
export function eventFields(overrides: Partial<EventFields> = {}): EventFields {
  const start = new Date(Date.now() + 86_400_000);
  start.setMinutes(0, 0, 0);
  return {
    title: 'Jantar',
    description: null,
    location: null,
    allDay: false,
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + 3_600_000).toISOString(),
    startDate: null,
    endDate: null,
    timezone: 'America/Sao_Paulo',
    category: 'couple',
    priority: 'normal',
    ownerScope: 'couple',
    responsibleUserId: null,
    recurrenceRule: null,
    recurrenceExdates: [],
    reminderMinutes: [],
    showCountdown: false,
    ...overrides,
  };
}
