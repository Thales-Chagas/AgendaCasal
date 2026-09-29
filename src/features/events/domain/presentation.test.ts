import {
  countdownLabel,
  formatOccurrenceTime,
  greeting,
  longDateLabel,
  relativeDayLabel,
  responsibilityFor,
  responsibilityText,
} from './presentation';
import type { CalendarEvent, Occurrence } from './types';

const base = { event: {} as CalendarEvent, key: 'k', localDate: '2026-09-29' };

describe('responsável relativo a quem vê', () => {
  it('traduz para Meu / Do parceiro / Nosso', () => {
    expect(responsibilityFor({ ownerScope: 'couple', responsibleUserId: null }, 'ana')).toBe('ours');
    expect(responsibilityFor({ ownerScope: 'person', responsibleUserId: 'ana' }, 'ana')).toBe('mine');
    expect(responsibilityFor({ ownerScope: 'person', responsibleUserId: 'ana' }, 'bruno')).toBe('partner');
    expect(responsibilityText('partner', 'Ana')).toBe('De Ana');
    expect(responsibilityText('ours')).toBe('Nosso');
  });
});

describe('formatação', () => {
  const day = new Date(2026, 8, 29);

  it('mostra intervalos de horário', () => {
    const occ: Occurrence = {
      ...base,
      allDay: false,
      start: new Date(2026, 8, 29, 20, 0),
      end: new Date(2026, 8, 29, 21, 30),
    };
    expect(formatOccurrenceTime(occ, day)).toBe('20:00 – 21:30');
  });

  it('mostra "Dia inteiro" e continuações', () => {
    expect(formatOccurrenceTime({ ...base, allDay: true, start: day, end: new Date(2026, 8, 30) }, day)).toBe(
      'Dia inteiro',
    );
    const overnight: Occurrence = {
      ...base,
      allDay: false,
      start: new Date(2026, 8, 28, 22, 0),
      end: new Date(2026, 8, 29, 2, 0),
    };
    expect(formatOccurrenceTime(overnight, day)).toBe('Até 02:00');
  });

  it('usa rótulos relativos de dia', () => {
    expect(relativeDayLabel(day, day)).toBe('Hoje');
    expect(relativeDayLabel(new Date(2026, 8, 30), day)).toBe('Amanhã');
    expect(relativeDayLabel(new Date(2026, 9, 3), day)).toBe('sábado, 3 de out');
    expect(longDateLabel(day)).toBe('Terça-feira, 29 de setembro');
  });

  it('contagem regressiva', () => {
    expect(countdownLabel(new Date(2026, 9, 11), day)).toBe('Faltam 12 dias');
    expect(countdownLabel(new Date(2026, 8, 30), day)).toBe('É amanhã!');
    expect(countdownLabel(day, day)).toBe('É hoje!');
  });

  it('saudação pela hora', () => {
    expect(greeting(new Date(2026, 8, 29, 8))).toBe('Bom dia');
    expect(greeting(new Date(2026, 8, 29, 14))).toBe('Boa tarde');
    expect(greeting(new Date(2026, 8, 29, 21))).toBe('Boa noite');
  });
});
