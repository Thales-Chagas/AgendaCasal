import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { Background } from './components/Background';
import type { Shot } from './components/Phone';
import { PhoneStage, Sfx } from './components/Stage';
import { Logo } from './Principal';
import taps from './taps.json';
import { colors, FONT, Fonts, pop, prism } from './theme';

const T = taps as unknown as Record<string, [number, number]>;
const STEP = 75;
const INTRO = 90;
const OUTRO = 180;

type Step = { shot: string; text: string; tap?: [number, number]; zoom?: Shot['zoom'] };
type Chapter = { title: string; steps: Step[] };

/** Roteiro completo: todas as telas e funções, na ordem em que um casal usaria. */
const CHAPTERS: Chapter[] = [
  {
    title: 'Começando',
    steps: [
      { shot: '01-boas-vindas-1', text: 'Boas-vindas em três telas' },
      { shot: '02-cadastro', text: 'Crie sua conta com e-mail e senha' },
      { shot: '03-codigo', text: 'Confirme com um código de 6 números' },
      { shot: '04-comecar', text: 'Crie a agenda, entre com convite ou explore primeiro' },
    ],
  },
  {
    title: 'Conectar o casal',
    steps: [
      { shot: '05-convite', text: 'Gere o convite: código, QR Code ou link (vale 48 h)' },
      { shot: '06-entrar-com-convite', text: 'O parceiro digita o código e aceita' },
      { shot: '07-conectados-bia', text: 'A celebração aparece nos dois celulares', tap: T.aceitarConvite },
    ],
  },
  {
    title: 'Início',
    steps: [
      { shot: '10-inicio', text: 'Próximo compromisso, contagem regressiva e atalhos' },
      { shot: '10b-inicio-rolado', text: 'Os compromissos de hoje logo abaixo' },
    ],
  },
  {
    title: 'Agenda',
    steps: [
      { shot: '11-agenda-hoje', text: 'Hoje: o dia com a cor de quem é cada compromisso' },
      { shot: '11b-semana', text: 'Semana', tap: T.segSemana },
      { shot: '11c-mes', text: 'Mês, com os dias marcados', tap: T['segMês'] },
      { shot: '11d-proximos', text: 'Próximos', tap: T['segPróximos'] },
      { shot: '12-detalhe', text: 'Detalhe: quando, repetição, local e lembrete' },
      { shot: '12b-excluir-repeticao', text: 'Repete? Exclua só um dia ou todas as vezes' },
    ],
  },
  {
    title: 'Novo compromisso',
    steps: [
      { shot: '10-inicio', text: 'Tudo começa no botão +' },
      { shot: '13-criar', text: 'Compromisso, conta, nota ou data especial', tap: T.criar },
      { shot: '14b-form-preenchido', text: 'O quê, quando e de quem é: Meu, do parceiro ou Nosso', tap: T.novoCompromisso },
      { shot: '14c-form-opcoes', text: 'Mais opções: local, repetição e lembrete' },
      { shot: '14d-form-opcoes-2', text: 'Prioridade, contagem regressiva e observações' },
      { shot: '15-salvo', text: 'Salvou: aparece para vocês dois', tap: T.salvar },
      { shot: '16-rafa-ve', text: 'No celular do parceiro, em tempo real' },
    ],
  },
  {
    title: 'Notas privadas',
    steps: [
      { shot: '20-notas-vazio', text: 'Um espaço só seu: as notas não saem do celular' },
      { shot: '21-nota-editor', text: 'Escreva à vontade: salva sozinho' },
      { shot: '21b-nota-fixada', text: 'Fixe no topo', tap: T.fixar },
      { shot: '22-notas-lista', text: 'Fixadas primeiro, depois as mais recentes' },
      { shot: '23-notas-busca', text: 'Busque por qualquer palavra' },
      { shot: '24-nota-arquivada', text: 'Arquive (e desarquive quando quiser)' },
      { shot: '25-ordenar', text: 'Ordene e exporte. No celular, dá para trancar com biometria' },
    ],
  },
  {
    title: 'Finanças',
    steps: [
      { shot: '32-financas', text: 'Total do mês, o que já foi pago e o que falta' },
      { shot: '33-paga', text: 'Marque como paga com um toque', tap: T.pagarInternet },
      { shot: '34-do-casal', text: 'Filtre: todas, do casal ou só minhas' },
      { shot: '35-conta-nova', text: 'Conta do casal ou privada, mensal ou anual, com lembrete' },
      { shot: '16b-rafa-financas', text: 'Conta privada: só quem criou vê' },
    ],
  },
  {
    title: 'Datas especiais',
    steps: [
      { shot: '30-datas', text: 'Contagem regressiva para cada data' },
      { shot: '31-data-nova', text: 'Aniversário, namoro, casamento… com lembrete' },
    ],
  },
  {
    title: 'Busca',
    steps: [{ shot: '36-busca', text: 'Compromissos, datas e as suas notas, numa busca só' }],
  },
  {
    title: 'Nós e configurações',
    steps: [
      { shot: '37-nos', text: 'Nosso espaço: o casal, as datas e os ajustes' },
      { shot: '40-cor-antes', text: 'Minha conta: escolha a sua cor' },
      { shot: '40-cor-depois', text: 'Ela vale no avatar e nos compromissos', tap: T.corCoral },
      { shot: '45-foto-opcoes', text: 'Foto de perfil: galeria ou câmera' },
      { shot: '46-foto-recorte', text: 'Arraste e dê zoom para enquadrar' },
      { shot: '47-foto-pronta', text: 'Pronto: só vocês dois veem a foto' },
      { shot: '38-aparencia', text: 'Aparência: automática, clara ou escura' },
      { shot: '50-claro-inicio', text: 'O app inteiro também no tema claro' },
      { shot: '39-notificacoes', text: 'Notificações: escolha o que avisar' },
      { shot: '41-privacidade', text: 'Privacidade e exportação dos seus dados (LGPD)' },
      { shot: '42-relacionamento', text: 'Vínculo: dá para desfazer, levando uma cópia' },
      { shot: '43-ajuda', text: 'Ajuda com perguntas frequentes' },
      { shot: '44-sobre', text: 'Sobre, termos de uso e política de privacidade' },
    ],
  },
];

const chapterStarts = CHAPTERS.reduce<number[]>((acc, c, i) => {
  acc.push(i === 0 ? INTRO : acc[i - 1] + CHAPTERS[i - 1].steps.length * STEP);
  return acc;
}, []);
export const COMPLETO_FRAMES =
  INTRO + CHAPTERS.reduce((sum, c) => sum + c.steps.length * STEP, 0) + OUTRO;

function ChapterScene({ chapter, index }: { chapter: Chapter; index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = chapter.steps.length * STEP;
  const current = Math.min(chapter.steps.length - 1, Math.floor(frame / STEP));
  const shots: Shot[] = chapter.steps.map((s, i) => ({ name: s.shot, at: i * STEP, tap: s.tap, zoom: s.zoom, transition: i === 0 ? undefined : 'slide' }));
  const head = pop(frame, fps, 0, 16);
  const out = interpolate(frame, [dur - 10, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Janela de até 6 passos em volta do atual (o último capítulo tem muitos).
  const first = Math.max(0, Math.min(current - 2, chapter.steps.length - 6));
  const visible = chapter.steps.slice(first, first + 6);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div style={{ position: 'absolute', left: 130, top: 0, bottom: 0, width: 820, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: FONT }}>
        <div style={{ opacity: head, transform: `translateY(${(1 - head) * 30}px)` }}>
          <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: '0.18em', color: colors.rose }}>
            {String(index + 1).padStart(2, '0')} · {CHAPTERS.length.toString().padStart(2, '0')}
          </div>
          <div style={{ fontWeight: 800, fontSize: 76, letterSpacing: '-0.03em', color: colors.ink, margin: '10px 0 40px' }}>
            {chapter.title}
          </div>
        </div>
        {visible.map((s, vi) => {
          const i = first + vi;
          const shown = pop(frame, fps, i * STEP, 18);
          const active = i === current;
          const done = i < current;
          return (
            <div
              key={s.shot + i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 20,
                marginBottom: 22,
                opacity: frame < i * STEP ? 0.28 : (active ? 1 : 0.55) * shown + 0.28 * (1 - shown),
                transform: `translateX(${active ? 0 : 0}px)`,
              }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  marginTop: 4,
                  flexShrink: 0,
                  borderRadius: 17,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 18,
                  color: active ? '#fff' : colors.soft,
                  background: active ? prism : done ? 'rgba(255,255,255,0.14)' : 'transparent',
                  border: active || done ? 'none' : '2px solid rgba(255,255,255,0.25)',
                }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ fontWeight: active ? 700 : 500, fontSize: 34, lineHeight: 1.3, color: active ? colors.ink : colors.soft }}>{s.text}</div>
            </div>
          );
        })}
      </div>
      <PhoneStage shots={shots} side="right" enter={0} tilt={-10} />
    </AbsoluteFill>
  );
}

export function Completo() {
  const frame = useCurrentFrame();
  const end = COMPLETO_FRAMES - OUTRO;
  const fade = interpolate(frame, [COMPLETO_FRAMES - 30, COMPLETO_FRAMES], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Fonts />
      <Background energy={0.85} />
      <Sequence durationInFrames={INTRO}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Logo at={8} size={150} tagline="Demonstração completa" />
          <Sfx name="impact" at={8} volume={0.8} />
        </AbsoluteFill>
      </Sequence>
      {CHAPTERS.map((c, i) => (
        <Sequence key={c.title} from={chapterStarts[i]} durationInFrames={c.steps.length * STEP} name={c.title}>
          <ChapterScene chapter={c} index={i} />
          <Sfx name="whoosh" at={0} volume={0.4} />
        </Sequence>
      ))}
      <Sequence from={end}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - fade }}>
          <Logo at={10} size={160} tagline="A agenda de vocês dois. Experimente a dois ❤️" />
          <Sfx name="impact" at={10} volume={0.8} />
        </AbsoluteFill>
      </Sequence>
      <Audio src={staticFile('audio/music-long.wav')} volume={0.55} />
    </AbsoluteFill>
  );
}
