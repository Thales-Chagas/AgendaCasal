import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { darkColors, lightColors } from './colors';
import { contrastRatio } from './contrast';
import { isAvatarColor, PERSONAL_COLORS, personColor, personTone, type AvatarColor } from './person-colors';

const ALL: AvatarColor[] = ['rose', ...PERSONAL_COLORS];

describe('cores pessoais', () => {
  it('o seletor tem de 12 a 15 opções, sem repetir e sem o rosé do casal', () => {
    expect(PERSONAL_COLORS.length).toBeGreaterThanOrEqual(12);
    expect(PERSONAL_COLORS.length).toBeLessThanOrEqual(15);
    expect(new Set(PERSONAL_COLORS).size).toBe(PERSONAL_COLORS.length);
    expect(PERSONAL_COLORS).not.toContain('rose');
  });

  it('cada opção tem uma cor sólida própria e um degradê com vários tons', () => {
    const solids = ALL.map((c) => personColor(c).solid);
    expect(new Set(solids).size).toBe(solids.length);
    for (const color of ALL) {
      expect(personColor(color).solid).toMatch(/^#[0-9A-F]{6}$/);
      expect(personColor(color).prism.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('mantém as chaves e os tons das cores antigas', () => {
    expect(personTone('indigo', 'light')).toMatchObject({ soft: '#E7E9FA', strong: '#3F4FB0' });
    expect(personTone('sage', 'dark')).toMatchObject({ soft: '#1F3326', strong: '#A8D8B6' });
    for (const legacy of ['rose', 'plum', 'indigo', 'teal', 'amber', 'sage']) {
      expect(isAvatarColor(legacy)).toBe(true);
    }
  });

  it('valor desconhecido vira índigo em vez de quebrar a tela', () => {
    expect(isAvatarColor('neon-x')).toBe(false);
    expect(personColor('neon-x').key).toBe('indigo');
    expect(personColor(undefined).key).toBe('indigo');
  });

  it.each(ALL)('%s: iniciais legíveis sobre a cor sólida (4.5:1)', (color) => {
    const { solid, onSolid } = personColor(color);
    expect(contrastRatio(onSolid, solid)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(ALL)('%s: a cor sólida se destaca nos dois temas (3:1)', (color) => {
    const { solid } = personColor(color);
    expect(contrastRatio(solid, lightColors.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(solid, darkColors.surface)).toBeGreaterThanOrEqual(3);
  });

  describe.each([
    ['light', lightColors],
    ['dark', darkColors],
  ] as const)('tema %s', (scheme, colors) => {
    it.each(ALL)('%s: texto dos compromissos legível (4.5:1)', (color) => {
      const { soft, strong } = personTone(color, scheme);
      expect(contrastRatio(strong, soft)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(strong, colors.surface)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('a lista do banco aceita exatamente as mesmas cores', () => {
    const dir = join(__dirname, '../../../supabase/migrations');
    const latest = readdirSync(dir)
      .filter((f) => readFileSync(join(dir, f), 'utf8').includes('profiles_avatar_color_check check'))
      .sort()
      .pop() as string;
    const sql = readFileSync(join(dir, latest), 'utf8');
    const allowed = [...sql.slice(sql.indexOf('avatar_color in')).matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect(new Set(allowed)).toEqual(new Set(ALL));
  });
});
