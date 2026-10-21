import { Easing, interpolate, spring, staticFile } from 'remotion';

/** Mesma identidade do app: rosé do casal sobre o escuro, tipografia Plus Jakarta Sans. */
export const colors = {
  bg: '#0B0910',
  ink: '#F6EFF3',
  soft: '#C9BCC4',
  muted: '#8E7F89',
  rose: '#F0819E',
  roseDeep: '#B8385A',
};

export const prism = 'linear-gradient(100deg, #67E8F9 0%, #A78BFA 32%, #F0819E 62%, #FDBA74 100%)';

export const FONT = 'Plus Jakarta Sans';

export function Fonts() {
  const faces = [
    ['400Regular', 400],
    ['500Medium', 500],
    ['600SemiBold', 600],
    ['700Bold', 700],
    ['800ExtraBold', 800],
  ] as const;
  return (
    <style>
      {faces
        .map(
          ([file, weight]) =>
            `@font-face{font-family:'${FONT}';font-weight:${weight};font-display:block;src:url('${staticFile(
              `fonts/PlusJakartaSans_${file}.ttf`,
            )}') format('truetype');}`,
        )
        .join('\n')}
    </style>
  );
}

export const screen = (name: string) => staticFile(`screens/${name}.jpg`);
export const sfx = (name: string) => staticFile(`audio/sfx-${name}.wav`);

export const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** 0→1 suave entre dois quadros. */
export const ramp = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

export const pop = (frame: number, fps: number, at: number, damping = 14) =>
  spring({ frame: frame - at, fps, config: { damping, stiffness: 140, mass: 0.8 } });
