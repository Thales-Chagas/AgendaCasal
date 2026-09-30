import { resolvePersonalColor } from './person-color';

describe('resolvePersonalColor', () => {
  it('mantém a cor escolhida pela pessoa', () => {
    expect(resolvePersonalColor('amber', 'indigo')).toBe('amber');
  });

  it('nunca usa o rosé, que é a cor do casal', () => {
    expect(resolvePersonalColor('rose', 'indigo')).toBe('indigo');
  });

  it('usa a cor padrão quando o perfil ainda não carregou', () => {
    expect(resolvePersonalColor(undefined, 'teal')).toBe('teal');
  });
});
