import {
  buildInviteLink,
  buildInviteMessage,
  formatInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from './invite-code';

describe('código de convite', () => {
  it('normaliza o que a pessoa digitou', () => {
    expect(normalizeInviteCode(' abcd-2345 ')).toBe('ABCD2345');
  });

  it('valida tamanho e alfabeto sem caracteres ambíguos', () => {
    expect(isValidInviteCode('ABCD-2345')).toBe(true);
    expect(isValidInviteCode('ABCD234')).toBe(false);
    expect(isValidInviteCode('ABCD2340')).toBe(false); // 0 não existe no alfabeto
    expect(isValidInviteCode('ABCDI234')).toBe(false); // I também não
  });

  it('formata em dois blocos', () => {
    expect(formatInviteCode('abcd2345')).toBe('ABCD-2345');
  });

  it('gera link e mensagem de convite', () => {
    expect(buildInviteLink('abcd-2345')).toBe('nossaagenda://convite/ABCD2345');
    const message = buildInviteMessage('Ana', 'ABCD2345');
    expect(message).toContain('Ana');
    expect(message).toContain('ABCD-2345');
    expect(message).toContain('48 horas');
  });
});
