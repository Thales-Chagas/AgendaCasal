import type { CSSProperties, ReactNode } from 'react';
import { Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { FONT } from '../theme';

/** Paleta "rosé e areia" do app (tema claro) e as cores das duas pessoas do casal fictício. */
export const c = {
  bg: '#FBF8F6',
  bg2: '#F5EFEB',
  line: '#EDE4DE',
  ink: '#2A1F28',
  soft: '#6B5D67',
  rose: '#B8385A',
  roseSoft: '#F9E4EA',
  bia: '#4F5BD5',
  rafa: '#0EA5A0',
  white: '#FFFFFF',
};

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ramp = (f: number, a: number, b: number, e = ease) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e });
export const win = (f: number, from: number, to: number, fade = 8) =>
  Math.min(ramp(f, from, from + fade), 1 - ramp(f, to - fade, to));
export const springIn = (f: number, at: number, fps = 30, damping = 13) =>
  spring({ frame: f - at, fps, config: { damping, stiffness: 160, mass: 0.7 } });

type Num = Record<string, number>;
/** Keyframes: segura o valor e, a partir do quadro de cada chave, transita para ela em `dur` quadros. */
export function kf<T extends Num>(f: number, keys: ([number, T] | [number, T, number])[], dur = 18): T {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [at, val, d = dur] = keys[i];
    if (f < at) break;
    const p = ramp(f, at, at + d, easeInOut);
    const mixed = { ...cur } as Num;
    for (const k of Object.keys(val)) mixed[k] = (cur[k] ?? val[k]) + (val[k] - (cur[k] ?? val[k])) * p;
    cur = mixed as T;
  }
  return cur;
}

export const shot = (name: string) => staticFile(`apresentacao/${name}.jpg`);

// ---------------------------------------------------------------------------------------------
// Celular

export const SW = 390;
export const SH = 844;

export type Cam = { cx: number; cy: number; s: number };
export const CAM0: Cam = { cx: 195, cy: 422, s: 1 };

export type PhoneShot = { at: number; img: string };
export type Tap = { at: number; x: number; y: number };
export type Mark = { from: number; to: number; x: number; y: number; w: number; h: number; r?: number };

function clampCam(cam: Cam): Cam {
  const s = Math.max(1, cam.s);
  const hw = SW / 2 / s;
  const hh = SH / 2 / s;
  return { s, cx: Math.min(SW - hw, Math.max(hw, cam.cx)), cy: Math.min(SH - hh, Math.max(hh, cam.cy)) };
}

/** Ponto da tela do app (390×844) → pixels dentro da tela do celular, com a câmera aplicada. */
export function project(cam: Cam, x: number, y: number, k: number) {
  const q = clampCam(cam);
  return [((x - q.cx) * q.s + SW / 2) * k, ((y - q.cy) * q.s + SH / 2) * k] as const;
}

export function Phone({
  width,
  shots,
  cam = CAM0,
  taps = [],
  marks = [],
  style,
  children,
}: {
  width: number;
  shots: PhoneShot[];
  cam?: Cam;
  taps?: Tap[];
  marks?: Mark[];
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const f = useCurrentFrame();
  const k = width / SW;
  const h = SH * k;
  const bezel = 11 * k;
  const q = clampCam(cam);
  const idx = Math.max(0, shots.findLastIndex((s) => s.at <= f));
  const layers = [idx - 1, idx].filter((i) => i >= 0);
  return (
    <div
      style={{
        position: 'absolute',
        width: width + bezel * 2,
        height: h + bezel * 2,
        padding: bezel,
        borderRadius: 56 * k,
        background: '#1F191E',
        boxShadow: `0 ${50 * k}px ${90 * k}px -${40 * k}px rgba(90, 30, 55, 0.45), 0 ${12 * k}px ${30 * k}px -${10 * k}px rgba(42,31,40,0.18), inset 0 0 0 ${1.5 * k}px rgba(255,255,255,0.10)`,
        ...style,
      }}>
      <div style={{ position: 'relative', width, height: h, borderRadius: 46 * k, overflow: 'hidden', background: c.bg }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: '0 0',
            transform: `translate(${(SW / 2 - q.cx * q.s) * k}px, ${(SH / 2 - q.cy * q.s) * k}px) scale(${q.s})`,
          }}>
          {layers.map((i) => {
            const s = shots[i];
            const o = i === idx ? ramp(f, s.at, s.at + 7) : 1;
            return (
              <Img
                key={s.img + s.at}
                src={shot(s.img)}
                style={{ position: 'absolute', inset: 0, width, height: h, opacity: i === 0 ? 1 : o }}
              />
            );
          })}
        </div>
        {marks.map((m, i) => {
          const o = win(f, m.from, m.to, 7);
          if (o <= 0) return null;
          const [x, y] = project(q, m.x, m.y, k);
          const pulse = 1 + 0.04 * Math.sin((f - m.from) / 4);
          const pop = springIn(f, m.from, 30, 12);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x - (m.w * q.s * k) / 2,
                top: y - (m.h * q.s * k) / 2,
                width: m.w * q.s * k,
                height: m.h * q.s * k,
                borderRadius: (m.r ?? 18) * q.s * k,
                border: `${3 * k}px solid ${c.rose}`,
                boxShadow: `0 0 0 ${6 * k}px rgba(184,56,90,0.14)`,
                opacity: o,
                transform: `scale(${(0.9 + 0.1 * pop) * pulse})`,
              }}
            />
          );
        })}
        {taps.map((t, i) => {
          const p = (f - (t.at - 8)) / 22;
          if (p < 0 || p > 1) return null;
          const [x, y] = project(q, t.x, t.y, k);
          const r = 22 * k;
          return (
            <div key={i} style={{ position: 'absolute', left: x, top: y }}>
              <div
                style={{
                  position: 'absolute',
                  left: -r,
                  top: -r,
                  width: r * 2,
                  height: r * 2,
                  borderRadius: '50%',
                  background: 'rgba(42,31,40,0.22)',
                  transform: `scale(${p < 0.35 ? 1 - p * 0.4 : 0.86})`,
                  opacity: interpolate(p, [0, 0.12, 0.6, 1], [0, 1, 1, 0]),
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: -r,
                  top: -r,
                  width: r * 2,
                  height: r * 2,
                  borderRadius: '50%',
                  border: `${2.5 * k}px solid rgba(42,31,40,0.45)`,
                  transform: `scale(${1 + Math.max(0, p - 0.3) * 2.4})`,
                  opacity: p > 0.3 ? 1 - (p - 0.3) / 0.7 : 0,
                }}
              />
            </div>
          );
        })}
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Os dois pontinhos (Bia e Rafa): mascotes mínimos, só um círculo com dois olhos.

export type Eyes = 'open' | 'happy' | 'closed' | 'wide';

export function Dot({
  x,
  y,
  size,
  color,
  eyes = 'open',
  look = 0,
  squash = 0,
  rot = 0,
  opacity = 1,
  blinkSeed = 0,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  eyes?: Eyes;
  look?: number;
  squash?: number;
  rot?: number;
  opacity?: number;
  blinkSeed?: number;
}) {
  const f = useCurrentFrame();
  const blink = (f + blinkSeed * 37) % 95 < 4 && eyes === 'open';
  const ew = size * 0.13;
  const eh = blink ? size * 0.03 : eyes === 'wide' ? size * 0.24 : size * 0.19;
  const eye = (dx: number) => {
    const base: CSSProperties = {
      position: 'absolute',
      left: size / 2 + dx * size * 0.17 + look * size * 0.1 - ew / 2,
      top: size * 0.4 - eh / 2,
      width: ew,
      height: eh,
    };
    if (eyes === 'happy')
      return (
        <div
          style={{
            ...base,
            width: ew * 1.6,
            left: (base.left as number) - ew * 0.3,
            height: ew * 0.9,
            borderTop: `${size * 0.045}px solid white`,
            borderRadius: '50% 50% 0 0',
            background: 'transparent',
          }}
        />
      );
    if (eyes === 'closed')
      return <div style={{ ...base, width: ew * 1.7, left: (base.left as number) - ew * 0.35, height: size * 0.045, top: size * 0.42, background: 'white', borderRadius: 4 }} />;
    return <div style={{ ...base, background: 'white', borderRadius: ew }} />;
  };
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 ${size * 0.18}px ${size * 0.35}px -${size * 0.12}px ${color}88, inset 0 -${size * 0.08}px ${size * 0.15}px rgba(0,0,0,0.12)`,
        transform: `rotate(${rot}deg) scale(${1 + squash * 0.18}, ${1 - squash * 0.18})`,
        transformOrigin: '50% 100%',
        opacity,
      }}>
      {eye(-1)}
      {eye(1)}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Texto

/** Título que entra palavra por palavra. Palavras entre *asteriscos* ficam no rosé. */
export function Headline({
  text,
  at,
  size,
  style,
  align = 'left',
  color = c.ink,
  out,
}: {
  text: string;
  at: number;
  size: number;
  style?: CSSProperties;
  align?: 'left' | 'center';
  color?: string;
  out?: number;
}) {
  const f = useCurrentFrame();
  const words = text.split(' ');
  const leave = out !== undefined ? ramp(f, out, out + 10) : 0;
  return (
    <div
      style={{
        position: 'absolute',
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: -size * 0.03,
        color,
        textAlign: align,
        opacity: 1 - leave,
        transform: `translateY(${-leave * 20}px)`,
        ...style,
      }}>
      {words.map((w, i) => {
        const p = ramp(f, at + i * 3, at + i * 3 + 14);
        const accent = w.startsWith('*');
        const clean = w.replace(/\*/g, '');
        if (w === '/') return <br key={i} />;
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: size * 0.08 }}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - p) * 105}%)`,
                color: accent ? c.rose : undefined,
              }}>
              {clean}
              {i < words.length - 1 && words[i + 1] !== '/' ? ' ' : ''}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function Chip({
  children,
  at,
  out,
  style,
  size = 30,
  color = c.ink,
  bg = c.white,
  dot,
}: {
  children: ReactNode;
  at: number;
  out?: number;
  style?: CSSProperties;
  size?: number;
  color?: string;
  bg?: string;
  dot?: string;
}) {
  const f = useCurrentFrame();
  const p = springIn(f, at);
  const o = Math.min(clamp01((f - at) / 4), out !== undefined ? 1 - ramp(f, out, out + 8) : 1);
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        gap: size * 0.4,
        padding: `${size * 0.42}px ${size * 0.8}px`,
        borderRadius: 999,
        background: bg,
        color,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size,
        whiteSpace: 'nowrap',
        boxShadow: '0 10px 30px -12px rgba(42,31,40,0.25), 0 0 0 1px rgba(42,31,40,0.05)',
        opacity: o,
        transform: `translateY(${(1 - p) * 18}px) scale(${0.85 + 0.15 * p})`,
        ...style,
      }}>
      {dot ? <span style={{ width: size * 0.55, height: size * 0.55, borderRadius: '50%', background: dot }} /> : null}
      {children}
    </div>
  );
}

/** Balão de conversa (para o diálogo do gancho). */
export function Bubble({
  text,
  at,
  out,
  color,
  side,
  style,
  size = 40,
}: {
  text: string;
  at: number;
  out?: number;
  color: string;
  side: 'left' | 'right';
  style?: CSSProperties;
  size?: number;
}) {
  const f = useCurrentFrame();
  const p = springIn(f, at, 30, 11);
  const o = Math.min(clamp01((f - at) / 3), out !== undefined ? 1 - ramp(f, out, out + 8) : 1);
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        padding: `${size * 0.55}px ${size * 0.8}px`,
        borderRadius: size * 0.9,
        [side === 'left' ? 'borderBottomLeftRadius' : 'borderBottomRightRadius']: size * 0.2,
        background: color,
        color: 'white',
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size,
        whiteSpace: 'nowrap',
        boxShadow: `0 20px 40px -18px ${color}`,
        opacity: o,
        transformOrigin: side === 'left' ? '0% 100%' : '100% 100%',
        transform: `scale(${0.6 + 0.4 * p})`,
        ...style,
      }}>
      {text}
    </div>
  );
}

/** "Você está aqui": mostra onde fica cada tela dentro do app. */
export function Where({ path, at, x, y, size = 30 }: { path: { from: number; label: string }[]; at: number; x: number; y: number; size?: number }) {
  const f = useCurrentFrame();
  if (f < at) return null;
  const cur = path.findLast((p) => p.from <= f) ?? path[0];
  const p = springIn(f, cur.from, 30, 14);
  const parts = cur.label.split(' › ');
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        display: 'flex',
        alignItems: 'center',
        gap: size * 0.35,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: size,
        color: c.soft,
        opacity: ramp(f, at, at + 8),
      }}>
      <svg width={size * 1.05} height={size * 1.05} viewBox="0 0 24 24" style={{ flex: 'none' }}>
        <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" fill={c.rose} />
        <circle cx="12" cy="10" r="2.6" fill="white" />
      </svg>
      {parts.map((part, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: size * 0.35 }}>
          {i > 0 ? <span style={{ opacity: 0.45 }}>›</span> : null}
          <span
            style={{
              color: i === parts.length - 1 ? c.ink : c.soft,
              display: 'inline-block',
              transform: i === parts.length - 1 ? `translateY(${(1 - p) * 10}px)` : undefined,
              opacity: i === parts.length - 1 ? p : 1,
            }}>
            {part}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Rótulo fora do celular, ligado por uma linha a um ponto da tela. */
export function Callout({
  at,
  out,
  label,
  from,
  to,
  size = 30,
  align = 'right',
}: {
  at: number;
  out: number;
  label: string;
  from: [number, number];
  to: [number, number];
  size?: number;
  align?: 'left' | 'right';
}) {
  const f = useCurrentFrame();
  const o = win(f, at, out, 7);
  if (o <= 0) return null;
  const draw = ramp(f, at, at + 12);
  const [x1, y1] = from;
  const [x2, y2] = to;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x1,
          top: y1,
          width: len * draw,
          height: 3,
          background: c.rose,
          transformOrigin: '0 50%',
          transform: `rotate(${ang}rad)`,
          opacity: o,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x2 - 9,
          top: y2 - 9,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: c.rose,
          boxShadow: '0 0 0 6px rgba(184,56,90,0.18)',
          opacity: o * clamp01((draw - 0.8) * 5),
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: y1 - size * 0.95,
          ...(align === 'right' ? { right: `calc(100% - ${x1}px)` } : { left: x1 }),
          padding: `${size * 0.45}px ${size * 0.75}px`,
          borderRadius: 999,
          background: c.white,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: size,
          color: c.ink,
          whiteSpace: 'nowrap',
          boxShadow: '0 12px 30px -14px rgba(42,31,40,0.3), 0 0 0 1px rgba(42,31,40,0.05)',
          opacity: o,
          transform: `translateX(${(1 - ramp(f, at, at + 10)) * (align === 'right' ? -16 : 16)}px)`,
        }}>
        {label}
      </div>
    </>
  );
}

export function Sfx({ at, name, volume = 0.5 }: { at: number; name: string; volume?: number }) {
  return (
    <Sequence from={Math.max(0, Math.round(at))} durationInFrames={60} layout="none">
      <Audio src={staticFile(`apresentacao/som/${name}.wav`)} volume={Math.min(1, volume * 1.8)} />
    </Sequence>
  );
}

export function useStage() {
  const { width, height } = useVideoConfig();
  return { W: width, H: height, V: height > width };
}
