import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { toast } from '@/design-system';
import { agendaKeys, requireAgendaRuntime, useAgendaStatus } from '@/features/sync/agenda-runtime';

import { togglePaidPeriod } from './domain/schedule';
import {
  BILL_CATEGORIES,
  BILL_REMINDER_OPTIONS,
  MAX_PAID_PERIODS,
  type Bill,
  type BillFields,
} from './domain/types';

/** Todas as contas visíveis para mim (as do casal e as minhas pessoais), da cópia local. */
export function useBills() {
  const ready = useAgendaStatus((s) => s.ready);
  return useQuery({
    queryKey: [...agendaKeys.entity('bills'), 'all'],
    enabled: ready,
    staleTime: 60_000,
    queryFn: () => requireAgendaRuntime().local.allActive('bills'),
  });
}

export function useBill(id: string | undefined) {
  const ready = useAgendaStatus((s) => s.ready);
  return useQuery({
    queryKey: [...agendaKeys.entity('bills'), 'one', id],
    enabled: ready && !!id,
    queryFn: async () => (await requireAgendaRuntime().local.get('bills', id as string)) ?? null,
  });
}

export const billSchema = z
  .object({
    ownerScope: z.enum(['person', 'couple']),
    ownerUserId: z.string().nullable(),
    title: z.string().trim().min(1, 'Dê um nome para a conta.').max(80, 'Use no máximo 80 caracteres.'),
    category: z.enum(BILL_CATEGORIES),
    amountCents: z.number().int().min(0).max(1_000_000_000).nullable(),
    frequency: z.enum(['monthly', 'yearly']),
    firstDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Escolha a data do vencimento.'),
    reminderDays: z.array(z.number().refine((n) => (BILL_REMINDER_OPTIONS as readonly number[]).includes(n))),
    paidPeriods: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(MAX_PAID_PERIODS),
    notes: z
      .string()
      .trim()
      .max(500, 'Use no máximo 500 caracteres.')
      .nullable()
      .transform((v) => (v ? v : null)),
  })
  .refine((b) => (b.ownerScope === 'couple') === (b.ownerUserId === null), {
    message: 'Escolha de quem é a conta.',
  });

export async function saveBill(id: string | null, fields: BillFields): Promise<Bill> {
  const valid = billSchema.parse(fields) as BillFields;
  const runtime = requireAgendaRuntime();
  if (!id) return runtime.bills.create(valid);
  // Tipo e dono não mudam depois de criados.
  const { ownerScope: _scope, ownerUserId: _owner, ...editable } = valid;
  return runtime.bills.update(id, editable);
}

/** Marca/desmarca um vencimento como pago. Funciona sem internet. */
export async function toggleBillPaid(bill: Bill, dueKey: string): Promise<boolean> {
  const paidPeriods = togglePaidPeriod(bill.paidPeriods, dueKey);
  await requireAgendaRuntime().bills.update(bill.id, { paidPeriods });
  return paidPeriods.includes(dueKey);
}

export async function deleteBillWithUndo(id: string) {
  const undo = await requireAgendaRuntime().bills.remove(id);
  toast.success('Conta excluída', { label: 'Desfazer', onPress: () => void undo() });
}
