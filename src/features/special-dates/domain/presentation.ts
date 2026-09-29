import { differenceInCalendarDays } from 'date-fns';

import { fromDateKey, toDateKey } from '@/features/events/domain/dates';

import type { SpecialDate, SpecialDateKind } from './types';

export const kindMeta: Record<SpecialDateKind, { label: string; emoji: string }> = {
  birthday: { label: 'Aniversário', emoji: '🎂' },
  dating_anniversary: { label: 'Aniversário de namoro', emoji: '💕' },
  wedding_anniversary: { label: 'Aniversário de casamento', emoji: '💍' },
  first_trip: { label: 'Primeira viagem', emoji: '✈️' },
  important: { label: 'Data importante', emoji: '⭐' },
  custom: { label: 'Outra data', emoji: '📅' },
};

export const reminderDayLabels: Record<number, string> = {
  0: 'No dia',
  1: '1 dia antes',
  3: '3 dias antes',
  7: '7 dias antes',
};

function dateInYear(key: string, year: number): Date {
  const original = fromDateKey(key);
  const date = new Date(year, original.getMonth(), original.getDate());
  // 29/02 em ano não bissexto → 28/02.
  if (date.getMonth() !== original.getMonth()) return new Date(year, original.getMonth() + 1, 0);
  return date;
}

/** Próxima vez que a data acontece (hoje conta). `null` se já passou e não se repete. */
export function nextOccurrence(
  item: Pick<SpecialDate, 'date' | 'repeatsYearly'>,
  today = new Date(),
): Date | null {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!item.repeatsYearly) {
    const date = fromDateKey(item.date);
    return date >= start ? date : null;
  }
  const thisYear = dateInYear(item.date, start.getFullYear());
  return thisYear >= start ? thisYear : dateInYear(item.date, start.getFullYear() + 1);
}

/** Quantos anos completa na próxima ocorrência (ex.: "3 anos de namoro"). */
export function yearsAt(item: Pick<SpecialDate, 'date'>, occurrence: Date): number {
  return occurrence.getFullYear() - fromDateKey(item.date).getFullYear();
}

/** "Faltam 12 dias", "É amanhã!", "É hoje! 🎉" */
export function daysUntilLabel(occurrence: Date, today = new Date()): string {
  const days = differenceInCalendarDays(occurrence, today);
  if (days <= 0) return 'É hoje! 🎉';
  if (days === 1) return 'É amanhã!';
  return `Faltam ${days} dias`;
}

/** Subtítulo amigável: "3 anos · 12 de junho" ou só a data. */
export function specialDateSubtitle(item: SpecialDate, occurrence: Date): string {
  const years = yearsAt(item, occurrence);
  const date = occurrence.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  if (!item.repeatsYearly || years <= 0) return date;
  const noun =
    item.kind === 'birthday' ? (years === 1 ? 'ano' : 'anos') : years === 1 ? 'ano juntos' : 'anos juntos';
  return item.kind === 'dating_anniversary' || item.kind === 'wedding_anniversary' || item.kind === 'birthday'
    ? `${years} ${noun} · ${date}`
    : date;
}

export type UpcomingSpecialDate = { item: SpecialDate; occurrence: Date; key: string };

export function upcomingSpecialDates(
  items: readonly SpecialDate[],
  today = new Date(),
): UpcomingSpecialDate[] {
  return items
    .filter((i) => !i.deletedAt)
    .map((item) => ({ item, occurrence: nextOccurrence(item, today) }))
    .filter((x): x is { item: SpecialDate; occurrence: Date } => x.occurrence !== null)
    .map((x) => ({ ...x, key: `${x.item.id}:${toDateKey(x.occurrence)}` }))
    .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime());
}
