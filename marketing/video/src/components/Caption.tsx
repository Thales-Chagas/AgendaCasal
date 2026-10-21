import type { CSSProperties } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { colors, FONT, pop, prism } from '../theme';

/**
 * Título animado palavra por palavra. Trechos entre *asteriscos* ganham o degradê prismático.
 * `out` (quadro local) faz o texto sair.
 */
export function Caption({
  title,
  sub,
  at = 0,
  out,
  size,
  align = 'left',
  style,
  kicker,
}: {
  title: string;
  sub?: string;
  at?: number;
  out?: number;
  size?: number;
  align?: 'left' | 'center';
  style?: CSSProperties;
  kicker?: string;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const fontSize = size ?? (vertical ? 84 : 74);
  const leave = out !== undefined ? interpolate(frame, [out, out + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;

  let word = 0;
  const parts = title.split(/(\*[^*]+\*)/).filter(Boolean);
  const rendered = parts.flatMap((part, pi) => {
    const highlight = part.startsWith('*');
    const text = highlight ? part.slice(1, -1) : part;
    return text.split(/(\s+)/).map((w, wi) => {
      if (/^\s+$/.test(w)) return <span key={`${pi}-${wi}`}>{w}</span>;
      const s = pop(frame, fps, at + word++ * 3, 15);
      return (
        <span
          key={`${pi}-${wi}`}
          style={{
            display: 'inline-block',
            transform: `translateY(${(1 - s) * 0.55}em)`,
            opacity: s,
            ...(highlight
              ? { backgroundImage: prism, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
              : {}),
          }}>
          {w}
        </span>
      );
    });
  });

  const subIn = pop(frame, fps, at + word * 3 + 4, 18);
  return (
    <div
      style={{
        fontFamily: FONT,
        textAlign: align,
        opacity: 1 - leave,
        transform: `translateY(${-leave * 30}px)`,
        filter: `blur(${leave * 8}px)`,
        ...style,
      }}>
      {kicker ? (
        <div
          style={{
            fontWeight: 700,
            fontSize: fontSize * 0.3,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: colors.rose,
            marginBottom: fontSize * 0.28,
            opacity: pop(frame, fps, at - 4, 18),
          }}>
          {kicker}
        </div>
      ) : null}
      <div style={{ fontWeight: 800, fontSize, lineHeight: 1.08, letterSpacing: '-0.025em', color: colors.ink }}>
        {rendered}
      </div>
      {sub ? (
        <div
          style={{
            marginTop: fontSize * 0.36,
            fontWeight: 500,
            fontSize: fontSize * 0.42,
            lineHeight: 1.4,
            color: colors.soft,
            opacity: subIn,
            transform: `translateY(${(1 - subIn) * 16}px)`,
          }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}
