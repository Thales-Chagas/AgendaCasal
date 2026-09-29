import {
  daysUntilLabel,
  nextOccurrence,
  specialDateSubtitle,
  upcomingSpecialDates,
  yearsAt,
} from './presentation';
import type { SpecialDate } from './types';

const item = (overrides: Partial<SpecialDate>): SpecialDate => ({
  id: 'x',
  coupleId: 'c',
  title: 'Data',
  kind: 'custom',
  date: '2020-06-12',
  repeatsYearly: true,
  reminderDays: [0, 1],
  version: 1,
  createdBy: null,
  updatedBy: null,
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  ...overrides,
});

const today = new Date(2026, 8, 29);

describe('datas especiais', () => {
  it('calcula a próxima ocorrência anual', () => {
    expect(nextOccurrence(item({ date: '2020-12-25' }), today)).toEqual(new Date(2026, 11, 25));
    expect(nextOccurrence(item({ date: '2020-06-12' }), today)).toEqual(new Date(2027, 5, 12));
    expect(nextOccurrence(item({ date: '2020-09-29' }), today)).toEqual(today);
  });

  it('29 de fevereiro vira 28 em anos não bissextos', () => {
    expect(nextOccurrence(item({ date: '2024-02-29' }), today)).toEqual(new Date(2027, 1, 28));
  });

  it('datas únicas que já passaram somem', () => {
    expect(nextOccurrence(item({ date: '2026-01-01', repeatsYearly: false }), today)).toBeNull();
  });

  it('conta anos e escreve contagem', () => {
    const namoro = item({ kind: 'dating_anniversary', date: '2023-10-10' });
    const next = nextOccurrence(namoro, today) as Date;
    expect(yearsAt(namoro, next)).toBe(3);
    expect(specialDateSubtitle(namoro, next)).toBe('3 anos juntos · 10 de outubro');
    expect(daysUntilLabel(next, today)).toBe('Faltam 11 dias');
    expect(daysUntilLabel(today, today)).toBe('É hoje! 🎉');
  });

  it('ordena as próximas datas', () => {
    const list = upcomingSpecialDates(
      [
        item({ id: 'a', date: '2020-12-25' }),
        item({ id: 'b', date: '2020-10-01' }),
        item({ id: 'c', deletedAt: 'x' }),
      ],
      today,
    );
    expect(list.map((x) => x.item.id)).toEqual(['b', 'a']);
  });
});
