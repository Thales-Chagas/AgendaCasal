export const CATEGORIES = [
  'couple',
  'work',
  'health',
  'finance',
  'travel',
  'event',
  'home',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ['low', 'normal', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export type OwnerScope = 'person' | 'couple';

/** Rótulo relativo a quem está vendo: "Meu", "Do parceiro" ou "Nosso". */
export type Responsibility = 'mine' | 'partner' | 'ours';

/** Compromisso como guardado no banco (servidor e cópia local). */
export type CalendarEvent = {
  id: string;
  coupleId: string;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  /** ISO 8601 (UTC). Preenchidos quando `allDay` é falso. */
  startsAt: string | null;
  endsAt: string | null;
  /** YYYY-MM-DD. Preenchidos quando `allDay` é verdadeiro. */
  startDate: string | null;
  endDate: string | null;
  /** Fuso IANA em que o compromisso foi criado (base da recorrência). */
  timezone: string;
  category: Category;
  priority: Priority;
  ownerScope: OwnerScope;
  responsibleUserId: string | null;
  /** RRULE (RFC 5545) sem DTSTART, ex.: "FREQ=WEEKLY;BYDAY=TU". */
  recurrenceRule: string | null;
  /** Ocorrências removidas (datas locais YYYY-MM-DD). */
  recurrenceExdates: string[];
  reminderMinutes: number[];
  showCountdown: boolean;
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/** Campos que o usuário pode editar. */
export type EventFields = Pick<
  CalendarEvent,
  | 'title'
  | 'description'
  | 'location'
  | 'allDay'
  | 'startsAt'
  | 'endsAt'
  | 'startDate'
  | 'endDate'
  | 'timezone'
  | 'category'
  | 'priority'
  | 'ownerScope'
  | 'responsibleUserId'
  | 'recurrenceRule'
  | 'recurrenceExdates'
  | 'reminderMinutes'
  | 'showCountdown'
>;

export const EDITABLE_EVENT_FIELDS: readonly (keyof EventFields)[] = [
  'title',
  'description',
  'location',
  'allDay',
  'startsAt',
  'endsAt',
  'startDate',
  'endDate',
  'timezone',
  'category',
  'priority',
  'ownerScope',
  'responsibleUserId',
  'recurrenceRule',
  'recurrenceExdates',
  'reminderMinutes',
  'showCountdown',
];

/** Uma ocorrência concreta (eventos recorrentes geram várias). */
export type Occurrence = {
  /** Estável: `${event.id}:${data local}`. */
  key: string;
  event: CalendarEvent;
  start: Date;
  end: Date;
  allDay: boolean;
  /** Data local da ocorrência (YYYY-MM-DD), usada para exceções. */
  localDate: string;
};
