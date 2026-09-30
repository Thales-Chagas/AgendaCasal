import { centsFromTyped, dueLabel, formatCents, repeatLabel } from './presentation';
import {
  dueDatesBetween,
  monthDues,
  nextUnpaidDue,
  previousMonthsOverdue,
  summarize,
  togglePaidPeriod,
} from './schedule';
import type { Bill } from './types';

const keys = (dates: Date[]) =>
  dates.map(
    (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  );

function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: overrides.id ?? 'b1',
    coupleId: 'c1',
    ownerScope: 'couple',
    ownerUserId: null,
    title: 'Aluguel',
    category: 'housing',
    amountCents: 180000,
    frequency: 'monthly',
    firstDueDate: '2026-01-05',
    reminderDays: [0, 3],
    paidPeriods: [],
    notes: null,
    version: 1,
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('dueDatesBetween', () => {
  it('repete todo mês no mesmo dia', () => {
    expect(keys(dueDatesBetween(bill(), new Date(2026, 2, 1), new Date(2026, 4, 31)))).toEqual([
      '2026-03-05',
      '2026-04-05',
      '2026-05-05',
    ]);
  });

  it('dia 31 vira o último dia dos meses mais curtos', () => {
    const b = bill({ firstDueDate: '2026-01-31' });
    expect(keys(dueDatesBetween(b, new Date(2026, 1, 1), new Date(2026, 4, 31)))).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('nunca gera vencimentos antes do primeiro', () => {
    const b = bill({ firstDueDate: '2026-06-10' });
    expect(keys(dueDatesBetween(b, new Date(2026, 0, 1), new Date(2026, 6, 31)))).toEqual([
      '2026-06-10',
      '2026-07-10',
    ]);
  });

  it('anual repete uma vez por ano (inclusive 29 de fevereiro)', () => {
    const b = bill({ frequency: 'yearly', firstDueDate: '2028-02-29' });
    expect(keys(dueDatesBetween(b, new Date(2028, 0, 1), new Date(2030, 11, 31)))).toEqual([
      '2028-02-29',
      '2029-02-28',
      '2030-02-28',
    ]);
  });
});

describe('mês e situação', () => {
  const today = new Date(2026, 9, 10); // 10/out/2026

  it('lista as contas do mês com a situação de cada uma', () => {
    const bills = [
      bill({ id: 'aluguel', firstDueDate: '2026-01-05', paidPeriods: ['2026-10-05'] }),
      bill({ id: 'luz', title: 'Luz', firstDueDate: '2026-01-08', amountCents: null }),
      bill({ id: 'net', title: 'Internet', firstDueDate: '2026-01-12', amountCents: 9990 }),
      bill({ id: 'ipva', title: 'IPVA', frequency: 'yearly', firstDueDate: '2026-03-20' }),
      bill({ id: 'velha', title: 'Excluída', deletedAt: '2026-09-01T00:00:00Z' }),
    ];
    const dues = monthDues(bills, today, today);
    expect(dues.map((d) => [d.bill.id, d.status])).toEqual([
      ['aluguel', 'paid'],
      ['luz', 'overdue'],
      ['net', 'soon'],
    ]);
    expect(summarize(dues)).toEqual({
      totalCents: 189990,
      paidCents: 180000,
      remainingCents: 9990,
      count: 3,
      paidCount: 1,
      withoutAmount: 1,
    });
  });

  it('mostra atrasos de meses anteriores ainda não pagos', () => {
    const b = bill({ firstDueDate: '2026-07-05', paidPeriods: ['2026-07-05', '2026-09-05'] });
    expect(previousMonthsOverdue([b], today).map((d) => d.dueKey)).toEqual(['2026-08-05']);
  });

  it('próximo vencimento a pagar é o atrasado mais antigo, senão o próximo', () => {
    expect(nextUnpaidDue(bill({ firstDueDate: '2026-09-05' }), today)?.dueKey).toBe('2026-09-05');
    expect(
      nextUnpaidDue(bill({ firstDueDate: '2026-09-05', paidPeriods: ['2026-09-05', '2026-10-05'] }), today)
        ?.dueKey,
    ).toBe('2026-11-05');
  });
});

describe('marcar como paga', () => {
  it('alterna, sem duplicar, em ordem', () => {
    expect(togglePaidPeriod(['2026-09-05'], '2026-10-05')).toEqual(['2026-09-05', '2026-10-05']);
    expect(togglePaidPeriod(['2026-09-05', '2026-10-05'], '2026-10-05')).toEqual(['2026-09-05']);
  });

  it('guarda no máximo 60 vencimentos (os mais recentes)', () => {
    const many = Array.from(
      { length: 60 },
      (_, i) =>
        `2020-${String((i % 12) + 1).padStart(2, '0')}-${String(Math.floor(i / 12) + 1).padStart(2, '0')}`,
    );
    const result = togglePaidPeriod(many, '2030-01-01');
    expect(result).toHaveLength(60);
    expect(result.at(-1)).toBe('2030-01-01');
  });
});

describe('apresentação', () => {
  it('formata reais', () => {
    expect(formatCents(180000)).toBe('R$ 1.800,00');
    expect(formatCents(5)).toBe('R$ 0,05');
    expect(formatCents(123456789)).toBe('R$ 1.234.567,89');
  });

  it('campo de valor trata os dígitos como centavos', () => {
    expect(centsFromTyped('')).toBeNull();
    expect(centsFromTyped('R$ 0,00')).toBe(0);
    expect(centsFromTyped('1.800,00')).toBe(180000);
    expect(centsFromTyped('R$ 1.800,005')).toBe(1800005);
    expect(centsFromTyped('99999999999999')).toBe(1_000_000_000);
  });

  it('descreve a repetição e o vencimento', () => {
    expect(repeatLabel(bill())).toBe('Todo dia 5');
    expect(repeatLabel(bill({ frequency: 'yearly', firstDueDate: '2026-03-20' }))).toBe('Todo 20 de março');
    const today = new Date(2026, 9, 10);
    expect(dueLabel(new Date(2026, 9, 7), 'overdue', today)).toBe('Venceu há 3 dias');
    expect(dueLabel(new Date(2026, 9, 10), 'today', today)).toBe('Vence hoje');
    expect(dueLabel(new Date(2026, 9, 11), 'soon', today)).toBe('Vence amanhã');
    expect(dueLabel(new Date(2026, 9, 5), 'paid', today)).toBe('Paga');
  });
});
