import { TZDate } from '@date-fns/tz';

/** Fuso do aparelho (IANA). */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Data local do aparelho em YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "2026-06-12" → meia-noite local do aparelho. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function addDaysToKey(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function daysBetweenKeys(from: string, to: string): number {
  const a = fromDateKey(from);
  const b = fromDateKey(to);
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86_400_000,
  );
}

export type WallTime = { year: number; month: number; day: number; hour: number; minute: number };

/** Hora "de parede" de um instante em um fuso específico. */
export function wallTimeIn(instant: Date, timeZone: string): WallTime {
  const z = new TZDate(instant.getTime(), timeZone);
  return {
    year: z.getFullYear(),
    month: z.getMonth(),
    day: z.getDate(),
    hour: z.getHours(),
    minute: z.getMinutes(),
  };
}

/** Instante correspondente a uma hora de parede em um fuso (trata horário de verão). */
export function instantFromWallTime(wall: WallTime, timeZone: string): Date {
  return new Date(new TZDate(wall.year, wall.month, wall.day, wall.hour, wall.minute, timeZone).getTime());
}

export function wallTimeToDateKey(wall: WallTime): string {
  return `${wall.year}-${pad(wall.month + 1)}-${pad(wall.day)}`;
}
