import { differenceInCalendarDays, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { CalendarEvent, Category, Occurrence, Priority, Responsibility } from './types';

export function responsibilityFor(
  event: Pick<CalendarEvent, 'ownerScope' | 'responsibleUserId'>,
  viewerId: string,
): Responsibility {
  if (event.ownerScope === 'couple' || !event.responsibleUserId) return 'ours';
  return event.responsibleUserId === viewerId ? 'mine' : 'partner';
}

export const responsibilityLabels: Record<Responsibility, { short: string; long: string; emoji: string }> = {
  mine: { short: 'Meu', long: 'Meu compromisso', emoji: '👤' },
  partner: { short: 'Do parceiro', long: 'Compromisso do parceiro', emoji: '👤' },
  ours: { short: 'Nosso', long: 'Nosso compromisso', emoji: '❤️' },
};

/** Rótulo com o nome do parceiro quando disponível ("Da Ana"). */
export function responsibilityText(responsibility: Responsibility, partnerName?: string | null): string {
  if (responsibility === 'partner' && partnerName) return `De ${partnerName}`;
  return responsibilityLabels[responsibility].short;
}

export const categoryMeta: Record<Category, { label: string; emoji: string }> = {
  couple: { label: 'Casal', emoji: '❤️' },
  work: { label: 'Trabalho', emoji: '💼' },
  health: { label: 'Saúde', emoji: '🏥' },
  finance: { label: 'Financeiro', emoji: '💰' },
  travel: { label: 'Viagem', emoji: '✈️' },
  event: { label: 'Evento', emoji: '🎉' },
  home: { label: 'Casa', emoji: '🏠' },
  other: { label: 'Outro', emoji: '📌' },
};

export const priorityLabels: Record<Priority, string> = { low: 'Baixa', normal: 'Normal', high: 'Alta' };

const time = (date: Date) => format(date, 'HH:mm');

/** "20:00 – 21:30", "Dia inteiro", "Até 10:00" (continuação de outro dia)... */
export function formatOccurrenceTime(occ: Occurrence, day?: Date): string {
  if (occ.allDay) return 'Dia inteiro';
  const sameStartDay = !day || isSameDay(occ.start, day);
  const sameEndDay = !day || isSameDay(occ.end, day) || occ.end.getTime() === occ.start.getTime();
  if (!sameStartDay && !sameEndDay) return 'Dia inteiro';
  if (!sameStartDay) return `Até ${time(occ.end)}`;
  if (occ.end.getTime() === occ.start.getTime()) return time(occ.start);
  if (!isSameDay(occ.start, occ.end))
    return `${time(occ.start)} – ${format(occ.end, "d MMM', 'HH:mm", { locale: ptBR })}`;
  return `${time(occ.start)} – ${time(occ.end)}`;
}

/** "Hoje", "Amanhã", "Ontem" ou "sábado, 4 de out." */
export function relativeDayLabel(date: Date, now: Date = new Date()): string {
  const diff = differenceInCalendarDays(date, now);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  const sameYear = date.getFullYear() === now.getFullYear();
  return format(date, sameYear ? "EEEE, d 'de' MMM" : "d 'de' MMM 'de' yyyy", { locale: ptBR });
}

/** "Hoje, 29 de setembro". */
export function longDateLabel(date: Date): string {
  const text = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Faltam 12 dias", "É amanhã!", "É hoje!" */
export function countdownLabel(target: Date, now: Date = new Date()): string {
  const days = differenceInCalendarDays(target, now);
  if (days <= 0) return 'É hoje!';
  if (days === 1) return 'É amanhã!';
  return `Faltam ${days} dias`;
}

/** Saudação conforme a hora do dia. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return 'Boa noite';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const REMINDER_OPTIONS = [
  { minutes: 0, label: 'Na hora' },
  { minutes: 10, label: '10 minutos antes' },
  { minutes: 30, label: '30 minutos antes' },
  { minutes: 60, label: '1 hora antes' },
  { minutes: 120, label: '2 horas antes' },
  { minutes: 1440, label: '1 dia antes' },
  { minutes: 2880, label: '2 dias antes' },
  { minutes: 10080, label: '1 semana antes' },
] as const;

export function reminderLabel(minutes: number): string {
  return REMINDER_OPTIONS.find((o) => o.minutes === minutes)?.label ?? `${minutes} minutos antes`;
}
