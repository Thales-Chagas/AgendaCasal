import type { SqlValue } from '@/core/storage/sql';
import { categoryMeta } from '@/features/events/domain/presentation';
import { EDITABLE_EVENT_FIELDS, type CalendarEvent } from '@/features/events/domain/types';
import { EDITABLE_SPECIAL_DATE_FIELDS, type SpecialDate } from '@/features/special-dates/domain/types';

/** Linha como vem do Supabase (snake_case). */
export type ServerRow = Record<string, unknown> & {
  id: string;
  couple_id: string;
  version: number;
  updated_at: string;
};

export type EntityName = 'events' | 'special_dates';

export type SyncedEntity = {
  id: string;
  coupleId: string;
  version: number;
  updatedAt: string;
  deletedAt: string | null;
};

export type EntityConfig<T extends SyncedEntity> = {
  name: EntityName;
  editableFields: readonly (keyof T & string)[];
  fromServer: (row: ServerRow) => T;
  /** Campos camelCase → colunas snake_case do servidor. */
  toServer: (fields: Partial<T>) => Record<string, unknown>;
  /** Colunas extras indexadas na cópia local (consultas por período e busca). */
  localColumns: (entity: T) => Record<string, SqlValue>;
};

const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camel = (key: string) => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function mapKeys<T>(row: Record<string, unknown>, fn: (k: string) => string): T {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [fn(k), v])) as T;
}

/** Texto normalizado para busca sem acento e sem diferenciar maiúsculas. */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const SERVER_ONLY = new Set(['version', 'created_by', 'updated_by', 'created_at', 'updated_at']);

function toServerColumns(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    const column = snake(key);
    if (!SERVER_ONLY.has(column)) out[column] = value;
  }
  return out;
}

export const eventEntity: EntityConfig<CalendarEvent> = {
  name: 'events',
  editableFields: EDITABLE_EVENT_FIELDS,
  fromServer: (row) => {
    const event = mapKeys<CalendarEvent>(row, camel);
    return {
      ...event,
      recurrenceExdates: (event.recurrenceExdates ?? []) as string[],
      reminderMinutes: (event.reminderMinutes ?? []) as number[],
    };
  },
  toServer: (fields) => toServerColumns(fields as Record<string, unknown>),
  localColumns: (e) => ({
    all_day: e.allDay ? 1 : 0,
    starts_ms: e.startsAt ? new Date(e.startsAt).getTime() : null,
    ends_ms: e.endsAt ? new Date(e.endsAt).getTime() : null,
    start_date: e.startDate,
    end_date: e.endDate,
    recurring: e.recurrenceRule ? 1 : 0,
    search: normalizeSearch(
      [e.title, e.description, e.location, categoryMeta[e.category]?.label].filter(Boolean).join(' '),
    ),
  }),
};

export const specialDateEntity: EntityConfig<SpecialDate> = {
  name: 'special_dates',
  editableFields: EDITABLE_SPECIAL_DATE_FIELDS,
  fromServer: (row) => {
    const value = mapKeys<SpecialDate>(row, camel);
    return { ...value, reminderDays: (value.reminderDays ?? []) as number[] };
  },
  toServer: (fields) => toServerColumns(fields as Record<string, unknown>),
  localColumns: (s) => ({ date: s.date, search: normalizeSearch(s.title) }),
};

export const entityConfigs = { events: eventEntity, special_dates: specialDateEntity } as const;
