import { RRule, type Options as RRuleOptions } from 'rrule';

import {
  daysBetweenKeys,
  fromDateKey,
  instantFromWallTime,
  toDateKey,
  wallTimeIn,
  wallTimeToDateKey,
} from './dates';
import type { CalendarEvent, Occurrence } from './types';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurrencePreset = 'none' | Frequency | 'custom';

/** 0 = segunda ... 6 = domingo (convenção do rrule). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type RecurrenceSpec = {
  freq: Frequency;
  interval: number;
  weekdays?: Weekday[];
  /** Último dia (YYYY-MM-DD), inclusivo. */
  until?: string | null;
  count?: number | null;
};

const RRULE_TO_FREQ: Record<number, Frequency> = {
  [RRule.DAILY]: 'daily',
  [RRule.WEEKLY]: 'weekly',
  [RRule.MONTHLY]: 'monthly',
  [RRule.YEARLY]: 'yearly',
};
const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

/** JS (0 = domingo) → rrule (0 = segunda). */
export function weekdayOf(date: Date): Weekday {
  return ((date.getDay() + 6) % 7) as Weekday;
}

export function buildRule(spec: RecurrenceSpec): string {
  const parts = [`FREQ=${spec.freq.toUpperCase()}`];
  if (spec.interval > 1) parts.push(`INTERVAL=${Math.min(Math.floor(spec.interval), 99)}`);
  if (spec.freq === 'weekly' && spec.weekdays?.length) {
    const unique = [...new Set(spec.weekdays)].sort();
    parts.push(`BYDAY=${unique.map((d) => BYDAY[d]).join(',')}`);
  }
  if (spec.until) parts.push(`UNTIL=${spec.until.replaceAll('-', '')}T235959Z`);
  else if (spec.count) parts.push(`COUNT=${Math.min(Math.floor(spec.count), 999)}`);
  return parts.join(';');
}

export function parseRule(rule: string | null | undefined): RecurrenceSpec | null {
  if (!rule) return null;
  try {
    const options = RRule.parseString(rule);
    const freq = options.freq === undefined ? undefined : RRULE_TO_FREQ[options.freq];
    if (!freq) return null;
    const byweekday = options.byweekday
      ? (Array.isArray(options.byweekday) ? options.byweekday : [options.byweekday]).map((d) =>
          typeof d === 'number' ? d : (d as { weekday: number }).weekday,
        )
      : undefined;
    return {
      freq,
      interval: options.interval ?? 1,
      weekdays: byweekday as Weekday[] | undefined,
      until: options.until ? options.until.toISOString().slice(0, 10) : null,
      count: options.count ?? null,
    };
  } catch {
    return null;
  }
}

/** Regra pronta para os atalhos do formulário, com base na data de início. */
export function presetRule(preset: Exclude<RecurrencePreset, 'none' | 'custom'>, start: Date): string {
  if (preset === 'weekly') return buildRule({ freq: 'weekly', interval: 1, weekdays: [weekdayOf(start)] });
  return buildRule({ freq: preset, interval: 1 });
}

/** Identifica se uma regra corresponde a um atalho simples. */
export function presetOf(rule: string | null, start: Date): RecurrencePreset {
  if (!rule) return 'none';
  for (const preset of ['daily', 'weekly', 'monthly', 'yearly'] as const) {
    if (presetRule(preset, start) === rule) return preset;
  }
  return 'custom';
}

// ---------------------------------------------------------------------------
// Descrição em português
// ---------------------------------------------------------------------------
const WEEKDAY_SINGULAR = [
  'Toda segunda',
  'Toda terça',
  'Toda quarta',
  'Toda quinta',
  'Toda sexta',
  'Todo sábado',
  'Todo domingo',
];
const WEEKDAY_PLURAL = ['segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados', 'domingos'];
const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

/** "Toda terça", "Todo dia 10", "Todo ano em 12 de junho", "A cada 2 semanas, às terças e quintas"... */
export function describeRule(rule: string | null, start: Date): string {
  const spec = parseRule(rule);
  if (!spec) return 'Não se repete';
  const n = spec.interval;
  let text: string;

  switch (spec.freq) {
    case 'daily':
      text = n === 1 ? 'Todos os dias' : `A cada ${n} dias`;
      break;
    case 'weekly': {
      const days = (spec.weekdays?.length ? spec.weekdays : [weekdayOf(start)]).slice().sort();
      const isWeekdays = days.length === 5 && days.every((d, i) => d === i);
      if (n === 1 && isWeekdays) text = 'De segunda a sexta';
      else if (n === 1 && days.length === 1) text = WEEKDAY_SINGULAR[days[0] as number] as string;
      else {
        const list = `às ${joinPt(days.map((d) => WEEKDAY_PLURAL[d] as string))}`;
        text = n === 1 ? `Toda semana, ${list}` : `A cada ${n} semanas, ${list}`;
      }
      break;
    }
    case 'monthly':
      text = n === 1 ? `Todo dia ${start.getDate()}` : `A cada ${n} meses, no dia ${start.getDate()}`;
      break;
    case 'yearly':
      text = `${n === 1 ? 'Todo ano' : `A cada ${n} anos`} em ${start.getDate()} de ${MONTHS[start.getMonth()]}`;
      break;
  }

  if (spec.until) {
    const [y, m, d] = spec.until.split('-');
    text += `, até ${d}/${m}/${y}`;
  } else if (spec.count) {
    text += `, ${spec.count} ${spec.count === 1 ? 'vez' : 'vezes'}`;
  }
  return text;
}

// ---------------------------------------------------------------------------
// Expansão de ocorrências
// ---------------------------------------------------------------------------
const MAX_OCCURRENCES_PER_EVENT = 800;
const DAY_MS = 86_400_000;

function overlaps(start: Date, end: Date, from: Date, to: Date): boolean {
  if (start.getTime() >= to.getTime()) return false;
  return end.getTime() > from.getTime() || start.getTime() >= from.getTime();
}

function buildRRule(rule: string, dtstart: Date): RRule | null {
  try {
    const options: Partial<RRuleOptions> = { ...RRule.parseString(rule), dtstart };
    return new RRule(options);
  } catch {
    return null;
  }
}

function single(event: CalendarEvent, start: Date, end: Date, localDate: string): Occurrence {
  return { key: `${event.id}:${localDate}`, event, start, end, allDay: event.allDay, localDate };
}

/**
 * Ocorrências de um compromisso que tocam o intervalo [from, to).
 *  - Com horário: a regra é aplicada na hora "de parede" do fuso do evento
 *    (academia às 7h continua às 7h depois do horário de verão).
 *  - Dia inteiro: datas "flutuantes", sem fuso.
 */
export function expandOccurrences(event: CalendarEvent, from: Date, to: Date): Occurrence[] {
  if (event.deletedAt) return [];

  if (event.allDay) {
    if (!event.startDate || !event.endDate) return [];
    const spanDays = Math.max(0, daysBetweenKeys(event.startDate, event.endDate));
    const make = (dateKey: string) => {
      const start = fromDateKey(dateKey);
      const end = fromDateKey(dateKey);
      end.setDate(end.getDate() + spanDays + 1);
      return single(event, start, end, dateKey);
    };

    const rule = event.recurrenceRule
      ? buildRRule(event.recurrenceRule, floatingFromKey(event.startDate))
      : null;
    if (!rule) {
      const occ = make(event.startDate);
      return overlaps(occ.start, occ.end, from, to) ? [occ] : [];
    }
    const exdates = new Set(event.recurrenceExdates);
    const floatingFrom = new Date(floatingFromKey(toDateKey(from)).getTime() - (spanDays + 1) * DAY_MS);
    const floatingTo = new Date(floatingFromKey(toDateKey(to)).getTime() + DAY_MS);
    return rule
      .between(floatingFrom, floatingTo, true)
      .slice(0, MAX_OCCURRENCES_PER_EVENT)
      .map((d) => d.toISOString().slice(0, 10))
      .filter((key) => !exdates.has(key))
      .map(make)
      .filter((occ) => overlaps(occ.start, occ.end, from, to));
  }

  if (!event.startsAt || !event.endsAt) return [];
  const firstStart = new Date(event.startsAt);
  const durationMs = Math.max(0, new Date(event.endsAt).getTime() - firstStart.getTime());
  const tz = event.timezone;

  const rule = event.recurrenceRule
    ? buildRRule(event.recurrenceRule, floatingFromWall(wallTimeIn(firstStart, tz)))
    : null;
  if (!rule) {
    const occ = single(
      event,
      firstStart,
      new Date(firstStart.getTime() + durationMs),
      wallTimeToDateKey(wallTimeIn(firstStart, tz)),
    );
    return overlaps(occ.start, occ.end, from, to) ? [occ] : [];
  }

  const exdates = new Set(event.recurrenceExdates);
  // Margem de 2 dias cobre qualquer diferença de fuso entre "flutuante" e real.
  const floatingFrom = new Date(from.getTime() - durationMs - 2 * DAY_MS);
  const floatingTo = new Date(to.getTime() + 2 * DAY_MS);

  return rule
    .between(floatingFrom, floatingTo, true)
    .slice(0, MAX_OCCURRENCES_PER_EVENT)
    .map((floating) => {
      const wall = {
        year: floating.getUTCFullYear(),
        month: floating.getUTCMonth(),
        day: floating.getUTCDate(),
        hour: floating.getUTCHours(),
        minute: floating.getUTCMinutes(),
      };
      const start = instantFromWallTime(wall, tz);
      return single(event, start, new Date(start.getTime() + durationMs), wallTimeToDateKey(wall));
    })
    .filter((occ) => !exdates.has(occ.localDate) && overlaps(occ.start, occ.end, from, to));
}

function floatingFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function floatingFromWall(wall: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): Date {
  return new Date(Date.UTC(wall.year, wall.month, wall.day, wall.hour, wall.minute));
}

/** Todas as ocorrências de vários eventos, ordenadas (dia inteiro primeiro em cada dia). */
export function occurrencesInRange(events: readonly CalendarEvent[], from: Date, to: Date): Occurrence[] {
  return events
    .flatMap((event) => expandOccurrences(event, from, to))
    .sort((a, b) => {
      const byStart = a.start.getTime() - b.start.getTime();
      if (byStart !== 0) return byStart;
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return a.event.title.localeCompare(b.event.title, 'pt-BR');
    });
}
