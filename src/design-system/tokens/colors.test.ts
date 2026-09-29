import { darkColors, lightColors, type ColorTokens } from './colors';
import { contrastRatio } from './contrast';

type Pair = [foreground: keyof ColorTokens, background: keyof ColorTokens, minimum: number];

// Texto normal: 4.5:1. Elementos de interface e texto grande: 3:1.
const pairs: Pair[] = [
  ['textPrimary', 'background', 4.5],
  ['textPrimary', 'surface', 4.5],
  ['textPrimary', 'surfaceMuted', 4.5],
  ['textSecondary', 'background', 4.5],
  ['textSecondary', 'surface', 4.5],
  ['textSecondary', 'surfaceMuted', 4.5],
  ['textTertiary', 'surface', 4.5],
  ['textTertiary', 'background', 4.5],
  ['textOnPrimary', 'primary', 4.5],
  ['textOnPrimary', 'primaryPressed', 4.5],
  ['primary', 'surface', 4.5],
  ['primary', 'background', 4.5],
  ['onPrimarySoft', 'primarySoft', 4.5],
  ['success', 'successSoft', 4.5],
  ['success', 'surface', 4.5],
  ['warning', 'warningSoft', 4.5],
  ['danger', 'dangerSoft', 4.5],
  ['danger', 'surface', 4.5],
  ['info', 'infoSoft', 4.5],
  ['mine', 'mineSoft', 4.5],
  ['mine', 'surface', 4.5],
  ['partner', 'partnerSoft', 4.5],
  ['partner', 'surface', 4.5],
  ['ours', 'oursSoft', 4.5],
  ['private', 'privateSoft', 4.5],
  ['private', 'surface', 4.5],
  ['borderStrong', 'surface', 1.4],
];

describe.each([
  ['claro', lightColors],
  ['escuro', darkColors],
])('tema %s', (_name, colors) => {
  it.each(pairs)('%s sobre %s atinge %p:1', (fg, bg, minimum) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(minimum);
  });
});
