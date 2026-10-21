import type { CSSProperties } from 'react';
import { Img, interpolate, useCurrentFrame } from 'remotion';

import { ease, ramp, screen } from '../theme';

/** Uma tela real do app exibida a partir do quadro `at` (relativo à cena). */
export type Shot = {
  name: string;
  at: number;
  /** Toque animado sobre a tela ANTERIOR, logo antes da troca (pontos de 390×844). */
  tap?: [number, number];
  /** Aproximação numa região desta tela (pontos de 390×844). */
  /** Aproximação numa região desta tela (pontos de 390×844). `hold`: já começa aproximada. */
  zoom?: { x: number; y: number; scale: number; hold?: boolean };
  transition?: 'slide' | 'fade';
};

const W = 390;
const H = 844;
const TAP_LEAD = 14;

function zoomAt(s: Shot, frame: number) {
  if (!s.zoom) return 1;
  if (s.zoom.hold) return s.zoom.scale;
  return interpolate(frame, [s.at + 8, s.at + 26], [1, s.zoom.scale], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
}

export function Phone({
  shots,
  width,
  style,
  reflect = true,
}: {
  shots: Shot[];
  width: number;
  style?: CSSProperties;
  reflect?: boolean;
}) {
  const frame = useCurrentFrame();
  const k = width / W;
  const height = H * k;
  const bezel = width * 0.035;
  const current = Math.max(0, shots.findLastIndex((s) => s.at <= frame));
  const next = shots[current + 1];

  const layer = (i: number) => {
    const s = shots[i];
    if (!s) return null;
    const enter = ramp(frame, s.at, s.at + 10);
    const leaving = shots[i + 1] && frame >= shots[i + 1].at ? ramp(frame, shots[i + 1].at, shots[i + 1].at + 10) : 0;
    const slide = (s.transition ?? 'slide') === 'slide' && i > 0;
    const z = zoomAt(s, frame);
    return (
      <div
        key={s.name + i}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: i === 0 ? 1 : slide ? 1 : enter,
          transform: `translateX(${slide ? (1 - enter) * 100 : 0}%) translateX(${-leaving * 22}%)`,
          filter: `brightness(${1 - leaving * 0.45})`,
        }}>
        <Img
          src={screen(s.name)}
          style={{
            width: '100%',
            height: '100%',
            transformOrigin: s.zoom ? `${(s.zoom.x / W) * 100}% ${(s.zoom.y / H) * 100}%` : 'center',
            transform: `scale(${z})`,
          }}
        />
      </div>
    );
  };

  // Toque: aparece sobre a tela atual pouco antes da próxima entrar.
  let tap = null;
  if (next?.tap && frame >= next.at - TAP_LEAD && frame < next.at + 6) {
    const p = (frame - (next.at - TAP_LEAD)) / (TAP_LEAD + 6);
    // Se a tela atual está aproximada, o toque acompanha a aproximação.
    const cur = shots[current];
    const z = zoomAt(cur, frame);
    const [x, y] = cur.zoom
      ? [cur.zoom.x + (next.tap[0] - cur.zoom.x) * z, cur.zoom.y + (next.tap[1] - cur.zoom.y) * z]
      : next.tap;
    const press = p < 0.45 ? 1 - p * 0.5 : 0.78 + (p - 0.45) * 0.4;
    tap = (
      <div style={{ position: 'absolute', left: x * k, top: y * k, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            width: 46 * k,
            height: 46 * k,
            left: -23 * k,
            top: -23 * k,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.55)',
            border: `${2 * k}px solid rgba(255,255,255,0.9)`,
            boxShadow: '0 0 24px rgba(255,255,255,0.6)',
            transform: `scale(${press})`,
            opacity: interpolate(p, [0, 0.15, 0.8, 1], [0, 1, 1, 0]),
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 46 * k,
            height: 46 * k,
            left: -23 * k,
            top: -23 * k,
            borderRadius: '50%',
            border: `${2 * k}px solid rgba(255,255,255,0.8)`,
            transform: `scale(${1 + Math.max(0, p - 0.4) * 3})`,
            opacity: p > 0.4 ? 1 - (p - 0.4) / 0.6 : 0,
          }}
        />
      </div>
    );
  }

  const indices = new Set([current - 1, current, current + 1].filter((i) => i >= 0 && i < shots.length && shots[i].at <= frame + 0));
  return (
    <div
      style={{
        width: width + bezel * 2,
        height: height + bezel * 2,
        padding: bezel,
        borderRadius: width * 0.16,
        background: 'linear-gradient(150deg, #4A4350 0%, #1A161E 35%, #0E0B11 65%, #3A3340 100%)',
        boxShadow: `0 ${40 * k}px ${120 * k}px rgba(0,0,0,0.65), 0 0 0 ${1.5 * k}px rgba(255,255,255,0.12), inset 0 0 0 ${2 * k}px rgba(255,255,255,0.06)`,
        WebkitBoxReflect: reflect ? `below ${10 * k}px linear-gradient(transparent 78%, rgba(255,255,255,0.14))` : undefined,
        ...style,
      }}>
      <div
        style={{
          position: 'relative',
          width,
          height,
          borderRadius: width * 0.125,
          overflow: 'hidden',
          background: '#141015',
        }}>
        {[...indices].sort((a, b) => a - b).map(layer)}
        {tap}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.0) 28%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.05) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
