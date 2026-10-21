import type { ReactNode } from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';

import { pop, sfx } from '../theme';
import { Phone, type Shot } from './Phone';

export type Side = 'left' | 'right' | 'center';

export function useLayout() {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  return {
    vertical,
    width,
    height,
    /** Largura da tela do celular. */
    phone: vertical ? 500 : 360,
    /** Área do texto. */
    text: vertical
      ? { left: 90, right: 90, top: 150 }
      : { left: 130, width: 760, top: 0 },
  };
}

/** Som de toque sincronizado com os toques animados das telas. */
export function TapSounds({ shots, offset = 0 }: { shots: Shot[]; offset?: number }) {
  return (
    <>
      {shots
        .filter((s) => s.tap)
        .map((s) => (
          <Sequence key={s.name + s.at} from={offset + s.at - 8} durationInFrames={10}>
            <Audio src={sfx('tap')} volume={0.55} />
          </Sequence>
        ))}
    </>
  );
}

/** Um celular entrando em cena em 3D, flutuando de leve, no lado escolhido. */
export function PhoneStage({
  shots,
  side = 'right',
  enter = 0,
  exit,
  tilt = -12,
  dx = 0,
  scale = 1,
  sound = true,
}: {
  shots: Shot[];
  side?: Side;
  enter?: number;
  exit?: number;
  tilt?: number;
  dx?: number;
  scale?: number;
  sound?: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const s = pop(frame, fps, enter, 16);
  const out = exit !== undefined ? interpolate(frame, [exit, exit + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const t = frame / fps;
  const cx = L.vertical
    ? L.width / 2 + dx
    : (side === 'right' ? L.width * 0.72 : side === 'left' ? L.width * 0.28 : L.width / 2) + dx;
  const cy = L.vertical ? L.height * 0.64 : L.height / 2;
  const ry = (L.vertical ? tilt * 0.6 : side === 'left' ? -tilt : side === 'center' ? 0 : tilt) * (1 - 0.3 * Math.sin(t * 0.8));
  return (
    <AbsoluteFill style={{ perspective: 2200, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: cx,
          top: cy,
          transform: `translate(-50%, -50%) translateY(${(1 - s) * 260 + Math.sin(t * 1.3) * 8 - out * 60}px) rotateX(${(1 - s) * 28 + 4}deg) rotateY(${ry}deg) scale(${scale * (0.86 + 0.14 * s) * (1 - out * 0.08)})`,
          opacity: Math.min(1, s * 1.4) * (1 - out),
          transformStyle: 'preserve-3d',
        }}>
        <Phone shots={shots} width={L.phone} />
      </div>
      {sound ? <TapSounds shots={shots} /> : null}
    </AbsoluteFill>
  );
}

/** Bloco de texto posicionado conforme o formato (ao lado do celular ou no topo, no vertical). */
export function TextBlock({ side = 'left', children }: { side?: 'left' | 'right'; children: ReactNode }) {
  const L = useLayout();
  if (L.vertical) {
    return <div style={{ position: 'absolute', left: L.text.left, right: L.text.right, top: L.text.top }}>{children}</div>;
  }
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 780,
        left: side === 'left' ? 120 : L.width - 120 - 780,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
      {children}
    </div>
  );
}

export function Sfx({ name, at, volume = 0.7 }: { name: string; at: number; volume?: number }) {
  return (
    <Sequence from={at} durationInFrames={90}>
      <Audio src={sfx(name)} volume={volume} />
    </Sequence>
  );
}
