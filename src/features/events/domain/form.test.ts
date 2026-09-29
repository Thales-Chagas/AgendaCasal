import { eventToForm, formToFields, newEventForm, nextFullHour, withEnd, withStart } from './form';
import type { CalendarEvent } from './types';
import { validateEventFields } from './validation';

const ANA = '11111111-1111-4111-8111-111111111111';
const BRUNO = '22222222-2222-4222-8222-222222222222';

describe('formulário de compromisso', () => {
  it('começa simples: próxima hora cheia, 1 hora de duração, "Nosso"', () => {
    const form = newEventForm(undefined, new Date(2026, 8, 29, 14, 20));
    expect(form.start).toEqual(new Date(2026, 8, 29, 15, 0));
    expect(form.end).toEqual(new Date(2026, 8, 29, 16, 0));
    expect(form.scope).toBe('ours');
    expect(nextFullHour(new Date(2026, 8, 29, 23, 30))).toEqual(new Date(2026, 8, 30, 0, 0));
  });

  it('dia escolhido na agenda começa às 9h', () => {
    const form = newEventForm('2026-10-10', new Date(2026, 8, 29, 14, 20));
    expect(form.start).toEqual(new Date(2026, 9, 10, 9, 0));
  });

  it('converte "Meu", "Do parceiro" e "Nosso" para o formato salvo', () => {
    const base = { ...newEventForm(), title: 'Dentista' };
    const people = { viewerId: ANA, partnerId: BRUNO };
    expect(formToFields({ ...base, scope: 'mine' }, people)).toMatchObject({
      ownerScope: 'person',
      responsibleUserId: ANA,
    });
    expect(formToFields({ ...base, scope: 'partner' }, people)).toMatchObject({
      ownerScope: 'person',
      responsibleUserId: BRUNO,
    });
    expect(formToFields({ ...base, scope: 'ours' }, people)).toMatchObject({
      ownerScope: 'couple',
      responsibleUserId: null,
    });
  });

  it('dia inteiro usa datas, não horários', () => {
    const form = {
      ...newEventForm(),
      title: 'Aniversário',
      allDay: true,
      start: new Date(2026, 5, 12, 9),
      end: new Date(2026, 5, 12, 10),
    };
    const fields = formToFields(form, { viewerId: ANA, partnerId: null }, 'America/Sao_Paulo');
    expect(fields).toMatchObject({
      startDate: '2026-06-12',
      endDate: '2026-06-12',
      startsAt: null,
      endsAt: null,
    });
    expect(() => validateEventFields(fields)).not.toThrow();
  });

  it('repetição semanal usa o dia da semana do início', () => {
    const form = {
      ...newEventForm(),
      title: 'Academia',
      start: new Date(2026, 8, 29, 7),
      end: new Date(2026, 8, 29, 8),
      repeat: 'weekly' as const,
    };
    expect(formToFields(form, { viewerId: ANA, partnerId: null }).recurrenceRule).toBe(
      'FREQ=WEEKLY;BYDAY=TU',
    );
  });

  it('ida e volta: compromisso salvo → formulário → mesmo compromisso', () => {
    const form = {
      ...newEventForm(),
      title: 'Viagem',
      scope: 'mine' as const,
      repeat: 'yearly' as const,
      location: 'Praia',
    };
    const fields = formToFields(form, { viewerId: ANA, partnerId: BRUNO });
    const event = { ...fields, id: 'x', coupleId: 'c', version: 1 } as unknown as CalendarEvent;
    const back = eventToForm(event, ANA);
    expect(back).toMatchObject({ title: 'Viagem', scope: 'mine', repeat: 'yearly', location: 'Praia' });
    expect(eventToForm(event, BRUNO).scope).toBe('partner');
  });

  it('mudar o início mantém a duração; fim antes do início vira o dia seguinte', () => {
    const form = newEventForm(undefined, new Date(2026, 8, 29, 14, 20));
    const moved = withStart(form, new Date(2026, 8, 29, 20, 0));
    expect(moved.end).toEqual(new Date(2026, 8, 29, 21, 0));
    const overnight = withEnd(moved, new Date(2026, 8, 29, 1, 0));
    expect(overnight.end).toEqual(new Date(2026, 8, 30, 1, 0));
  });

  it('valida: título obrigatório e "Do parceiro" exige parceiro', () => {
    const fields = formToFields({ ...newEventForm(), title: '  ' }, { viewerId: ANA, partnerId: null });
    expect(() => validateEventFields(fields)).toThrow(/nome ao compromisso/);
    const noPartner = formToFields(
      { ...newEventForm(), title: 'X', scope: 'partner' },
      { viewerId: ANA, partnerId: null },
    );
    expect(noPartner.ownerScope).toBe('couple');
  });
});
