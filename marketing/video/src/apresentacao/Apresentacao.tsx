import type { ReactNode } from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from 'remotion';

import { FONT, Fonts } from '../theme';
import taps from './taps.json';
import { captionLines, cue, scene, scenes, TOTAL } from './timeline';
import {
  Bubble,
  c,
  type Cam,
  CAM0,
  Callout,
  Chip,
  Dot,
  type Eyes,
  Headline,
  kf,
  type Mark,
  Phone,
  type PhoneShot,
  project,
  ramp,
  Sfx,
  shot,
  springIn,
  SW,
  type Tap,
  useStage,
  Where,
  win,
} from './ui';

export const APRESENTACAO_FRAMES = TOTAL;

type P = [number, number];
const T = taps as unknown as Record<string, P>;
const end = (id: string) => scene(id).from + scene(id).len;
const start = (id: string) => scene(id).from;

// ---------------------------------------------------------------------------------------------
// Roteiro visual do celular: telas, toques, destaques, câmera e "onde estou", tudo amarrado às
// palavras da narração.

type Point = { at: number; to: number; x: number; y: number; w: number; h: number; r?: number; label?: string };

function buildTrack() {
  const shots: PhoneShot[] = [];
  const tapList: Tap[] = [];
  const points: Point[] = [];
  const where: { from: number; label: string }[] = [];
  const cams: [number, Cam][] = [[0, CAM0]];
  const go = (at: number, img: string, tap?: P, label?: string) => {
    if (tap) tapList.push({ at, x: tap[0], y: tap[1] });
    shots.push({ at: tap ? at + 4 : at, img });
    if (label) where.push({ from: tap ? at + 4 : at, label });
  };
  const pt = (at: number, to: number, x: number, y: number, w: number, h: number, label?: string, r?: number) =>
    points.push({ at, to, x, y, w, h, label, r });
  const cam = (at: number, v: Partial<Cam>) => cams.push([at, { ...CAM0, ...v }]);

  // 2. O que é: o celular da Bia (o do Rafa é outro, ao lado).
  go(0, 'b10-inicio');

  // 3. Conectar
  const C = 'conectar';
  go(start(C), 'a01-comecar', undefined, 'Começar');
  go(cue(C, 'cria'), 'a02-convite', [200, 425], 'Começar › Convite');
  pt(cue(C, 'codigo'), cue(C, 'outro') - 4, 195, 242, 300, 74, 'Código');
  pt(cue(C, 'qr'), cue(C, 'outro') - 4, 195, 372, 190, 190, 'QR Code', 12);
  pt(cue(C, 'link'), cue(C, 'outro') - 4, 195, 738, 326, 58, 'Link', 16);
  go(cue(C, 'outro'), 'a03-entrar-com-convite', undefined, 'Celular do Rafa › Entrar com convite');
  tapList.push({ at: cue(C, 'aceita') + 6, x: 195, y: 803 });
  go(cue(C, 'pronto'), 'a04-conectados-rafa', undefined, 'Conectados ❤️');

  // 4. Barra de abas
  const B = 'barra';
  go(start(B), 'b10-inicio', undefined, 'Barra de abas');
  cam(cue(B, 'embaixo'), { cx: 195, cy: 844, s: 1.2 });
  const tabs: [string, string][] = [
    ['inicio', 'tab_index'],
    ['agenda', 'tab_agenda'],
    ['financas', 'tab_finance'],
    ['notas', 'tab_notes'],
    ['nos', 'tab_us'],
  ];
  tabs.forEach(([w, key], i) => {
    const at = cue(B, w);
    const next = i < tabs.length - 1 ? cue(B, tabs[i + 1][0]) : cue(B, 'lado');
    pt(at, next + 2, T[key][0], T[key][1], 56, 50, undefined, 25);
  });
  pt(cue(B, 'mais'), end(B) - 4, T.criar[0], T.criar[1], 62, 62, undefined, 31);

  // 5. Início
  const I = 'inicio';
  cam(start(I), CAM0);
  where.push({ from: start(I), label: 'Início' });
  pt(cue(I, 'proximo'), cue(I, 'falta') - 2, 165, 186, 302, 168, 'Próximo compromisso');
  pt(cue(I, 'falta'), cue(I, 'atalhos') - 2, 165, 350, 302, 72, 'Contagem para as datas');
  pt(cue(I, 'atalhos'), cue(I, 'alto') - 2, 165, 470, 302, 120, 'Atalhos');
  cam(cue(I, 'alto'), { cx: 290, cy: 60, s: 1.5 });
  pt(cue(I, 'lupa'), cue(I, 'tudo') + 6, T.buscar[0], T.buscar[1], 44, 44, 'Busca', 22);
  go(cue(I, 'tudo') + 4, 'b80-busca', T.buscar, 'Início › Buscar');
  cam(cue(I, 'tudo') + 8, CAM0);
  pt(cue(I, 'tudo') + 18, end(I) + 2, 195, 316, 310, 128, 'Achou: Dentista (de Rafa) 👀');

  // 6. Agenda
  const A = 'agenda';
  go(start(A) + 2, 'b20-agenda-hoje', T.tab_agenda, 'Agenda › Hoje');
  pt(cue(A, 'hoje'), cue(A, 'semana'), 66, 96, 80, 40, undefined, 20);
  go(cue(A, 'semana'), 'b21-semana', T.seg_Semana, 'Agenda › Semana');
  go(cue(A, 'mes'), 'b22-mes', T['seg_Mês'], 'Agenda › Mês');
  go(cue(A, 'proximos'), 'b23-proximos', T['seg_Próximos'], 'Agenda › Próximos');
  go(cue(A, 'cada'), 'b21-semana', T.seg_Semana, 'Agenda › Semana');
  cam(cue(A, 'cada') + 6, { cx: 195, cy: 600, s: 1.3 });
  go(cue(A, 'dentista'), 'b24-detalhe-dentista', [195, 560], 'Agenda › Dentista');
  cam(cue(A, 'dentista') + 2, { cx: 120, cy: 160, s: 1.9 });
  pt(cue(A, 'rafa'), end(A) - 4, 60, 140, 92, 30, 'De Rafa', 15);

  // 7. Criar pelo +
  const R = 'criar';
  go(start(R), 'b10-inicio', undefined, 'Início');
  cam(start(R), CAM0);
  go(cue(R, 'mais'), 'b30-criar', T.criar, 'Botão +');
  go(cue(R, 'novo'), 'b31-form-vazio', T.novoCompromisso, '+ › Novo compromisso');
  go(cue(R, 'diz'), 'b32-form-preenchido');
  pt(cue(R, 'seu'), cue(R, 'outro'), 72, 575, 92, 62, undefined, 14);
  pt(cue(R, 'outro'), cue(R, 'nosso'), 195, 575, 92, 62, undefined, 14);
  tapList.push({ at: cue(R, 'nosso'), x: T.nosso[0], y: T.nosso[1] });
  pt(cue(R, 'nosso'), cue(R, 'hora'), 314, 575, 92, 62, undefined, 14);
  pt(cue(R, 'hora'), cue(R, 'lembrete'), 285, 322, 160, 58, 'Hora', 14);
  go(cue(R, 'lembrete') - 2, 'b33-form-opcoes');
  pt(cue(R, 'lembrete'), cue(R, 'repeticao'), 252, 666, 122, 44, 'Lembrete', 22);
  pt(cue(R, 'repeticao'), cue(R, 'salva'), 79, 422, 126, 44, 'Repetição', 22);
  go(cue(R, 'salva'), 'b35-salvo', T.salvar, 'Início');
  pt(cue(R, 'salva') + 14, end(R) + 4, 195, 721, 360, 62, 'Salvo ✓', 16);

  // 8. Ao vivo: o celular da Bia vai para a esquerda; o do Rafa entra (fora deste track).

  // 9. Finanças
  const F = 'financas';
  go(start(F) + 2, 'b50-financas', T.tab_finance, 'Finanças');
  pt(cue(F, 'aluguel'), cue(F, 'internet'), 195, 510, 322, 62, undefined, 16);
  pt(cue(F, 'internet'), cue(F, 'streaming'), 195, 735, 322, 62, undefined, 16);
  pt(cue(F, 'streaming'), cue(F, 'casal'), 195, 660, 322, 62, undefined, 16);
  pt(cue(F, 'casal'), cue(F, 'avisa'), 195, 380, 326, 46, 'Do casal ou só suas', 14);
  pt(cue(F, 'avisa'), cue(F, 'toque'), 292, 678, 110, 28, 'Aviso antes de vencer 🔔', 14);
  go(cue(F, 'toque') + 6, 'b51-paga', T.pagarInternet);
  pt(cue(F, 'paga'), end(F) + 2, 195, 729, 350, 52, 'Paga ✓', 16);

  // 10. Notas
  const N = 'notas';
  go(start(N) + 2, 'b43-notas-lista', T.tab_notes, 'Notas');
  pt(cue(N, 'privado'), cue(N, 'parceiro'), 195, 105, 330, 82, 'Privado · só neste aparelho', 18);
  go(cue(N, 'presente'), 'b42-nota-editor', [195, 262], 'Notas › Presente surpresa 🤫');
  
  // 11. Nós
  const S = 'nos';
  cam(start(S), CAM0);
  go(start(S) + 2, 'b60-nos', T.tab_us, 'Nós');
  pt(cue(S, 'datas'), cue(S, 'configuracoes'), 195, 400, 330, 232, 'Datas especiais', 18);
  go(cue(S, 'configuracoes'), 'b61-nos-rolado', undefined, 'Nós › Configurações');
  pt(cue(S, 'cor'), cue(S, 'tema'), 195, 67, 346, 52, undefined, 14);
  pt(cue(S, 'tema'), cue(S, 'notificacoes'), 195, 125, 346, 52, undefined, 14);
  pt(cue(S, 'notificacoes'), cue(S, 'bloqueio'), 195, 181, 346, 52, undefined, 14);
  pt(cue(S, 'bloqueio'), end(S), 195, 237, 346, 52, undefined, 14);

  return { shots, tapList, points, where, cams };
}

const track = buildTrack();

// ---------------------------------------------------------------------------------------------
// Layout (horizontal 16:9 ou vertical 9:16)

function useLayout() {
  const { W, H, V } = useStage();
  return V
    ? {
        W,
        H,
        V,
        phoneW: 520,
        std: { x: W / 2, y: 1185, s: 1, r: 0, o: 1 },
        head: { x: 80, y: 250, size: 84, w: 920 },
        where: { x: 82, y: 140, size: 34 },
        chips: { x: 80, y: 520, gap: 84, size: 34 },
        cap: { y: 1838, size: 40 },
      }
    : {
        W,
        H,
        V,
        phoneW: 410,
        std: { x: 1330, y: 542, s: 1, r: 0, o: 1 },
        head: { x: 150, y: 300, size: 92, w: 860 },
        where: { x: 152, y: 150, size: 30 },
        chips: { x: 150, y: 620, gap: 92, size: 34 },
        cap: { y: 990, size: 38 },
      };
}

type Pose = { x: number; y: number; s: number; r: number; o: number };

function PhoneAt({ pose, width, children }: { pose: Pose; width: number; children: ReactNode }) {
  const k = width / SW;
  const w = width + 22 * k;
  const h = 844 * k + 22 * k;
  if (pose.o <= 0.001) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: pose.x - w / 2,
        top: pose.y - h / 2,
        width: w,
        height: h,
        opacity: pose.o,
        transform: `rotate(${pose.r}deg) scale(${pose.s})`,
      }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

export function Apresentacao({ legendas = false }: { legendas?: boolean }) {
  const f = useCurrentFrame();
  const L = useLayout();
  const { W, V } = L;

  // Pose do celular principal (o da Bia) ao longo do vídeo.
  const hidden: Pose = { ...L.std, y: L.std.y + (V ? 900 : 700), o: 0 };
  const bia2: Pose = V ? { x: 300, y: 1235, s: 0.74, r: -3, o: 1 } : { x: 1080, y: 610, s: 0.82, r: -3, o: 1 };
  const barra: Pose = V ? L.std : { ...L.std, x: 1420 };
  const bia3: Pose = V ? bia2 : { ...bia2, x: 740 };
  const nos: Pose = V ? { ...L.std, y: 1330, s: 0.8 } : L.std;
  const pose = kf<Pose>(
    f,
    [
      [0, hidden],
      [start('oque') + 2, bia2, 26],
      [start('conectar'), L.std, 24],
      [start('barra'), barra, 20],
      [start('inicio'), L.std, 20],
      [start('aovivo'), bia3, 22],
      [start('financas'), L.std, 22],
      [start('nos'), nos, 20],
      [start('final'), hidden, 24],
    ],
    20,
  );
  // O do Rafa: aparece em "o que é" e "ao vivo".
  const rafaIn: Pose = V ? { x: 780, y: 1235, s: 0.74, r: 3, o: 1 } : { x: 1560, y: 600, s: 0.82, r: 3, o: 1 };
  const rafaOut: Pose = { ...rafaIn, x: rafaIn.x + (V ? 700 : 900), o: 0 };
  const rafaPose = kf<Pose>(f, [
    [0, rafaOut],
    [start('oque') + 8, rafaIn, 26],
    [start('conectar'), rafaOut, 20],
    [start('aovivo') + 4, V ? rafaIn : { ...rafaIn, x: 1180 }, 22],
    [start('financas'), rafaOut, 20],
  ]);

  const cam = kf<Cam>(f, track.cams, 20);
  const phoneK = L.phoneW / SW;
  /** Ponto da tela do app → coordenadas do vídeo (considera câmera e pose do celular). */
  const toStage = (x: number, y: number): P => {
    const [lx, ly] = project(cam, x, y, phoneK);
    const w = L.phoneW + 22 * phoneK;
    const h = 844 * phoneK + 22 * phoneK;
    const px = lx + 11 * phoneK - w / 2;
    const py = ly + 11 * phoneK - h / 2;
    return [pose.x + px * pose.s, pose.y + py * pose.s];
  };

  const marks: Mark[] = track.points.map((p) => ({ from: p.at, to: p.to, x: p.x, y: p.y, w: p.w, h: p.h, r: p.r }));

  // Volume da trilha: abaixa enquanto a narradora fala.
  const music = (fr: number) => {
    let talk = 0;
    for (const s of scenes) talk = Math.max(talk, win(fr, s.voiceAt - 4, s.voiceAt + Math.round(s.dur * 30) + 8, 8));
    return 0.8 - 0.56 * talk;
  };

  const head = (text: string, id: string, extra: Partial<{ y: number; at: number; out: number; align: 'left' | 'center'; size: number }> = {}) => (
    <Headline
      text={text}
      at={extra.at ?? start(id) + 4}
      out={extra.out ?? end(id) - 12}
      size={extra.size ?? L.head.size}
      align={extra.align}
      style={
        extra.align === 'center'
          ? { left: 0, width: W, top: extra.y ?? L.head.y }
          : { left: L.head.x, top: extra.y ?? L.head.y, width: L.head.w }
      }
    />
  );
  const chipPos = (i: number, row = 0) =>
    V ? { left: L.chips.x + i * 300, top: L.chips.y + row * L.chips.gap } : { left: L.chips.x, top: L.chips.y + i * L.chips.gap };

  return (
    <AbsoluteFill style={{ background: c.bg, fontFamily: FONT, overflow: 'hidden' }}>
      <Fonts />
      <Backdrop />

      {/* Áudio */}
      <Audio src={staticFile('apresentacao/som/trilha.wav')} volume={music} />
      {scenes.map((s) => (
        <Sequence key={s.id} from={s.voiceAt} durationInFrames={Math.ceil(s.dur * 30) + 4} layout="none">
          <Audio src={staticFile(s.file)} volume={1} />
        </Sequence>
      ))}
      {track.tapList.map((t, i) => (
        <Sfx key={`t${i}`} at={t.at - 3} name="toque" volume={0.35} />
      ))}
      {track.points
        .filter((p) => p.label)
        .map((p, i) => (
          <Sfx key={`p${i}`} at={p.at} name="pop" volume={0.18} />
        ))}

      <Gancho />
      <OQue head={head} />

      {/* "Onde estou" no app */}
      {f >= start('conectar') && f < start('final') ? (
        <Where path={track.where} at={start('conectar') + 6} x={L.where.x} y={L.where.y} size={L.where.size} />
      ) : null}

      {/* Celular do Rafa */}
      <PhoneAt pose={rafaPose} width={L.phoneW}>
        <Phone
          width={L.phoneW}
          style={{ position: 'relative' }}
          shots={[
            { at: 0, img: 'b36-rafa-ve' },
          ]}
          marks={[{ from: cue('aovivo', 'celular'), to: end('aovivo'), x: 195, y: 186, w: 302, h: 168 }]}
        />
      </PhoneAt>

      {/* Celular principal */}
      <PhoneAt pose={pose} width={L.phoneW}>
        <Phone width={L.phoneW} style={{ position: 'relative' }} shots={track.shots} cam={cam} taps={track.tapList} marks={marks} />
      </PhoneAt>

      {/* Rótulos ligados à tela (horizontal) ou chips (vertical) */}
      {track.points
        .filter((p) => p.label)
        .map((p, i) => {
          if (f < p.at - 2 || f > p.to + 10) return null;
          const to = toStage(p.x - p.w / 2, p.y);
          if (V)
            return (
              <Chip key={i} at={p.at} out={p.to} size={34} style={{ left: 0, right: 0, margin: '0 auto', width: 'fit-content', top: 515 }}>
                {p.label}
              </Chip>
            );
          const fromX = pose.x - (L.phoneW * pose.s) / 2 - 70;
          return <Callout key={i} at={p.at} out={p.to} label={p.label!} from={[fromX, to[1]]} to={to} size={30} />;
        })}

      <Conectar head={head} chipPos={chipPos} />
      <Barra head={head} />
      <Inicio head={head} />
      <Agenda head={head} chipPos={chipPos} />
      <Criar head={head} chipPos={chipPos} />
      <AoVivo head={head} pose={pose} rafaPose={rafaPose} />
      <Financas head={head} chipPos={chipPos} />
      <Notas head={head} chipPos={chipPos} />
      <Nos head={head} />
      <Final />

      {legendas ? <Legendas y={L.cap.y} size={L.cap.size} /> : null}
    </AbsoluteFill>
  );
}

type HeadFn = (
  text: string,
  id: string,
  extra?: Partial<{ y: number; at: number; out: number; align: 'left' | 'center'; size: number }>,
) => ReactNode;
type ChipPos = (i: number, row?: number) => { left: number; top: number };

/** Fundo: areia lisa com dois círculos enormes e suaves que respiram devagar. */
function Backdrop() {
  const f = useCurrentFrame();
  const { W, H } = useStage();
  const t = f / 30;
  const blob = (x: number, y: number, r: number, color: string) => (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
      }}
    />
  );
  return (
    <AbsoluteFill>
      {blob(W * (0.78 + 0.02 * Math.sin(t * 0.3)), H * (0.42 + 0.03 * Math.cos(t * 0.25)), Math.max(W, H) * 0.42, 'rgba(249,228,234,0.9)')}
      {blob(W * (0.12 + 0.02 * Math.cos(t * 0.2)), H * (0.9 + 0.02 * Math.sin(t * 0.3)), Math.max(W, H) * 0.3, 'rgba(231,233,250,0.7)')}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------
// 1. Gancho: "Amor, você marcou o dentista?" "Que dentista?"

function Gancho() {
  const f = useCurrentFrame();
  const { W, H, V } = useStage();
  const G = 'gancho';
  const s = scene(G);
  if (f > s.from + s.len + 20) return null;
  const que = cue(G, 'que');
  const pois = cue(G, 'pois');
  const se = cue(G, 'se');
  const resp = cue(G, 'respira');
  const eu = cue(G, 'eu');
  const duo = cue(G, 'duo');
  const outAll = end(G) - 6;

  const size = V ? 150 : 130;
  const gap = V ? 190 : 220;
  const baseY = V ? H * 0.56 : H * 0.62;
  const merge = ramp(f, eu, duo, undefined);
  const enter = springIn(f, 2, 30, 12);
  const breathe = f > resp && f < eu ? Math.sin((f - resp) / 5) * 0.5 : 0;
  const hop = (at: number) => (f >= at && f < at + 14 ? Math.sin(((f - at) / 14) * Math.PI) * 30 : 0);
  const fadeDots = 1 - ramp(f, duo + 2, duo + 10);
  const biaX = W / 2 - gap * (1 - merge) - (1 - enter) * 400;
  const rafaX = W / 2 + gap * (1 - merge) + (1 - enter) * 400;
  const rafaEyes: Eyes = f >= que && f < pois + 10 ? 'wide' : f >= resp && f < eu ? 'closed' : 'open';
  const biaEyes: Eyes = f >= que + 25 && f < pois + 10 ? 'closed' : f >= resp && f < eu ? 'closed' : 'open';
  const wobble = f >= que && f < que + 30 ? Math.sin((f - que) / 2) * 8 * (1 - (f - que) / 30) : 0;
  const q = springIn(f, que + 2, 30, 9);
  const logo = springIn(f, duo, 30, 11);
  const logoOut = ramp(f, outAll, outAll + 10);

  return (
    <AbsoluteFill style={{ opacity: 1 - logoOut }}>
      <Sfx at={que} name="scratch" volume={0.55} />
      <Sfx at={duo} name="plim" volume={0.5} />
      <Sfx at={pois} name="boing" volume={0.25} />

      <Bubble
        text="Amor, você marcou o dentista? 🦷"
        at={s.voiceAt}
        out={pois}
        color={c.bia}
        side="left"
        size={V ? 38 : 42}
        style={V ? { left: 80, top: baseY - 520 } : { left: W / 2 - 560, top: baseY - 340 }}
      />
      <Bubble
        text="Que dentista? 😅"
        at={que}
        out={pois}
        color={c.rafa}
        side="right"
        size={V ? 38 : 42}
        style={V ? { right: 80, top: baseY - 360 } : { right: W / 2 - 560, top: baseY - 200 }}
      />
      {f >= que && f < pois + 8 ? (
        <div
          style={{
            position: 'absolute',
            left: rafaX + size * 0.25,
            top: baseY - size * 1.25 - q * 20,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: size * 0.6,
            color: c.rose,
            transform: `scale(${q}) rotate(${12 - q * 12}deg)`,
            opacity: 1 - ramp(f, pois, pois + 8),
          }}>
          ?
        </div>
      ) : null}

      <Headline text="Pois é." at={pois} out={se - 4} size={V ? 130 : 150} align="center" style={{ left: 0, width: W, top: V ? baseY - 520 : baseY - 380 }} />
      <Headline
        text="Se essa conversa já aconteceu aí…"
        at={se}
        out={eu - 2}
        size={V ? 56 : 64}
        align="center"
        color={c.soft}
        style={{ left: V ? 60 : 0, width: V ? W - 120 : W, top: V ? baseY - 560 : baseY - 400 }}
      />
      <Headline text="*respira.*" at={resp} out={eu - 2} size={V ? 110 : 120} align="center" style={{ left: 0, width: W, top: V ? baseY - 400 : baseY - 300 }} />

      {fadeDots > 0 ? (
        <>
          <Dot x={biaX} y={baseY - hop(s.voiceAt) - (f >= que + 25 && f < pois ? 0 : 0)} size={size * (1 - merge * 0.4)} color={c.bia} eyes={biaEyes} look={f < que ? 0.6 : f < pois ? 0.8 : 0} squash={breathe} opacity={fadeDots} />
          <Dot x={rafaX} y={baseY - hop(que)} size={size * (1 - merge * 0.4)} color={c.rafa} eyes={rafaEyes} look={f < que ? -0.6 : f < pois ? 0 : -0.3} rot={wobble} squash={breathe} opacity={fadeDots} blinkSeed={1} />
        </>
      ) : null}

      {f >= duo ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: W,
            top: baseY - (V ? 320 : 300),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
            transform: `scale(${0.6 + 0.4 * logo})`,
            opacity: Math.min(1, logo * 1.5),
          }}>
          <Img src={staticFile('icon.png')} style={{ width: V ? 230 : 210, height: V ? 230 : 210, borderRadius: V ? 56 : 50, boxShadow: '0 30px 60px -24px rgba(184,56,90,0.55)' }} />
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: V ? 120 : 110, letterSpacing: -4, color: c.ink }}>
            Duo<span style={{ color: c.rose }}>Day</span>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------
// 2. O que é

function OQue({ head }: { head: HeadFn }) {
  const f = useCurrentFrame();
  const { W, V } = useStage();
  const O = 'oque';
  if (f < start(O) - 5 || f > end(O) + 15) return null;
  const items = ['Print', 'Áudio de 3 minutos', '“Mas eu te falei”'];
  const ats = [cue(O, 'sem', 0), cue(O, 'sem', 1), cue(O, 'mas')];
  const out = end(O) - 12;
  const sync = cue(O, 'hora');
  return (
    <>
      {head(V ? 'A agenda do *casal*.' : 'A agenda / do *casal*.', O, V ? { align: 'center', y: 200 } : {})}
      {items.map((t, i) => {
        const p = springIn(f, ats[i], 30, 14);
        const strike = ramp(f, ats[i] + 8, ats[i] + 18);
        const o = Math.min(Math.min(1, (f - ats[i]) / 4), 1 - ramp(f, out, out + 8));
        if (o <= 0) return null;
        const size = V ? 46 : 52;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              ...(V ? { left: 0, width: W, textAlign: 'center' as const, top: 360 + i * 76 } : { left: 152, top: 560 + i * 92 }),
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: size,
              color: c.soft,
              opacity: o,
              transform: `translateY(${(1 - p) * 20}px)`,
            }}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span style={{ color: c.rose, marginRight: 18 }}>✕</span>
              {t}
              <span
                style={{
                  position: 'absolute',
                  left: size * 1.1,
                  top: '54%',
                  height: 5,
                  borderRadius: 3,
                  background: c.rose,
                  width: `calc(${strike * 100}% - ${size * 1.1 * strike}px)`,
                }}
              />
            </span>
            <Sfx at={ats[i]} name="pop" volume={0.3} />
          </div>
        );
      })}
      {/* Etiquetas de quem é cada celular */}
      <Chip at={start(O) + 22} out={out} dot={c.bia} size={V ? 30 : 28} style={V ? { left: 230, top: 760 } : { left: 1015, top: 160 }}>
        Bia
      </Chip>
      <Chip at={start(O) + 28} out={out} dot={c.rafa} size={V ? 30 : 28} style={V ? { left: 700, top: 760 } : { left: 1490, top: 150 }}>
        Rafa
      </Chip>
      <Chip at={sync} out={out} bg={c.rose} color="white" size={V ? 30 : 28} style={V ? { left: 0, right: 0, margin: '0 auto', width: 'fit-content', top: 1690 } : { left: 1215, top: 1000 }}>
        ⟲ mesma hora
      </Chip>
      <Sfx at={sync} name="ding" volume={0.25} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// 3. Conectar

function Conectar({ head, chipPos }: { head: HeadFn; chipPos: ChipPos }) {
  const f = useCurrentFrame();
  const { V } = useStage();
  const C = 'conectar';
  if (f < start(C) - 5 || f > end(C) + 15) return null;
  const out = end(C) - 12;
  const pronto = cue(C, 'pronto');
  const filme = cue(C, 'rapido');
  const secs = Math.max(0, f - filme) * 41 + 47 * 60 + 12;
  const mm = String(Math.floor(secs / 60) % 60).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const hop = (at: number) => (f >= at ? Math.abs(Math.sin((f - at) / 6)) * 18 * Math.max(0, 1 - (f - at) / 60) : 0);
  const dotsAt = V ? { x: 820, y: 330 } : { x: 220, y: 900 };
  return (
    <>
      {head('Um convite. / *Dois* celulares.', C, V ? { size: 76 } : {})}
      <Sfx at={pronto} name="ding" volume={0.4} />
      <Chip at={filme} out={out} size={V ? 32 : 32} style={V ? { ...chipPos(0), top: 450 } : chipPos(0)}>
        🍿 Escolhendo o filme… <span style={{ fontVariantNumeric: 'tabular-nums', color: c.rose }}>01:{mm}:{ss}</span>
      </Chip>
      {f >= pronto && f < out + 10 ? (
        <>
          <Dot x={dotsAt.x} y={dotsAt.y - hop(pronto)} size={V ? 80 : 90} color={c.bia} eyes="happy" opacity={win(f, pronto, out + 8, 6)} />
          <Dot x={dotsAt.x + (V ? 100 : 110)} y={dotsAt.y - hop(pronto + 5)} size={V ? 80 : 90} color={c.rafa} eyes="happy" opacity={win(f, pronto + 5, out + 8, 6)} />
          <div
            style={{
              position: 'absolute',
              left: dotsAt.x + (V ? 26 : 30),
              top: dotsAt.y - (V ? 110 : 120) - hop(pronto + 8),
              fontSize: V ? 48 : 52,
              transform: `scale(${springIn(f, pronto + 8, 30, 8)})`,
              opacity: win(f, pronto + 8, out + 8, 6),
            }}>
            ❤️
          </div>
        </>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// 4. Barra de abas: a barra do app ampliada, com cada aba acendendo quando é dita.

function Barra({ head }: { head: HeadFn }) {
  const f = useCurrentFrame();
  const { W, V } = useStage();
  const B = 'barra';
  if (f < start(B) - 5 || f > end(B) + 15) return null;
  const out = end(B) - 12;
  const width = V ? 920 : 820;
  const z = width / SW;
  const y0 = 768;
  const hgt = 64;
  const left = V ? 80 : 150;
  const top = V ? 455 : 600;
  const ent = springIn(f, cue(B, 'embaixo'), 30, 14);
  const o = Math.min(ramp(f, cue(B, 'embaixo'), cue(B, 'embaixo') + 8), 1 - ramp(f, out, out + 8));
  const names: [string, string, string][] = [
    ['inicio', 'tab_index', 'Início'],
    ['agenda', 'tab_agenda', 'Agenda'],
    ['financas', 'tab_finance', 'Finanças'],
    ['notas', 'tab_notes', 'Notas'],
    ['nos', 'tab_us', 'Nós'],
    ['mais', 'criar', 'Criar'],
  ];
  const active = names.findLast(([w]) => f >= cue(B, w));
  return (
    <>
      {head('5 abas / + 1 *botão*.', B)}
      <Chip at={cue(B, 'embaixo')} out={cue(B, 'cinco')} size={V ? 34 : 32} bg={c.ink} color="white" style={V ? { left: 0, right: 0, margin: '0 auto', width: 'fit-content', top: 1830 } : { left: 1180, top: 975 }}>
        ↓ lá embaixo
      </Chip>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height: hgt * z,
          opacity: o,
          transform: `translateY(${(1 - ent) * 30}px)`,
        }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 26 }}>
          <Img src={shot('b10-inicio')} style={{ position: 'absolute', left: 0, top: -y0 * z, width, height: 844 * z }} />
        </div>
        {names.map(([w, key], i) => {
          const at = cue(B, w);
          const next = i < names.length - 1 ? cue(B, names[i + 1][0]) : out;
          const on = win(f, at, w === 'mais' ? out : next + 2, 5);
          if (on <= 0) return null;
          const [x, y] = T[key];
          const r = (key === 'criar' ? 30 : 27) * z;
          const p = springIn(f, at, 30, 10);
          return (
            <div
              key={w}
              style={{
                position: 'absolute',
                left: x * z - r,
                top: (y - y0) * z - r,
                width: r * 2,
                height: r * 2,
                borderRadius: '50%',
                border: `4px solid ${c.rose}`,
                boxShadow: '0 0 0 10px rgba(184,56,90,0.14)',
                opacity: on,
                transform: `scale(${0.7 + 0.3 * p})`,
              }}
            />
          );
        })}
      </div>
      {active && !V ? (
        <div
          key={active[0]}
          style={{
            position: 'absolute',
            left: V ? 0 : left,
            width: V ? W : undefined,
            textAlign: V ? 'center' : 'left',
            top: top + hgt * z + 40,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: V ? 64 : 60,
            color: active[0] === 'mais' ? c.rose : c.ink,
            opacity: o,
            transform: `translateY(${(1 - springIn(f, cue(B, active[0]), 30, 14)) * 16}px)`,
          }}>
          {active[0] === 'mais' ? '+ cria qualquer coisa' : active[2]}
        </div>
      ) : null}
      {names.map(([w]) => (
        <Sfx key={w} at={cue(B, w)} name="toque" volume={0.3} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------------------------

function Inicio({ head }: { head: HeadFn }) {
  const f = useCurrentFrame();
  const I = 'inicio';
  if (f < start(I) - 5 || f > end(I) + 15) return null;
  return <>{head('Início: / o *resumo* do dia.', I)}</>;
}

function Agenda({ head, chipPos }: { head: HeadFn; chipPos: ChipPos }) {
  const f = useCurrentFrame();
  const { V } = useStage();
  const A = 'agenda';
  if (f < start(A) - 5 || f > end(A) + 15) return null;
  const out = end(A) - 12;
  const tava = cue(A, 'tava');
  const rafa2 = cue(A, 'rafa', 1);
  const dotY = V ? 560 : 900;
  const shrink = ramp(f, rafa2, rafa2 + 10);
  return (
    <>
      {head('Hoje, semana, / mês ou *próximos*.', A, V ? { size: 76 } : {})}
      <Chip at={cue(A, 'cor')} out={cue(A, 'dentista') - 4} dot={c.bia} size={V ? 30 : 32} style={V ? { ...chipPos(0), top: 450 } : chipPos(0)}>
        Bia
      </Chip>
      <Chip at={cue(A, 'cor') + 5} out={cue(A, 'dentista') - 4} dot={c.rafa} size={V ? 30 : 32} style={V ? { ...chipPos(1), top: 450 } : chipPos(1)}>
        Rafa
      </Chip>
      <Chip at={cue(A, 'rose')} out={cue(A, 'dentista') - 4} dot={c.rose} size={V ? 30 : 32} style={V ? { ...chipPos(2), top: 450 } : chipPos(2)}>
        Nosso (rosé)
      </Chip>
      <Sfx at={rafa2} name="boing" volume={0.4} />
      {f >= tava - 4 ? (
        <>
          <Dot
            x={V ? 200 : 260}
            y={dotY + shrink * 14}
            size={(V ? 100 : 110) * (1 - shrink * 0.25)}
            color={c.rafa}
            eyes={f >= rafa2 ? 'closed' : 'open'}
            look={0.6}
            rot={f >= rafa2 ? -10 : 0}
            opacity={win(f, tava - 4, out + 8, 6)}
          />
          <Dot x={V ? 80 : 130} y={dotY} size={V ? 100 : 110} color={c.bia} eyes="happy" look={0.8} opacity={win(f, tava, out + 8, 6)} />
          <Chip at={tava + 2} out={out} size={V ? 30 : 32} style={V ? { left: 320, top: dotY - 40 } : { left: 360, top: dotY - 40 }}>
            Tava escrito, Rafa. 🙃
          </Chip>
        </>
      ) : null}
    </>
  );
}

function Criar({ head, chipPos }: { head: HeadFn; chipPos: ChipPos }) {
  const f = useCurrentFrame();
  const { V } = useStage();
  const R = 'criar';
  if (f < start(R) - 5 || f > end(R) + 15) return null;
  const ch = (i: number, at: number, label: string, dot: string) => (
    <Chip at={at} out={cue(R, 'hora') - 2} dot={dot} size={V ? 30 : 32} style={V ? { ...chipPos(i), top: 450 } : chipPos(i)}>
      {label}
    </Chip>
  );
  return (
    <>
      {head('Tocou no *+*, / marcou.', R)}
      {ch(0, cue(R, 'seu'), 'Meu', c.bia)}
      {ch(1, cue(R, 'outro'), 'Do parceiro', c.rafa)}
      {ch(2, cue(R, 'nosso'), 'Nosso', c.rose)}
      <Sfx at={cue(R, 'salva') + 10} name="plim" volume={0.35} />
    </>
  );
}

function AoVivo({ head, pose, rafaPose }: { head: HeadFn; pose: Pose; rafaPose: Pose }) {
  const f = useCurrentFrame();
  const { V } = useStage();
  const id = 'aovivo';
  if (f < start(id) - 5 || f > end(id) + 15) return null;
  const go = cue(id, 'instante');
  const land = cue(id, 'celular');
  const p = ramp(f, go, land);
  const x = pose.x + (rafaPose.x - pose.x) * p;
  const y = (V ? 1000 : 300) - Math.sin(p * Math.PI) * (V ? 160 : 180);
  const out = end(id) - 12;
  return (
    <>
      {head(V ? 'Salvou aqui, / *apareceu* lá.' : 'Salvou aqui, *apareceu* lá.', id, V ? { align: 'center', y: 200 } : { align: 'center', y: 70, size: 76 })}
      <Sfx at={go} name="whoosh" volume={0.4} />
      <Sfx at={land} name="ding" volume={0.4} />
      {p > 0 && p < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: x - 22,
            top: y - 22,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: c.rose,
            boxShadow: '0 0 0 12px rgba(184,56,90,0.15), 0 10px 30px rgba(184,56,90,0.5)',
          }}
        />
      ) : null}
      <Chip
        at={cue(id, 'ninguem')}
        out={out}
        bg={c.ink}
        color="white"
        size={V ? 36 : 34}
        style={{
          ...(V ? { left: 0, right: 0, margin: '0 auto', width: 'fit-content', top: 1720 } : { left: 0, right: 0, margin: '0 auto', width: 'fit-content', top: 960 }),
          rotate: '-4deg',
        }}>
        Sem desculpas ✓
      </Chip>
    </>
  );
}

function Financas({ head, chipPos }: { head: HeadFn; chipPos: ChipPos }) {
  const f = useCurrentFrame();
  const { V } = useStage();
  const F = 'financas';
  if (f < start(F) - 5 || f > end(F) + 15) return null;
  const pos = (i: number) => (V ? { ...chipPos(i), top: 450 } : chipPos(i));
  return (
    <>
      {head('Contas em dia, / *sem susto*.', F, V ? { size: 80 } : {})}
      <Chip at={cue(F, 'aluguel')} out={cue(F, 'casal') - 2} size={V ? 30 : 32} style={pos(0)}>
        🏠 Aluguel
      </Chip>
      <Chip at={cue(F, 'internet')} out={cue(F, 'casal') - 2} size={V ? 30 : 32} style={V ? { ...pos(1), left: 340 } : pos(1)}>
        📶 Internet
      </Chip>
      <Chip at={cue(F, 'streaming')} out={cue(F, 'casal') - 2} size={V ? 30 : 32} style={V ? { left: 80, top: 540 } : pos(2)}>
        📺 Streaming · assistido: <span style={{ color: c.rose }}>0 h</span>
      </Chip>
      <Sfx at={cue(F, 'paga')} name="plim" volume={0.4} />
    </>
  );
}

function Notas({ head, chipPos }: { head: HeadFn; chipPos: ChipPos }) {
  const f = useCurrentFrame();
  const { V } = useStage();
  const N = 'notas';
  if (f < start(N) - 5 || f > end(N) + 15) return null;
  const out = end(N) - 12;
  const parc = cue(N, 'parceiro');
  const pres = cue(N, 'presente');
  const dotY = V ? 560 : 900;
  const giggle = f > pres ? Math.abs(Math.sin((f - pres) / 3)) * 0.4 * Math.max(0, 1 - (f - pres) / 45) : 0;
  return (
    <>
      {head('Só seu. / *Só* aqui.', N)}
      <Chip at={cue(N, 'criptografado')} out={parc - 2} size={V ? 30 : 32} style={V ? { ...chipPos(0), top: 450 } : chipPos(0)}>
        🔒 Criptografado
      </Chip>
      {f >= parc - 4 ? (
        <>
          <Dot x={V ? 140 : 200} y={dotY} size={V ? 100 : 110} color={c.rafa} eyes="closed" opacity={win(f, parc, out + 8, 6)} />
          <Chip at={parc + 2} out={pres - 2} size={V ? 30 : 32} style={V ? { left: 230, top: dotY - 40 } : { left: 300, top: dotY - 40 }}>
            O Rafa não vê 🙈
          </Chip>
          <Dot x={V ? 140 + 0 : 200} y={dotY - 0} size={V ? 100 : 110} color={c.bia} eyes="happy" squash={giggle} opacity={win(f, pres, out + 8, 6)} />
          <Chip at={pres + 4} out={out} size={V ? 30 : 32} style={V ? { left: 230, top: dotY - 40 } : { left: 300, top: dotY - 40 }}>
            Shhh… 🤫
          </Chip>
        </>
      ) : null}
    </>
  );
}

/** Nós: miniaturas das telas de configuração saem do celular quando cada uma é citada. */
function Nos({ head }: { head: HeadFn }) {
  const f = useCurrentFrame();
  const { V } = useStage();
  const S = 'nos';
  if (f < start(S) - 5 || f > end(S) + 15) return null;
  const out = end(S) - 12;
  const peeks: [string, string, string][] = [
    ['cor', 'b73-cor-depois', 'Sua cor'],
    ['foto', 'b70-foto-recorte', 'Sua foto'],
    ['tema', 'b63-aparencia', 'Tema'],
    ['digital', 'b65-seguranca', 'Digital ou rosto'],
  ];
  const w = V ? 170 : 180;
  const h = (w * 844) / 390;
  return (
    <>
      {head('Nós: datas / e *ajustes*.', S, V ? { size: 80 } : {})}
      {peeks.map(([word, img, label], i) => {
        const at = cue(S, word);
        const p = springIn(f, at, 30, 13);
        const o = Math.min(Math.min(1, (f - at) / 4), 1 - ramp(f, out, out + 8));
        if (o <= 0) return null;
        const left = V ? 110 + i * (w + 40) : 150 + i * (w + 30);
        const top = V ? 430 : 560;
        return (
          <div key={word} style={{ position: 'absolute', left, top, width: w, opacity: o, transform: `translateY(${(1 - p) * 40}px) scale(${0.85 + 0.15 * p})` }}>
            <div style={{ width: w, height: h, borderRadius: 22, overflow: 'hidden', boxShadow: '0 20px 40px -20px rgba(42,31,40,0.45), 0 0 0 1px rgba(42,31,40,0.08)', background: c.white }}>
              <Img src={shot(img)} style={{ width: w, height: h }} />
            </div>
            <div style={{ marginTop: 14, fontFamily: FONT, fontWeight: 700, fontSize: V ? 26 : 26, color: c.ink, textAlign: 'center' }}>{label}</div>
            <Sfx at={at} name="pop" volume={0.25} />
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// 12. Final

function Final() {
  const f = useCurrentFrame();
  const { W, H, V } = useStage();
  const id = 'final';
  if (f < start(id) - 5) return null;
  const s = scene(id);
  const logo = springIn(f, s.voiceAt - 2, 30, 12);
  const nunca = cue(id, 'nunca');
  const que = cue(id, 'que');
  const dent = cue(id, 'dentista');
  const dotsIn = springIn(f, nunca, 30, 12);
  const bonk = dent + 14;
  const bonkP = f >= bonk ? Math.sin(Math.min(1, (f - bonk) / 10) * Math.PI) : 0;
  const cy = V ? H * 0.4 : H * 0.4;
  const fadeEnd = 1 - ramp(f, TOTAL - 20, TOTAL - 2);
  const gap = V ? 300 : 420;
  return (
    <AbsoluteFill style={{ opacity: fadeEnd }}>
      <Sfx at={bonk} name="boing" volume={0.45} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: W,
          top: cy - (V ? 260 : 250),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `scale(${0.7 + 0.3 * logo})`,
          opacity: Math.min(1, logo * 1.4),
        }}>
        <Img src={staticFile('icon.png')} style={{ width: V ? 200 : 170, height: V ? 200 : 170, borderRadius: V ? 48 : 40, boxShadow: '0 30px 60px -24px rgba(184,56,90,0.55)' }} />
        <div style={{ marginTop: 22, fontFamily: FONT, fontWeight: 800, fontSize: V ? 120 : 112, letterSpacing: -4, color: c.ink, lineHeight: 1 }}>
          Duo<span style={{ color: c.rose }}>Day</span>
        </div>
      </div>
      <Headline text="Vocês dois, na mesma página." at={cue(id, 'voces')} size={V ? 54 : 56} align="center" color={c.soft} style={{ left: V ? 40 : 0, width: V ? W - 80 : W, top: cy + (V ? 120 : 110) }} />
      <div style={{ position: 'absolute', left: 0, width: W, top: cy + (V ? 290 : 220), display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
        {(
          [
            ['Grátis', cue(id, 'gratis')],
            ['Android', cue(id, 'gratis') + 6],
            ['iPhone (pelo navegador)', cue(id, 'gratis') + 12],
          ] as [string, number][]
        ).map(([t, at]) => (
          <Chip key={t} at={at} size={V ? 34 : 32} style={{ position: 'relative' }}>
            {t}
          </Chip>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: W,
          textAlign: 'center',
          top: cy + (V ? 420 : 330),
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: V ? 48 : 44,
          color: c.rose,
          opacity: ramp(f, cue(id, 'instala'), cue(id, 'instala') + 10),
        }}>
        duoday.com.br
      </div>
      {f >= nunca ? (
        <>
          <Dot x={W / 2 - gap - (1 - dotsIn) * 300} y={cy - 60 + bonkP * 10} size={V ? 110 : 120} color={c.bia} eyes={f >= bonk ? 'happy' : 'open'} look={0.6} squash={bonkP * 0.6} />
          <Dot x={W / 2 + gap + (1 - dotsIn) * 300} y={cy - 60} size={V ? 110 : 120} color={c.rafa} eyes={f >= que && f < bonk + 30 ? 'wide' : 'happy'} look={-0.6} rot={bonkP * -12} blinkSeed={2} />
          <Bubble
            text="Que dentista? 😅"
            at={que}
            out={bonk + 24}
            color={c.rafa}
            side="right"
            size={V ? 32 : 34}
            style={{ right: W / 2 - gap - (V ? 40 : 60), top: cy - (V ? 230 : 230) }}
          />
        </>
      ) : null}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------

const lines = captionLines(scenes);

function Legendas({ y, size }: { y: number; size: number }) {
  const f = useCurrentFrame();
  const { W } = useStage();
  const line = lines.find((l) => f >= l.from && f < l.to);
  if (!line) return null;
  const o = win(f, line.from, line.to, 4);
  return (
    <div style={{ position: 'absolute', left: 0, width: W, top: y - size, display: 'flex', justifyContent: 'center', opacity: o }}>
      <div
        style={{
          maxWidth: W * 0.8,
          padding: `${size * 0.3}px ${size * 0.7}px`,
          borderRadius: size * 0.5,
          background: 'rgba(42,31,40,0.86)',
          color: 'white',
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: size,
          textAlign: 'center',
          lineHeight: 1.25,
        }}>
        {line.text}
      </div>
    </div>
  );
}

