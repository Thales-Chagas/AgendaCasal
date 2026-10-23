/**
 * Núcleo puro da linha do tempo (sem imports), usado pelo vídeo e pelo gerador de legendas
 * (`node legendas.mjs`). Cada cena dura o tempo da sua fala (+ respiros).
 */
export const FPS = 30;
/** Quadros antes da fala em cada cena (o primeiro é maior: o vídeo abre em silêncio). */
const PRE_FIRST = 14;
const PRE = 6;
/** Respiro depois da fala. */
const GAP = 10;
/** Final: tempo a mais com a marca na tela depois da última palavra. */
const TAIL = 84;

export type Word = { w: string; t0: number; t1: number };
export type Segment = { id: string; text: string; file: string; dur: number; words: Word[] };
export type Scene = Segment & { from: number; len: number; voiceAt: number };

export function layoutScenes(segs: Segment[]): Scene[] {
  let from = 0;
  return segs.map((s, i) => {
    const pre = i === 0 ? PRE_FIRST : PRE;
    const len = pre + Math.ceil(s.dur * FPS) + GAP + (i === segs.length - 1 ? TAIL : 0);
    const scene = { ...s, from, len, voiceAt: from + pre };
    from += len;
    return scene;
  });
}

export const norm = (w: string) =>
  w
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Legenda: a fala dividida em frases curtas, cada uma com início e fim (quadros absolutos). */
export type CaptionLine = { from: number; to: number; text: string };

export function captionLines(scenes: Scene[]): CaptionLine[] {
  const out: CaptionLine[] = [];
  for (const s of scenes) {
    // Divide a legenda em pedaços de até ~46 caracteres, quebrando em pontuação quando der.
    const parts = s.text
      .split(/(?<=[.?!…:])\s+/)
      .flatMap((p) => (p.length <= 46 ? [p] : p.split(/(?<=,)\s+/)))
      .filter((p) => norm(p).length > 0);
    const tokens = (t: string) => t.split(/\s+/).filter((x) => norm(x).length > 0).length;
    const total = parts.reduce((a, p) => a + tokens(p), 0) || 1;
    const spoken = s.words.length;
    let wi = 0;
    parts.forEach((p, i) => {
      const startWord = s.words[Math.min(spoken - 1, Math.round((wi / total) * spoken))];
      wi += tokens(p);
      const nextWord = s.words[Math.min(spoken - 1, Math.round((wi / total) * spoken))];
      const from = s.voiceAt + Math.round((startWord?.t0 ?? 0) * FPS);
      const to = i === parts.length - 1 ? s.voiceAt + Math.round(s.dur * FPS) + 4 : s.voiceAt + Math.round((nextWord?.t0 ?? s.dur) * FPS);
      out.push({ from, to, text: p });
    });
  }
  return out;
}
