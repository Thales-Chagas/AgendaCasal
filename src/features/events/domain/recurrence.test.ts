import {
  buildRule,
  describeRule,
  expandOccurrences,
  occurrencesInRange,
  parseRule,
  presetOf,
  presetRule,
} from './recurrence';
import type { CalendarEvent } from './types';

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 'e1',
    coupleId: 'c1',
    title: 'Evento',
    description: null,
    location: null,
    allDay: false,
    startsAt: null,
    endsAt: null,
    startDate: null,
    endDate: null,
    timezone: 'America/Sao_Paulo',
    category: 'couple',
    priority: 'normal',
    ownerScope: 'couple',
    responsibleUserId: null,
    recurrenceRule: null,
    recurrenceExdates: [],
    reminderMinutes: [],
    showCountdown: false,
    version: 1,
    createdBy: null,
    updatedBy: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    ...overrides,
  };
}

const d = (iso: string) => new Date(iso);

describe('regras', () => {
  it('monta e interpreta regras', () => {
    const rule = buildRule({ freq: 'weekly', interval: 2, weekdays: [3, 1], until: '2026-12-31' });
    expect(rule).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH;UNTIL=20261231T235959Z');
    expect(parseRule(rule)).toEqual({
      freq: 'weekly',
      interval: 2,
      weekdays: [1, 3],
      until: '2026-12-31',
      count: null,
    });
    expect(parseRule('lixo')).toBeNull();
  });

  it('reconhece atalhos a partir da data de início', () => {
    const tuesday = new Date(2026, 8, 29); // terça
    expect(presetRule('weekly', tuesday)).toBe('FREQ=WEEKLY;BYDAY=TU');
    expect(presetOf('FREQ=WEEKLY;BYDAY=TU', tuesday)).toBe('weekly');
    expect(presetOf('FREQ=WEEKLY;BYDAY=MO', tuesday)).toBe('custom');
    expect(presetOf(null, tuesday)).toBe('none');
  });

  it.each([
    ['FREQ=DAILY', 'Todos os dias'],
    ['FREQ=DAILY;INTERVAL=3', 'A cada 3 dias'],
    ['FREQ=WEEKLY;BYDAY=TU', 'Toda terça'],
    ['FREQ=WEEKLY;BYDAY=SA', 'Todo sábado'],
    ['FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', 'De segunda a sexta'],
    ['FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH', 'A cada 2 semanas, às terças e quintas'],
    ['FREQ=MONTHLY', 'Todo dia 29'],
    ['FREQ=YEARLY', 'Todo ano em 29 de setembro'],
    ['FREQ=MONTHLY;COUNT=12', 'Todo dia 29, 12 vezes'],
    ['FREQ=DAILY;UNTIL=20261231T235959Z', 'Todos os dias, até 31/12/2026'],
    [null, 'Não se repete'],
  ])('descreve %s como "%s"', (rule, text) => {
    expect(describeRule(rule, new Date(2026, 8, 29))).toBe(text);
  });
});

describe('expansão de ocorrências', () => {
  it('evento simples aparece só no seu horário', () => {
    const e = event({ startsAt: '2026-10-01T23:00:00Z', endsAt: '2026-10-02T00:00:00Z' });
    expect(expandOccurrences(e, d('2026-10-01T00:00:00Z'), d('2026-10-03T00:00:00Z'))).toHaveLength(1);
    expect(expandOccurrences(e, d('2026-10-02T00:00:01Z'), d('2026-10-03T00:00:00Z'))).toHaveLength(0);
  });

  it('academia toda terça às 7h', () => {
    const e = event({
      startsAt: '2026-09-29T10:00:00Z', // 07:00 em São Paulo
      endsAt: '2026-09-29T11:00:00Z',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU',
    });
    const occ = expandOccurrences(e, d('2026-09-28T03:00:00Z'), d('2026-10-28T03:00:00Z'));
    expect(occ.map((o) => o.localDate)).toEqual([
      '2026-09-29',
      '2026-10-06',
      '2026-10-13',
      '2026-10-20',
      '2026-10-27',
    ]);
    expect(occ.every((o) => o.start.getUTCHours() === 10)).toBe(true);
  });

  it('pagar aluguel todo dia 10', () => {
    const e = event({
      startsAt: '2026-01-10T12:00:00Z',
      endsAt: '2026-01-10T12:30:00Z',
      recurrenceRule: 'FREQ=MONTHLY',
    });
    const occ = expandOccurrences(e, d('2026-01-01T00:00:00Z'), d('2027-01-01T00:00:00Z'));
    expect(occ).toHaveLength(12);
    expect(occ.every((o) => o.localDate.endsWith('-10'))).toBe(true);
  });

  it('aniversário todo ano (dia inteiro, sem mudar de dia por fuso)', () => {
    const e = event({
      allDay: true,
      startDate: '1990-06-12',
      endDate: '1990-06-12',
      recurrenceRule: 'FREQ=YEARLY',
    });
    const occ = expandOccurrences(e, new Date(2026, 0, 1), new Date(2027, 0, 1));
    expect(occ).toHaveLength(1);
    expect(occ[0]?.localDate).toBe('2026-06-12');
    expect(occ[0]?.start).toEqual(new Date(2026, 5, 12));
    expect(occ[0]?.end).toEqual(new Date(2026, 5, 13));
  });

  it('mantém a hora local depois da mudança de horário de verão', () => {
    const e = event({
      timezone: 'America/New_York',
      startsAt: '2026-10-26T13:00:00Z', // 9h em NY (EDT, UTC-4)
      endsAt: '2026-10-26T14:00:00Z',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
    });
    const occ = expandOccurrences(e, d('2026-10-25T00:00:00Z'), d('2026-11-10T00:00:00Z'));
    // Após 1º/nov NY vira EST (UTC-5): 9h local = 14h UTC.
    expect(occ.map((o) => o.start.toISOString())).toEqual([
      '2026-10-26T13:00:00.000Z',
      '2026-11-02T14:00:00.000Z',
      '2026-11-09T14:00:00.000Z',
    ]);
  });

  it('respeita exceções (ocorrência removida)', () => {
    const e = event({
      startsAt: '2026-09-29T10:00:00Z',
      endsAt: '2026-09-29T11:00:00Z',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU',
      recurrenceExdates: ['2026-10-06'],
    });
    const occ = expandOccurrences(e, d('2026-09-28T00:00:00Z'), d('2026-10-15T00:00:00Z'));
    expect(occ.map((o) => o.localDate)).toEqual(['2026-09-29', '2026-10-13']);
  });

  it('eventos excluídos não aparecem', () => {
    const e = event({
      startsAt: '2026-10-01T23:00:00Z',
      endsAt: '2026-10-02T00:00:00Z',
      deletedAt: '2026-09-30T00:00:00Z',
    });
    expect(expandOccurrences(e, d('2026-10-01T00:00:00Z'), d('2026-10-03T00:00:00Z'))).toEqual([]);
  });

  it('evento de vários dias aparece em cada dia do intervalo', () => {
    const e = event({ allDay: true, startDate: '2026-12-20', endDate: '2026-12-27' });
    expect(expandOccurrences(e, new Date(2026, 11, 24), new Date(2026, 11, 25))).toHaveLength(1);
  });

  it('ordena por horário, com "dia inteiro" primeiro', () => {
    const timed = event({
      id: 'a',
      title: 'Jantar',
      startsAt: '2026-10-01T23:00:00Z',
      endsAt: '2026-10-02T00:00:00Z',
    });
    const allDay = event({
      id: 'b',
      title: 'Viagem',
      allDay: true,
      startDate: '2026-10-01',
      endDate: '2026-10-01',
    });
    const result = occurrencesInRange([timed, allDay], new Date(2026, 9, 1), new Date(2026, 9, 2));
    expect(result.map((o) => o.event.id)).toEqual(['b', 'a']);
  });

  it('regra inválida não quebra o app: vira evento único', () => {
    const e = event({
      startsAt: '2026-10-01T23:00:00Z',
      endsAt: '2026-10-02T00:00:00Z',
      recurrenceRule: 'FREQ=NADA',
    });
    expect(expandOccurrences(e, d('2026-10-01T00:00:00Z'), d('2026-10-03T00:00:00Z'))).toHaveLength(1);
  });
});
