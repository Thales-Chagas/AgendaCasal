import { deviceTimeZone, fromDateKey, toDateKey } from './dates';
import { presetOf, presetRule, type RecurrencePreset } from './recurrence';
import { responsibilityFor } from './presentation';
import type { CalendarEvent, Category, EventFields, Priority, Responsibility } from './types';

/** Estado do formulário (como a pessoa pensa), separado do formato salvo. */
export type EventFormState = {
  title: string;
  allDay: boolean;
  start: Date;
  end: Date;
  scope: Responsibility;
  category: Category;
  location: string;
  description: string;
  repeat: RecurrencePreset;
  /** Regra personalizada (quando `repeat === 'custom'`). */
  customRule: string | null;
  reminders: number[];
  priority: Priority;
  showCountdown: boolean;
};

export const DEFAULT_REMINDERS = [60];

/** Próxima hora cheia (ex.: 14:20 → 15:00). */
export function nextFullHour(now = new Date()): Date {
  const date = new Date(now);
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date;
}

/** Estado inicial de um compromisso novo (opcionalmente num dia escolhido). */
export function newEventForm(dayKey?: string, now = new Date()): EventFormState {
  let start = nextFullHour(now);
  if (dayKey && dayKey !== toDateKey(now)) {
    start = fromDateKey(dayKey);
    start.setHours(9, 0, 0, 0);
  }
  return {
    title: '',
    allDay: false,
    start,
    end: new Date(start.getTime() + 60 * 60_000),
    scope: 'ours',
    category: 'couple',
    location: '',
    description: '',
    repeat: 'none',
    customRule: null,
    reminders: DEFAULT_REMINDERS,
    priority: 'normal',
    showCountdown: false,
  };
}

/** Converte o formulário no formato salvo (instantes UTC ou datas "flutuantes"). */
export function formToFields(
  state: EventFormState,
  people: { viewerId: string; partnerId: string | null },
  timezone = deviceTimeZone(),
): EventFields {
  const responsibleUserId =
    state.scope === 'mine' ? people.viewerId : state.scope === 'partner' ? people.partnerId : null;
  const recurrenceRule =
    state.repeat === 'none'
      ? null
      : state.repeat === 'custom'
        ? state.customRule
        : presetRule(state.repeat, state.start);

  return {
    title: state.title,
    description: state.description,
    location: state.location,
    allDay: state.allDay,
    startsAt: state.allDay ? null : state.start.toISOString(),
    endsAt: state.allDay ? null : state.end.toISOString(),
    startDate: state.allDay ? toDateKey(state.start) : null,
    endDate: state.allDay ? toDateKey(state.end < state.start ? state.start : state.end) : null,
    timezone,
    category: state.category,
    priority: state.priority,
    ownerScope: state.scope === 'ours' || !responsibleUserId ? 'couple' : 'person',
    responsibleUserId: state.scope === 'ours' ? null : responsibleUserId,
    recurrenceRule,
    recurrenceExdates: [],
    reminderMinutes: state.reminders,
    showCountdown: state.showCountdown,
  };
}

/** Preenche o formulário a partir de um compromisso existente (edita a série inteira). */
export function eventToForm(event: CalendarEvent, viewerId: string): EventFormState {
  const start = event.allDay ? fromDateKey(event.startDate as string) : new Date(event.startsAt as string);
  const end = event.allDay ? fromDateKey(event.endDate as string) : new Date(event.endsAt as string);
  if (event.allDay) {
    start.setHours(9, 0, 0, 0);
    end.setHours(10, 0, 0, 0);
  }
  const repeat = presetOf(event.recurrenceRule, start);
  return {
    title: event.title,
    allDay: event.allDay,
    start,
    end,
    scope: responsibilityFor(event, viewerId),
    category: event.category,
    location: event.location ?? '',
    description: event.description ?? '',
    repeat,
    customRule: repeat === 'custom' ? event.recurrenceRule : null,
    reminders: event.reminderMinutes,
    priority: event.priority,
    showCountdown: event.showCountdown,
  };
}

/** Mantém a duração ao mudar o início; garante fim ≥ início. */
export function withStart(state: EventFormState, start: Date): EventFormState {
  const duration = Math.max(0, state.end.getTime() - state.start.getTime());
  return { ...state, start, end: new Date(start.getTime() + duration) };
}

export function withEnd(state: EventFormState, end: Date): EventFormState {
  if (end.getTime() < state.start.getTime()) {
    // Fim antes do início no mesmo dia → provavelmente passa da meia-noite.
    const nextDay = new Date(end);
    nextDay.setDate(nextDay.getDate() + 1);
    return { ...state, end: state.allDay ? state.start : nextDay };
  }
  return { ...state, end };
}
