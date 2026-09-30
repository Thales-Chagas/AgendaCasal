import { addDays, differenceInCalendarDays, getDaysInMonth, startOfDay, startOfMonth } from 'date-fns';

import { fromDateKey, toDateKey } from '@/features/events/domain/dates';

import { MAX_PAID_PERIODS, type Bill } from './types';

type Schedulable = Pick<Bill, 'firstDueDate' | 'frequency'>;

/** Vencimento no mês pedido, respeitando o dia original (dia 31 vira o último dia do mês). */
function dueInMonth(first: Date, year: number, month: number): Date {
  const day = Math.min(first.getDate(), getDaysInMonth(new Date(year, month, 1)));
  return new Date(year, month, day);
}

/** k-ésimo vencimento (0 = o primeiro). */
function nthDue(first: Date, stepMonths: number, k: number): Date {
  const total = first.getMonth() + k * stepMonths;
  return dueInMonth(first, first.getFullYear() + Math.floor(total / 12), ((total % 12) + 12) % 12);
}

/** Vencimentos entre `from` e `to` (inclusive, por dia), nunca antes do primeiro. */
export function dueDatesBetween(bill: Schedulable, from: Date, to: Date): Date[] {
  const first = fromDateKey(bill.firstDueDate);
  const step = bill.frequency === 'yearly' ? 12 : 1;
  const start = startOfDay(from);
  const end = startOfDay(to);
  const monthsFromFirst =
    (start.getFullYear() - first.getFullYear()) * 12 + start.getMonth() - first.getMonth();
  const out: Date[] = [];
  for (let k = Math.max(0, Math.floor(monthsFromFirst / step) - 1); out.length < 500; k++) {
    const due = nthDue(first, step, k);
    if (due > end) break;
    if (due >= start) out.push(due);
  }
  return out;
}

export type DueStatus = 'paid' | 'overdue' | 'today' | 'soon' | 'upcoming';

/** Quantos dias antes do vencimento a conta passa a aparecer como "vence logo". */
export const SOON_DAYS = 3;

export function dueStatus(due: Date, paid: boolean, today: Date = new Date()): DueStatus {
  if (paid) return 'paid';
  const days = differenceInCalendarDays(due, today);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= SOON_DAYS) return 'soon';
  return 'upcoming';
}

export type BillDue = {
  bill: Bill;
  due: Date;
  /** YYYY-MM-DD do vencimento (chave em `paidPeriods`). */
  dueKey: string;
  paid: boolean;
  status: DueStatus;
};

function toDue(bill: Bill, due: Date, today: Date): BillDue {
  const dueKey = toDateKey(due);
  const paid = bill.paidPeriods.includes(dueKey);
  return { bill, due, dueKey, paid, status: dueStatus(due, paid, today) };
}

/** Todas as contas que vencem no mês (ordenadas por dia). */
export function monthDues(bills: readonly Bill[], month: Date, today: Date = new Date()): BillDue[] {
  const from = startOfMonth(month);
  const to = new Date(from.getFullYear(), from.getMonth() + 1, 0);
  return bills
    .filter((b) => !b.deletedAt)
    .flatMap((bill) => dueDatesBetween(bill, from, to).map((due) => toDue(bill, due, today)))
    .sort((a, b) => a.due.getTime() - b.due.getTime() || a.bill.title.localeCompare(b.bill.title));
}

/** Contas atrasadas de meses anteriores (até `lookbackDays` atrás). */
export function previousMonthsOverdue(
  bills: readonly Bill[],
  today: Date = new Date(),
  lookbackDays = 92,
): BillDue[] {
  const monthStart = startOfMonth(today);
  return bills
    .filter((b) => !b.deletedAt)
    .flatMap((bill) =>
      dueDatesBetween(bill, addDays(startOfDay(today), -lookbackDays), addDays(monthStart, -1)).map((due) =>
        toDue(bill, due, today),
      ),
    )
    .filter((d) => !d.paid)
    .sort((a, b) => a.due.getTime() - b.due.getTime());
}

/** Próximo vencimento ainda não pago (a partir de hoje, ou o atrasado mais antigo). */
export function nextUnpaidDue(bill: Bill, today: Date = new Date()): BillDue | null {
  const start = addDays(startOfDay(today), -92);
  const dues = dueDatesBetween(bill, start, addDays(startOfDay(today), 800));
  const due = dues.find((d) => !bill.paidPeriods.includes(toDateKey(d)));
  return due ? toDue(bill, due, today) : null;
}

export type MonthSummary = {
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  count: number;
  paidCount: number;
  /** Contas sem valor definido (não entram na soma). */
  withoutAmount: number;
};

export function summarize(dues: readonly BillDue[]): MonthSummary {
  const summary: MonthSummary = {
    totalCents: 0,
    paidCents: 0,
    remainingCents: 0,
    count: dues.length,
    paidCount: 0,
    withoutAmount: 0,
  };
  for (const d of dues) {
    if (d.paid) summary.paidCount++;
    const amount = d.bill.amountCents;
    if (amount === null) {
      summary.withoutAmount++;
      continue;
    }
    summary.totalCents += amount;
    if (d.paid) summary.paidCents += amount;
    else summary.remainingCents += amount;
  }
  return summary;
}

/** Marca ou desmarca um vencimento como pago (mantém só os mais recentes). */
export function togglePaidPeriod(paidPeriods: readonly string[], dueKey: string): string[] {
  const next = paidPeriods.includes(dueKey)
    ? paidPeriods.filter((k) => k !== dueKey)
    : [...paidPeriods, dueKey];
  return [...new Set(next)].sort().slice(-MAX_PAID_PERIODS);
}
