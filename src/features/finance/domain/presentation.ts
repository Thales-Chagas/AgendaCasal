import { differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { fromDateKey } from '@/features/events/domain/dates';

import type { DueStatus } from './schedule';
import type { Bill, BillCategory, BillFrequency } from './types';

export const billCategoryMeta: Record<BillCategory, { label: string; emoji: string }> = {
  housing: { label: 'Moradia', emoji: '🏠' },
  utilities: { label: 'Luz, água e gás', emoji: '💡' },
  internet: { label: 'Internet e celular', emoji: '📶' },
  card: { label: 'Cartão', emoji: '💳' },
  subscription: { label: 'Assinaturas', emoji: '📺' },
  health: { label: 'Saúde', emoji: '🩺' },
  education: { label: 'Educação', emoji: '🎓' },
  transport: { label: 'Transporte', emoji: '🚗' },
  insurance: { label: 'Seguros', emoji: '🛡️' },
  other: { label: 'Outra', emoji: '🧾' },
};

export const frequencyLabels: Record<BillFrequency, string> = { monthly: 'Todo mês', yearly: 'Todo ano' };

export const billReminderLabels: Record<number, string> = {
  0: 'No dia',
  1: '1 dia antes',
  2: '2 dias antes',
  3: '3 dias antes',
  5: '5 dias antes',
  7: '1 semana antes',
};

/** 180000 → "R$ 1.800,00" (sem depender do Intl do aparelho). */
export function formatCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const reais = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}R$ ${reais},${String(abs % 100).padStart(2, '0')}`;
}

/** Até R$ 10 milhões (limite do servidor). */
export const MAX_AMOUNT_CENTS = 1_000_000_000;

/**
 * Campo de valor "estilo app de banco": os dígitos digitados são centavos.
 * "18" → 18 centavos; "180000" → R$ 1.800,00. Sem dígitos → null (sem valor).
 */
export function centsFromTyped(text: string): number | null {
  const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return null;
  return Math.min(Number(digits.slice(0, 10)), MAX_AMOUNT_CENTS);
}

/** "Todo dia 5", "Todo 5 de março". */
export function repeatLabel(bill: Pick<Bill, 'firstDueDate' | 'frequency'>): string {
  const first = fromDateKey(bill.firstDueDate);
  if (bill.frequency === 'yearly') return `Todo ${format(first, "d 'de' MMMM", { locale: ptBR })}`;
  return `Todo dia ${first.getDate()}`;
}

/** "Venceu há 3 dias", "Vence hoje", "Vence amanhã", "Vence em 5 dias", "Paga". */
export function dueLabel(due: Date, status: DueStatus, today: Date = new Date()): string {
  if (status === 'paid') return 'Paga';
  const days = differenceInCalendarDays(due, today);
  if (days < 0) return days === -1 ? 'Venceu ontem' : `Venceu há ${-days} dias`;
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  if (days <= 7) return `Vence em ${days} dias`;
  return `Vence ${format(due, "d 'de' MMM", { locale: ptBR })}`;
}

export const scopeLabels = {
  couple: { short: 'Do casal', emoji: '❤️' },
  person: { short: 'Só minha', emoji: '🔒' },
} as const;
