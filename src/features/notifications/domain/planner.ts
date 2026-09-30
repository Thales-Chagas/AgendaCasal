import { differenceInCalendarDays, format } from 'date-fns';

import { expandOccurrences } from '@/features/events/domain/recurrence';
import { categoryMeta, responsibilityFor } from '@/features/events/domain/presentation';
import type { CalendarEvent } from '@/features/events/domain/types';
import { formatCents } from '@/features/finance/domain/presentation';
import { dueDatesBetween } from '@/features/finance/domain/schedule';
import type { Bill } from '@/features/finance/domain/types';
import { toDateKey } from '@/features/events/domain/dates';
import { kindMeta, nextOccurrence } from '@/features/special-dates/domain/presentation';
import type { SpecialDate } from '@/features/special-dates/domain/types';

export type ReminderSettings = {
  eventReminders: boolean;
  partnerEventReminders: boolean;
  specialDateReminders: boolean;
  billReminders: boolean;
};

export type PlannedReminder = {
  /** Estável entre reagendamentos (evita duplicar). */
  id: string;
  fireAt: Date;
  title: string;
  body: string;
  href: string;
};

/** O iOS permite 64 notificações agendadas; deixamos folga. */
export const MAX_SCHEDULED = 60;
const ALL_DAY_REMINDER_HOUR = 9;
const DAY = 86_400_000;

function when(start: Date, now: Date, allDay: boolean): string {
  const days = differenceInCalendarDays(start, now);
  const time = format(start, 'H:mm').replace(':00', 'h');
  if (allDay) return days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`;
  if (days === 0) return `hoje às ${time}`;
  if (days === 1) return `amanhã às ${time}`;
  return `em ${days} dias`;
}

/**
 * Lembretes a agendar neste aparelho. Regras:
 *  - "Meu" e "Nosso" sempre (se lembretes estiverem ativos);
 *  - "Do parceiro" só se a pessoa pedir;
 *  - dia inteiro considera 9h da manhã;
 *  - nunca no passado; no máximo MAX_SCHEDULED, os mais próximos primeiro.
 */
export function planReminders(input: {
  events: readonly CalendarEvent[];
  specialDates: readonly SpecialDate[];
  bills?: readonly Bill[];
  viewerId: string;
  settings: ReminderSettings;
  now?: Date;
  horizonDays?: number;
}): PlannedReminder[] {
  const now = input.now ?? new Date();
  const horizon = new Date(now.getTime() + (input.horizonDays ?? 30) * DAY);
  const planned: PlannedReminder[] = [];

  if (input.settings.eventReminders) {
    for (const event of input.events) {
      if (!event.reminderMinutes.length || event.deletedAt) continue;
      const responsibility = responsibilityFor(event, input.viewerId);
      if (responsibility === 'partner' && !input.settings.partnerEventReminders) continue;

      // Busca ocorrências até uma semana além do horizonte (lembretes "1 semana antes").
      const maxLead = Math.max(...event.reminderMinutes) * 60_000;
      for (const occ of expandOccurrences(event, now, new Date(horizon.getTime() + maxLead))) {
        const base = new Date(occ.start);
        if (occ.allDay) base.setHours(ALL_DAY_REMINDER_HOUR, 0, 0, 0);
        for (const minutes of event.reminderMinutes) {
          const fireAt = new Date(base.getTime() - minutes * 60_000);
          if (fireAt <= now || fireAt > horizon) continue;
          const whose =
            responsibility === 'ours'
              ? 'Nosso compromisso ❤️'
              : responsibility === 'mine'
                ? 'Seu compromisso'
                : 'Compromisso do parceiro';
          planned.push({
            id: `event:${occ.key}:${minutes}`,
            fireAt,
            title: `${categoryMeta[event.category].emoji} ${event.title} ${when(occ.start, fireAt, occ.allDay)}`,
            body: [whose, event.location].filter(Boolean).join(' · '),
            href: `/event/${event.id}?date=${occ.localDate}`,
          });
        }
      }
    }
  }

  if (input.settings.specialDateReminders) {
    for (const item of input.specialDates) {
      if (item.deletedAt) continue;
      const occurrence = nextOccurrence(item, now);
      if (!occurrence) continue;
      for (const days of item.reminderDays) {
        const fireAt = new Date(occurrence);
        fireAt.setDate(fireAt.getDate() - days);
        fireAt.setHours(ALL_DAY_REMINDER_HOUR, 0, 0, 0);
        if (fireAt <= now || fireAt > horizon) continue;
        const emoji = kindMeta[item.kind].emoji;
        planned.push({
          id: `special:${item.id}:${occurrence.getFullYear()}:${days}`,
          fireAt,
          title:
            days === 0
              ? `Hoje é ${item.title} ${emoji}`
              : days === 1
                ? `Amanhã: ${item.title} ${emoji}`
                : `Faltam ${days} dias: ${item.title} ${emoji}`,
          body: 'Uma data especial para vocês dois.',
          href: `/special-date/${item.id}`,
        });
      }
    }
  }

  if (input.settings.billReminders) {
    for (const bill of input.bills ?? []) {
      if (bill.deletedAt || !bill.reminderDays.length) continue;
      const maxLead = Math.max(...bill.reminderDays) * DAY;
      for (const due of dueDatesBetween(bill, now, new Date(horizon.getTime() + maxLead))) {
        const dueKey = toDateKey(due);
        if (bill.paidPeriods.includes(dueKey)) continue; // já paga: não incomoda
        for (const days of bill.reminderDays) {
          const fireAt = new Date(due);
          fireAt.setDate(fireAt.getDate() - days);
          fireAt.setHours(ALL_DAY_REMINDER_HOUR, 0, 0, 0);
          if (fireAt <= now || fireAt > horizon) continue;
          const amount = bill.amountCents !== null ? ` · ${formatCents(bill.amountCents)}` : '';
          planned.push({
            id: `bill:${bill.id}:${dueKey}:${days}`,
            fireAt,
            title:
              days === 0
                ? `Vence hoje: ${bill.title} 💸`
                : days === 1
                  ? `Vence amanhã: ${bill.title} 💸`
                  : `${bill.title} vence em ${days} dias 💸`,
            body: `${bill.ownerScope === 'couple' ? 'Conta do casal' : 'Conta pessoal'}${amount}`,
            href: `/bill/${bill.id}`,
          });
        }
      }
    }
  }

  return planned.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, MAX_SCHEDULED);
}
