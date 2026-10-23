#!/usr/bin/env node
// Gera a legenda WebVTT da Apresentação (para o <video> do site) com os mesmos tempos do vídeo:
//   node legendas.mjs out/duoday-apresentacao.vtt
import { readFileSync, writeFileSync } from 'node:fs';

import { captionLines, FPS, layoutScenes } from './src/apresentacao/core.ts';

const { segments } = JSON.parse(readFileSync(new URL('./src/apresentacao/narracao.json', import.meta.url), 'utf8'));
const stamp = (frame) => {
  const ms = Math.round((frame / FPS) * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`;
};
const cues = captionLines(layoutScenes(segments)).map((l, i) => `${i + 1}\n${stamp(l.from)} --> ${stamp(l.to)}\n${l.text}`);
const out = process.argv[2] ?? 'out/duoday-apresentacao.vtt';
writeFileSync(out, `WEBVTT\n\n${cues.join('\n\n')}\n`);
console.log(`${cues.length} legendas → ${out}`);
