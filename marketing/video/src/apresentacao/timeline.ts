import narracao from './narracao.json';
import { FPS, layoutScenes, norm, type Scene, type Segment } from './core';

/**
 * Linha do tempo da Apresentação: trocar a voz (ElevenLabs, outra voz, outra velocidade)
 * reposiciona o vídeo inteiro sozinho.
 * `cue('agenda', 'semana')` devolve o quadro (absoluto) em que a narradora diz "Semana".
 */
export { captionLines, FPS, type Scene } from './core';

export const scenes: Scene[] = layoutScenes((narracao as { segments: Segment[] }).segments);

export const TOTAL = scenes.reduce((a, s) => a + s.len, 0);

export function scene(id: string): Scene {
  const s = scenes.find((x) => x.id === id);
  if (!s) throw new Error(`cena desconhecida: ${id}`);
  return s;
}

/** Quadro absoluto em que a palavra `word` (n-ésima ocorrência) começa a ser dita na cena `id`. */
export function cue(id: string, word: string, nth = 0): number {
  const s = scene(id);
  const target = norm(word);
  const hits = s.words.filter((w) => norm(w.w) === target);
  const hit = hits[nth];
  if (!hit) throw new Error(`palavra "${word}" (#${nth}) não encontrada na cena ${id}`);
  return s.voiceAt + Math.round(hit.t0 * FPS);
}
