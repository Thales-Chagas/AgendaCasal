import { eventFields } from '@/features/sync/testing/fixtures';
import type { CalendarEvent } from '@/features/events/domain/types';
import type { SpecialDate } from '@/features/special-dates/domain/types';

import { MAX_SCHEDULED, planReminders } from './planner';

const ANA = 'ana';
const BRUNO = 'bruno';
const now = new Date(2026, 8, 29, 8, 0); // terça, 29/09, 08:00
const settings = { eventReminders: true, partnerEventReminders: false, specialDateReminders: true };

let seq = 0;
function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    ...eventFields(),
    id: `e${++seq}`,
    coupleId: 'c',
    version: 1,
    createdBy: ANA,
    updatedBy: ANA,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    ...overrides,
  } as CalendarEvent;
}

const at = (h: number, m = 0, dayOffset = 0) => new Date(2026, 8, 29 + dayOffset, h, m).toISOString();

describe('planejamento de lembretes', () => {
  it('"Jantar hoje às 20h" uma hora antes', () => {
    const plan = planReminders({
      events: [event({ title: 'Jantar', startsAt: at(20), endsAt: at(21), reminderMinutes: [60] })],
      specialDates: [],
      viewerId: ANA,
      settings,
      now,
    });
    expect(plan).toHaveLength(1);
    expect(plan[0]?.fireAt).toEqual(new Date(2026, 8, 29, 19, 0));
    expect(plan[0]?.title).toBe('❤️ Jantar hoje às 20h');
    expect(plan[0]?.body).toBe('Nosso compromisso ❤️');
  });

  it('"Consulta amanhã às 9h" um dia antes', () => {
    const plan = planReminders({
      events: [
        event({
          title: 'Consulta',
          category: 'health',
          startsAt: at(9, 0, 1),
          endsAt: at(10, 0, 1),
          reminderMinutes: [1440],
          ownerScope: 'person',
          responsibleUserId: ANA,
        }),
      ],
      specialDates: [],
      viewerId: ANA,
      settings,
      now,
    });
    expect(plan[0]?.title).toBe('🏥 Consulta amanhã às 9h');
    expect(plan[0]?.body).toBe('Seu compromisso');
  });

  it('compromisso do parceiro só avisa se a pessoa quiser', () => {
    const partnerEvent = event({
      startsAt: at(20),
      endsAt: at(21),
      reminderMinutes: [60],
      ownerScope: 'person',
      responsibleUserId: BRUNO,
    });
    expect(
      planReminders({ events: [partnerEvent], specialDates: [], viewerId: ANA, settings, now }),
    ).toHaveLength(0);
    expect(
      planReminders({
        events: [partnerEvent],
        specialDates: [],
        viewerId: ANA,
        settings: { ...settings, partnerEventReminders: true },
        now,
      }),
    ).toHaveLength(1);
  });

  it('não agenda no passado e respeita o horizonte', () => {
    const plan = planReminders({
      events: [event({ startsAt: at(8, 30), endsAt: at(9), reminderMinutes: [60, 10] })],
      specialDates: [],
      viewerId: ANA,
      settings,
      now,
    });
    expect(plan.map((p) => p.fireAt)).toEqual([new Date(2026, 8, 29, 8, 20)]);
  });

  it('dia inteiro lembra às 9h; "Viagem em 3 dias ✈️"', () => {
    const plan = planReminders({
      events: [
        event({
          title: 'Viagem',
          category: 'travel',
          allDay: true,
          startsAt: null,
          endsAt: null,
          startDate: '2026-10-02',
          endDate: '2026-10-05',
          reminderMinutes: [4320],
        }),
      ],
      specialDates: [],
      viewerId: ANA,
      settings,
      now,
    });
    expect(plan[0]?.fireAt).toEqual(new Date(2026, 8, 29, 9, 0));
    expect(plan[0]?.title).toBe('✈️ Viagem em 3 dias');
  });

  it('repetições geram um lembrete por ocorrência, com IDs estáveis', () => {
    const e = event({ startsAt: at(7), endsAt: at(8), recurrenceRule: 'FREQ=DAILY', reminderMinutes: [30] });
    const a = planReminders({ events: [e], specialDates: [], viewerId: ANA, settings, now, horizonDays: 3 });
    const b = planReminders({ events: [e], specialDates: [], viewerId: ANA, settings, now, horizonDays: 3 });
    expect(a.length).toBe(3);
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });

  it('limita a quantidade (limite do iOS), mantendo os mais próximos', () => {
    const e = event({
      startsAt: at(9),
      endsAt: at(10),
      recurrenceRule: 'FREQ=DAILY',
      reminderMinutes: [0, 10, 30],
    });
    const plan = planReminders({
      events: [e],
      specialDates: [],
      viewerId: ANA,
      settings,
      now,
      horizonDays: 60,
    });
    expect(plan).toHaveLength(MAX_SCHEDULED);
    expect(plan[0]!.fireAt <= plan[1]!.fireAt).toBe(true);
  });

  it('datas especiais: 7, 3, 1 dia antes e no dia, às 9h', () => {
    const birthday: SpecialDate = {
      id: 's1',
      coupleId: 'c',
      title: 'Aniversário da Ana',
      kind: 'birthday',
      date: '1995-10-06',
      repeatsYearly: true,
      reminderDays: [0, 1, 7],
      version: 1,
      createdBy: null,
      updatedBy: null,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    };
    const plan = planReminders({ events: [], specialDates: [birthday], viewerId: ANA, settings, now });
    expect(plan.map((p) => [p.fireAt.getDate(), p.fireAt.getHours(), p.title])).toEqual([
      [29, 9, 'Faltam 7 dias: Aniversário da Ana 🎂'],
      [5, 9, 'Amanhã: Aniversário da Ana 🎂'],
      [6, 9, 'Hoje é Aniversário da Ana 🎂'],
    ]);
  });

  it('desativar lembretes remove tudo', () => {
    const plan = planReminders({
      events: [event({ startsAt: at(20), endsAt: at(21), reminderMinutes: [60] })],
      specialDates: [],
      viewerId: ANA,
      settings: { eventReminders: false, partnerEventReminders: false, specialDateReminders: false },
      now,
    });
    expect(plan).toEqual([]);
  });
});
