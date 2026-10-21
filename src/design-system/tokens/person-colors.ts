import { contrastRatio } from './contrast';

/**
 * Cores pessoais. Cada opção tem duas camadas:
 * - `prism`: degradê decorativo, usado SÓ no seletor de cor e em detalhes visuais;
 * - `solid`: a cor funcional que identifica a pessoa (avatar, compromissos, indicadores).
 *
 * A chave é o valor salvo em `profiles.avatar_color`. As chaves antigas (rose, plum, indigo,
 * teal, amber, sage) continuam válidas e com os mesmos tons nos compromissos.
 */
export type AvatarColor =
  | 'rose'
  | 'indigo'
  | 'azure'
  | 'cyan'
  | 'teal'
  | 'emerald'
  | 'sage'
  | 'lime'
  | 'gold'
  | 'amber'
  | 'bronze'
  | 'coral'
  | 'magenta'
  | 'plum'
  | 'violet'
  | 'slate';

type Pair = [soft: string, strong: string];

type PersonColorSpec = {
  /** Nome curto, embaixo de cada opção do seletor. */
  label: string;
  /** Nome descritivo, na prévia. */
  name: string;
  solid: string;
  prism: readonly string[];
  /** Tons já calibrados das cores antigas; as novas são derivadas de `solid`. */
  tones?: { light: Pair; dark: Pair };
};

const specs: Record<AvatarColor, PersonColorSpec> = {
  rose: {
    label: 'Rosa',
    name: 'Rosa do casal',
    solid: '#B8385A',
    prism: ['#FBCFE8', '#E11D74', '#9F1239'],
    tones: { light: ['#F9E4EA', '#8E2644'], dark: ['#4A2231', '#F7B8C8'] },
  },
  indigo: {
    label: 'Índigo',
    name: 'Índigo noturno',
    solid: '#4F5BD5',
    prism: ['#A5B4FC', '#4F46E5', '#A855F7'],
    tones: { light: ['#E7E9FA', '#3F4FB0'], dark: ['#262B52', '#B7C0F8'] },
  },
  azure: {
    label: 'Elétrico',
    name: 'Azul elétrico',
    solid: '#2563EB',
    prism: ['#7DD3FC', '#2563EB', '#6366F1'],
  },
  cyan: { label: 'Ciano', name: 'Ciano glacial', solid: '#0891B2', prism: ['#CFFAFE', '#06B6D4', '#3B82F6'] },
  teal: {
    label: 'Lagoa',
    name: 'Lagoa turquesa',
    solid: '#0EA5A0',
    prism: ['#67E8F9', '#0EA5A0', '#8B5CF6'],
    tones: { light: ['#DDF2F0', '#12716D'], dark: ['#173634', '#8FDCD5'] },
  },
  emerald: {
    label: 'Esmeralda',
    name: 'Esmeralda',
    solid: '#059669',
    prism: ['#A7F3D0', '#10B981', '#0E7490'],
  },
  sage: {
    label: 'Sálvia',
    name: 'Sálvia orvalhada',
    solid: '#5E9C76',
    prism: ['#ECFCCB', '#86B79A', '#3F7A5A'],
    tones: { light: ['#E4F0E6', '#35684A'], dark: ['#1F3326', '#A8D8B6'] },
  },
  lime: { label: 'Lima', name: 'Lima cítrica', solid: '#65A30D', prism: ['#ECFCCB', '#84CC16', '#14B8A6'] },
  gold: { label: 'Dourado', name: 'Ouro solar', solid: '#B8870C', prism: ['#FEF3C7', '#EAB308', '#F97316'] },
  amber: {
    label: 'Âmbar',
    name: 'Âmbar',
    solid: '#D2700F',
    prism: ['#FDE68A', '#F59E0B', '#EA580C'],
    tones: { light: ['#FBEFD9', '#8F5205'], dark: ['#3D2D14', '#F5CB8A'] },
  },
  bronze: {
    label: 'Bronze',
    name: 'Bronze iridescente',
    solid: '#9A6A3E',
    prism: ['#FED7AA', '#B7794A', '#7C3AED'],
  },
  coral: { label: 'Coral', name: 'Coral poente', solid: '#E4572E', prism: ['#FED7AA', '#FB7185', '#F97316'] },
  magenta: {
    label: 'Magenta',
    name: 'Magenta neon',
    solid: '#C026D3',
    prism: ['#F5D0FE', '#D946EF', '#7C3AED'],
  },
  plum: {
    label: 'Ameixa',
    name: 'Ameixa',
    solid: '#9150B5',
    prism: ['#E9D5FF', '#A26BC2', '#5B2A86'],
    tones: { light: ['#EEE7F3', '#5A3F6E'], dark: ['#35283F', '#D9C4EA'] },
  },
  violet: {
    label: 'Violeta',
    name: 'Violeta ultravioleta',
    solid: '#8143EE',
    prism: ['#C4B5FD', '#7C3AED', '#2563EB'],
  },
  slate: {
    label: 'Prata',
    name: 'Prata iridescente',
    solid: '#7A8597',
    prism: ['#F1F5F9', '#A5B4FC', '#94A3B8', '#F0ABFC'],
  },
};

/** Opções do seletor, na ordem do espectro. O rosé fica reservado para o que é "do casal". */
export const PERSONAL_COLORS: readonly AvatarColor[] = [
  'indigo',
  'azure',
  'cyan',
  'teal',
  'emerald',
  'sage',
  'lime',
  'gold',
  'amber',
  'bronze',
  'coral',
  'magenta',
  'plum',
  'violet',
  'slate',
];

export function isAvatarColor(value: unknown): value is AvatarColor {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(specs, value);
}

/** Superfícies sobre as quais os tons de compromisso precisam ser legíveis. */
const surfaces = { light: '#FFFFFF', dark: '#201A20' } as const;
const ink = '#140F14';

function mix(from: string, to: string, amount: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) =>
    Math.round(channel(from, i) + (channel(to, i) - channel(from, i)) * amount),
  );
  return `#${out
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/** Fundo suave + tom forte legível (4.5:1) sobre ele e sobre a superfície do tema. */
function deriveTones(solid: string, scheme: 'light' | 'dark'): Pair {
  const surface = surfaces[scheme];
  const soft = mix(solid, surface, scheme === 'light' ? 0.88 : 0.72);
  const target = scheme === 'light' ? '#000000' : '#FFFFFF';
  let strong = solid;
  for (let step = 1; contrastRatio(strong, soft) < 4.5 || contrastRatio(strong, surface) < 4.5; step++) {
    strong = mix(solid, target, step * 0.04);
  }
  return [soft, strong];
}

export type PersonColor = {
  key: AvatarColor;
  label: string;
  name: string;
  solid: string;
  /** Texto e ícones sobre `solid` (branco ou tinta, o que tiver mais contraste). */
  onSolid: string;
  prism: readonly string[];
  tones: { light: Pair; dark: Pair };
};

const resolved = Object.fromEntries(
  (Object.keys(specs) as AvatarColor[]).map((key) => {
    const spec = specs[key];
    const onSolid = contrastRatio('#FFFFFF', spec.solid) >= contrastRatio(ink, spec.solid) ? '#FFFFFF' : ink;
    const tones = spec.tones ?? {
      light: deriveTones(spec.solid, 'light'),
      dark: deriveTones(spec.solid, 'dark'),
    };
    return [
      key,
      { key, label: spec.label, name: spec.name, solid: spec.solid, onSolid, prism: spec.prism, tones },
    ];
  }),
) as Record<AvatarColor, PersonColor>;

/** Cor de uma pessoa; valores desconhecidos (ex.: vindos de uma versão mais nova) viram índigo. */
export function personColor(color: AvatarColor | string | undefined): PersonColor {
  return isAvatarColor(color) ? resolved[color] : resolved.indigo;
}

/**
 * Tons da cor de uma pessoa: `soft` para fundos, `strong` para texto e ícones,
 * `solid` para a identificação (avatar, barras e pontos dos compromissos).
 */
export function personTone(
  color: AvatarColor,
  scheme: 'light' | 'dark',
): { soft: string; strong: string; solid: string } {
  const { tones, solid } = personColor(color);
  const [soft, strong] = tones[scheme];
  return { soft, strong, solid };
}
