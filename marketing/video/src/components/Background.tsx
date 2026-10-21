import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { colors } from '../theme';

/**
 * Palco escuro com luz prismática: três manchas de cor que derivam devagar e um feixe de luz
 * refratada que atravessa a cena. `energy` (0–1) controla a intensidade.
 */
export function Background({ energy = 1, hue = 0 }: { energy?: number; hue?: number }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 30;
  const blob = (x: number, y: number, size: number, color: string, opacity: number) => (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
        opacity: opacity * energy,
        filter: 'blur(40px)',
      }}
    />
  );
  const beamX = interpolate((frame % 240) / 240, [0, 1], [-0.6, 1.4]) * width;
  return (
    <AbsoluteFill style={{ background: colors.bg, overflow: 'hidden', filter: `hue-rotate(${hue}deg)` }}>
      {blob(width * (0.18 + 0.05 * Math.sin(t * 0.4)), height * (0.25 + 0.06 * Math.cos(t * 0.3)), width * 0.7, '#B8385A', 0.55)}
      {blob(width * (0.82 + 0.05 * Math.cos(t * 0.35)), height * (0.3 + 0.05 * Math.sin(t * 0.5)), width * 0.6, '#6D28D9', 0.45)}
      {blob(width * (0.6 + 0.08 * Math.sin(t * 0.25)), height * (0.9 + 0.04 * Math.cos(t * 0.4)), width * 0.7, '#0891B2', 0.35)}
      <div
        style={{
          position: 'absolute',
          left: beamX,
          top: -height * 0.3,
          width: width * 0.12,
          height: height * 1.6,
          transform: 'rotate(24deg)',
          background:
            'linear-gradient(90deg, transparent, rgba(103,232,249,0.10), rgba(167,139,250,0.14), rgba(240,129,158,0.12), rgba(253,186,116,0.08), transparent)',
          filter: 'blur(18px)',
          opacity: energy,
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill
        style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.65) 100%)' }}
      />
    </AbsoluteFill>
  );
}
