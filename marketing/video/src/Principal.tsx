import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { Background } from './components/Background';
import { Caption } from './components/Caption';
import { Phone, type Shot } from './components/Phone';
import { PhoneStage, Sfx, TapSounds, TextBlock, useLayout } from './components/Stage';
import taps from './taps.json';
import { colors, FONT, Fonts, pop, prism, ramp, screen } from './theme';

const T = taps as unknown as Record<string, [number, number]>;

/** Linha do tempo (quadros, 30 fps). A trilha `music-main.wav` foi composta nesses tempos. */
export const SCENES = {
  intro: [0, 120],
  hook: [120, 120],
  overview: [240, 120],
  connect: [360, 180],
  agenda: [540, 180],
  create: [720, 270],
  color: [990, 90],
  notes: [1080, 180],
  finance: [1260, 150],
  dates: [1410, 90],
  more: [1500, 150],
  outro: [1650, 210],
} as const;
export const PRINCIPAL_FRAMES = 1860;

function Scene({ id, children }: { id: keyof typeof SCENES; children: React.ReactNode }) {
  const [from, dur] = SCENES[id];
  return (
    <Sequence from={from} durationInFrames={dur} name={id}>
      {children}
    </Sequence>
  );
}

export function Logo({ at = 0, size = 150, tagline }: { at?: number; size?: number; tagline?: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, fps, at, 11);
  const w = pop(frame, fps, at + 12, 16);
  const g = pop(frame, fps, at + 26, 18);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONT }}>
      <div style={{ position: 'relative', transform: `scale(${s}) rotate(${(1 - s) * -12}deg)` }}>
        <div
          style={{
            position: 'absolute',
            inset: -size * 0.5,
            background: 'radial-gradient(circle, rgba(240,129,158,0.55), transparent 62%)',
            filter: 'blur(20px)',
            opacity: s,
          }}
        />
        <Img
          src={staticFile('icon.png')}
          style={{ position: 'relative', width: size, height: size, borderRadius: size * 0.24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        />
      </div>
      <div
        style={{
          marginTop: size * 0.22,
          fontWeight: 800,
          fontSize: size * 0.72,
          letterSpacing: '-0.04em',
          color: colors.ink,
          opacity: w,
          transform: `translateY(${(1 - w) * 30}px)`,
        }}>
        Duo
        <span style={{ backgroundImage: prism, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
          Day
        </span>
      </div>
      {tagline ? (
        <div
          style={{
            marginTop: size * 0.1,
            fontWeight: 500,
            fontSize: size * 0.24,
            color: colors.soft,
            opacity: g,
            transform: `translateY(${(1 - g) * 20}px)`,
            textAlign: 'center',
          }}>
          {tagline}
        </div>
      ) : null}
    </div>
  );
}

function Intro() {
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Logo at={14} size={170} tagline="A agenda de vocês dois." />
      <Sfx name="riser" at={0} volume={0.5} />
      <Sfx name="impact" at={14} volume={0.8} />
    </AbsoluteFill>
  );
}

/** Gancho com humor: o clássico "mas eu achei que você sabia" + pausa constrangedora. */
function Hook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const SCRATCH = 88;
  const frozen = frame >= SCRATCH;
  const shake = frozen && frame < SCRATCH + 8 ? Math.sin(frame * 3.1) * 10 : 0;
  const line = (text: string, at: number, size: number, color: string = colors.ink, weight = 800) => {
    const s = pop(frame, fps, at, 15);
    return (
      <div
        style={{
          fontFamily: FONT,
          fontWeight: weight,
          fontSize: size,
          color,
          letterSpacing: '-0.02em',
          opacity: s,
          transform: `translateY(${(1 - s) * 30}px)`,
          lineHeight: 1.15,
        }}>
        {text}
      </div>
    );
  };
  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: L.vertical ? 80 : 0,
        filter: frozen ? 'grayscale(0.85) contrast(1.1)' : undefined,
        transform: `translateX(${shake}px) scale(${frozen ? 1.04 : 1})`,
      }}>
      {line('Sábado, 20h.', 0, L.vertical ? 58 : 52, colors.soft, 600)}
      <div style={{ height: 18 }} />
      {line('Jantar na casa da sogra.', 18, L.vertical ? 74 : 72)}
      <div style={{ height: 46 }} />
      <div style={{ transform: frozen ? 'rotate(-2deg)' : undefined }}>
        {line('— Mas eu achei que você sabia.', 46, L.vertical ? 86 : 92, colors.rose)}
      </div>
      <div style={{ height: 40 }} />
      {frozen ? line('(silêncio constrangedor)', SCRATCH + 8, L.vertical ? 46 : 42, colors.muted, 500) : null}
      <Sfx name="scratch" at={SCRATCH - 2} volume={0.9} />
    </AbsoluteFill>
  );
}

function Overview() {
  const shots: Shot[] = [{ name: '10-inicio', at: 0 }];
  return (
    <AbsoluteFill>
      <TextBlock>
        <Caption
          kicker="Apresentando o DuoDay"
          title="Agora *vocês dois* sabem."
          sub="Compromissos, contas, datas e notas do casal. Num app só."
          at={6}
          out={110}
        />
      </TextBlock>
      <PhoneStage shots={shots} side="right" enter={2} exit={110} />
      <Sfx name="impact" at={0} volume={0.9} />
      <Sfx name="whoosh" at={0} volume={0.5} />
    </AbsoluteFill>
  );
}

/** Dois celulares lado a lado (Bia e Rafa). */
function Duo({ left, right, enter = 0, labels = ['Bia', 'Rafa'] }: { left: Shot[]; right: Shot[]; enter?: number; labels?: [string, string] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const s = pop(frame, fps, enter, 16);
  const s2 = pop(frame, fps, enter + 6, 16);
  const pw = L.vertical ? 390 : 300;
  const gap = L.vertical ? 470 : 380;
  const cx = L.vertical ? L.width / 2 : L.width * 0.68;
  const cy = L.vertical ? L.height * 0.66 : L.height / 2 + 10;
  const one = (shots: Shot[], dir: -1 | 1, sp: number, name: string) => (
    <div
      style={{
        position: 'absolute',
        left: cx + (dir * gap) / 2,
        top: cy,
        transform: `translate(-50%, -50%) translateX(${(1 - sp) * dir * 200}px) rotateY(${dir * -10}deg) scale(${0.9 + 0.1 * sp})`,
        opacity: sp,
      }}>
      <Phone shots={shots} width={pw} />
      <div style={{ marginTop: 18, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 26, color: colors.soft }}>
        {name}
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ perspective: 2000 }}>
      {one(left, -1, s, labels[0])}
      {one(right, 1, s2, labels[1])}
    </AbsoluteFill>
  );
}

function Connect() {
  const first: Shot[] = [
    { name: '05-convite', at: 0 },
    { name: '06-entrar-com-convite', at: 52 },
    { name: '07-conectados-rafa', at: 100, tap: T.aceitarConvite },
  ];
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={118}>
        <TextBlock>
          <Caption kicker="Conexão" title="Conectem em *segundos.*" sub="Convite por código, QR Code ou link. Vale por 48 horas." at={4} out={106} />
        </TextBlock>
        <PhoneStage shots={first} side="right" enter={0} exit={108} />
      </Sequence>
      <Sequence from={112}>
        <TextBlock>
          <Caption title="Pronto. A agenda *virou uma só.*" sub="A celebração aparece nos dois celulares, na hora." at={4} />
        </TextBlock>
        <Duo left={[{ name: '07-conectados-bia', at: 0 }]} right={[{ name: '07-conectados-rafa', at: 0 }]} />
        <Sfx name="heart" at={4} volume={0.7} />
      </Sequence>
      <Sfx name="whoosh" at={0} volume={0.45} />
    </AbsoluteFill>
  );
}

function Agenda() {
  const shots: Shot[] = [
    { name: '11-agenda-hoje', at: 0 },
    { name: '11b-semana', at: 42, tap: T.segSemana, transition: 'fade' },
    { name: '11c-mes', at: 84, tap: T['segMês'], transition: 'fade' },
    { name: '11d-proximos', at: 126, tap: T['segPróximos'], transition: 'fade' },
  ];
  return (
    <AbsoluteFill>
      <TextBlock side="right">
        <Caption kicker="Agenda do casal" title="Hoje, semana, mês ou *próximos.*" sub="Com repetição, lembretes e quem é o responsável." at={4} out={170} />
      </TextBlock>
      <PhoneStage shots={shots} side="left" enter={0} exit={170} />
      <Sfx name="whoosh" at={0} volume={0.45} />
    </AbsoluteFill>
  );
}

function Create() {
  const bia: Shot[] = [
    { name: '10-inicio', at: 0 },
    { name: '13-criar', at: 30, tap: T.criar, transition: 'fade' },
    { name: '14b-form-preenchido', at: 62, tap: T.novoCompromisso },
    { name: '14d-form-opcoes-2', at: 108, transition: 'fade' },
    { name: '15-salvo', at: 150, tap: T.salvar, transition: 'fade' },
  ];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const split = pop(frame, fps, 182, 18);
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={180}>
        <TextBlock>
          <Caption kicker="Novo compromisso" title="Criou, *apareceu.*" sub="Meu, do parceiro ou Nosso — com lembrete, repetição e contagem regressiva." at={4} out={172} />
        </TextBlock>
      </Sequence>
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-split * (L.vertical ? 228 : 170)}px) scale(${1 - split * (L.vertical ? 0.17 : 0.12)})` }}>
        <PhoneStage shots={bia} side="right" enter={0} sound />
      </div>
      <Sequence from={180}>
        <TextBlock>
          <Caption title="E já está no celular *do Rafa.*" sub="Em tempo real. E funciona até sem internet." at={6} out={80} />
        </TextBlock>
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${L.vertical ? 228 : 230}px) scale(${L.vertical ? 0.83 : 0.88})` }}>
          <PhoneStage shots={[{ name: '16-rafa-ve', at: 0 }]} side="right" enter={2} tilt={-18} />
        </div>
        <Sfx name="whoosh" at={0} volume={0.5} />
        <Sfx name="ding" at={14} volume={0.6} />
      </Sequence>
      <Sfx name="pop" at={150} volume={0.6} />
    </AbsoluteFill>
  );
}

function Color() {
  const shots: Shot[] = [
    { name: '40-cor-antes', at: 0 },
    { name: '40-cor-depois', at: 46, tap: T.corCoral, transition: 'fade' },
  ];
  return (
    <AbsoluteFill>
      <TextBlock side="right">
        <Caption kicker="Sua cor" title="Cada um com *a sua cor.*" sub="Escolha num seletor prismático. Vale no avatar e nos compromissos." at={2} out={82} />
      </TextBlock>
      <PhoneStage shots={shots} side="left" enter={0} exit={82} />
      <Sfx name="whoosh" at={0} volume={0.4} />
    </AbsoluteFill>
  );
}

function Notes() {
  const shots: Shot[] = [
    { name: '21-nota-editor', at: 0 },
    { name: '21b-nota-fixada', at: 56, tap: T.fixar, transition: 'fade' },
    { name: '22-notas-lista', at: 96 },
    { name: '23-notas-busca', at: 136, transition: 'fade' },
  ];
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={96}>
        <TextBlock>
          <Caption kicker="Notas privadas 🔒" title="Isso aqui *o Rafa nunca vai ver.*" sub="Suas notas ficam só no seu celular, criptografadas." at={4} out={88} />
        </TextBlock>
      </Sequence>
      <Sequence from={96}>
        <TextBlock>
          <Caption title="Fixe, busque e *arquive.*" sub="Com salvamento automático. Só você tem acesso." at={2} out={74} />
        </TextBlock>
      </Sequence>
      <PhoneStage shots={shots} side="right" enter={0} exit={170} />
      <Sfx name="whoosh" at={0} volume={0.45} />
    </AbsoluteFill>
  );
}

function Finance() {
  const shots: Shot[] = [
    { name: '32-financas', at: 0 },
    { name: '33-paga', at: 52, tap: T.pagarInternet, transition: 'fade' },
  ];
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={92}>
        <TextBlock side="right">
          <Caption kicker="Finanças" title="“Pagou a internet?” *Agora tem resposta.*" sub="Contas do casal ou só suas, com lembrete antes de vencer." at={4} out={84} />
        </TextBlock>
        <PhoneStage shots={shots} side="left" enter={0} exit={84} />
        <Sfx name="pop" at={52} volume={0.6} />
      </Sequence>
      <Sequence from={90}>
        <TextBlock side="left">
          <Caption title="Privada é *privada.*" sub="A academia do Rafa só aparece para o Rafa." at={4} />
        </TextBlock>
        <Duo left={[{ name: '33-paga', at: 0 }]} right={[{ name: '16b-rafa-financas', at: 0 }]} />
      </Sequence>
      <Sfx name="whoosh" at={0} volume={0.45} />
    </AbsoluteFill>
  );
}

function Dates() {
  return (
    <AbsoluteFill>
      <TextBlock>
        <Caption kicker="Datas especiais" title="Faltam 12 dias. *Ninguém esquece.*" sub="Aniversários e datas do casal, com contagem regressiva." at={2} out={82} />
      </TextBlock>
      <PhoneStage shots={[{ name: '30-datas', at: 0 }]} side="right" enter={0} exit={82} />
      <Sfx name="whoosh" at={0} volume={0.45} />
    </AbsoluteFill>
  );
}

const MORE: [string, string][] = [
  ['36-busca', 'Busca em tudo'],
  ['39-notificacoes', 'Lembretes do seu jeito'],
  ['50-claro-inicio', 'Tema claro ou escuro'],
  ['47-foto-pronta', 'Foto de perfil'],
  ['12b-excluir-repeticao', 'Repetições sob controle'],
  ['41-privacidade', 'Privacidade e LGPD'],
];

function More() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const cols = L.vertical ? 2 : 3;
  const cw = L.vertical ? 400 : 420;
  const ch = L.vertical ? 380 : 300;
  const gx = 40;
  const gy = L.vertical ? 70 : 60;
  const totalW = cols * cw + (cols - 1) * gx;
  const rows = Math.ceil(MORE.length / cols);
  const top = L.vertical ? 380 : (L.height - (rows * ch + (rows - 1) * gy)) / 2 + 40;
  const out = interpolate(frame, [138, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ perspective: 1800, opacity: 1 - out }}>
      <div style={{ position: 'absolute', top: L.vertical ? 170 : 70, left: 0, right: 0 }}>
        <Caption title="E tem *mais.*" align="center" at={0} size={L.vertical ? 80 : 64} />
      </div>
      {MORE.map(([name, label], i) => {
        const s = pop(frame, fps, 10 + i * 7, 15);
        const x = (L.width - totalW) / 2 + (i % cols) * (cw + gx);
        const y = top + Math.floor(i / cols) * (ch + gy);
        return (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: cw,
              transform: `translateY(${(1 - s) * 120}px) rotateX(${(1 - s) * 40}deg) scale(${0.85 + 0.15 * s})`,
              opacity: s,
            }}>
            <div
              style={{
                width: cw,
                height: ch,
                borderRadius: 28,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.14)',
                boxShadow: '0 30px 70px rgba(0,0,0,0.5)',
                background: '#141015',
              }}>
              <Img src={screen(name)} style={{ width: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            </div>
            <div style={{ marginTop: 16, fontFamily: FONT, fontWeight: 700, fontSize: L.vertical ? 34 : 30, color: colors.ink, textAlign: 'center' }}>
              {label}
            </div>
            <Sfx name="tap" at={10 + i * 7} volume={0.25} />
          </div>
        );
      })}
      <Sfx name="whoosh" at={0} volume={0.5} />
    </AbsoluteFill>
  );
}

function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const cta = pop(frame, fps, 92, 16);
  const fade = interpolate(frame, [180, 210], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const gather = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const burst = interpolate(frame, [28, 34, 60], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - fade }}>
      <div
        style={{
          position: 'absolute',
          width: 1400 * (1.6 - gather) ,
          height: 1400 * (1.6 - gather),
          borderRadius: '50%',
          border: '3px solid transparent',
          background: `conic-gradient(from ${frame * 6}deg, #67E8F9, #A78BFA, #F0819E, #FDBA74, #67E8F9)`,
          WebkitMask: 'radial-gradient(circle, transparent 68%, black 70%, transparent 74%)',
          mask: 'radial-gradient(circle, transparent 68%, black 70%, transparent 74%)',
          opacity: gather * (1 - burst) * 0.9,
          filter: 'blur(2px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.55), rgba(240,129,158,0.25) 35%, transparent 65%)',
          opacity: burst,
          transform: `scale(${0.6 + burst * 0.6})`,
        }}
      />
      <Logo
        at={30}
        size={L.vertical ? 190 : 160}
        tagline={
          <span>
            Porque “eu achei que você sabia”
            <br />
            <span style={{ backgroundImage: prism, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: 700 }}>
              não cola mais.
            </span>
          </span>
        }
      />
      <div
        style={{
          marginTop: 56,
          padding: '20px 44px',
          borderRadius: 999,
          background: colors.roseDeep,
          color: '#fff',
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: L.vertical ? 40 : 34,
          opacity: cta,
          transform: `scale(${0.9 + 0.1 * cta})`,
          boxShadow: '0 20px 50px rgba(184,56,90,0.45)',
        }}>
        Experimente a dois ❤️
      </div>
    </AbsoluteFill>
  );
}

export function Principal() {
  const frame = useCurrentFrame();
  const energy = frame < 240 ? 0.55 + 0.45 * ramp(frame, 200, 240) : 1;
  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Fonts />
      <Background energy={frame >= 208 && frame < 240 ? 0.15 : energy} />
      <Scene id="intro">
        <Intro />
      </Scene>
      <Scene id="hook">
        <Hook />
      </Scene>
      <Scene id="overview">
        <Overview />
      </Scene>
      <Scene id="connect">
        <Connect />
      </Scene>
      <Scene id="agenda">
        <Agenda />
      </Scene>
      <Scene id="create">
        <Create />
      </Scene>
      <Scene id="color">
        <Color />
      </Scene>
      <Scene id="notes">
        <Notes />
      </Scene>
      <Scene id="finance">
        <Finance />
      </Scene>
      <Scene id="dates">
        <Dates />
      </Scene>
      <Scene id="more">
        <More />
      </Scene>
      <Scene id="outro">
        <Outro />
        <Sfx name="riser" at={0} volume={0.35} />
        <Sfx name="impact" at={30} volume={0.9} />
      </Scene>
      <Audio src={staticFile('audio/music-main.wav')} volume={0.72} />
    </AbsoluteFill>
  );
}

export { TapSounds };
