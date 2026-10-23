# Vídeo: motion design do DuoDay

Reel vertical (1080×1920, 30 fps, ~1 min 46 s) narrado por voz feminina, que apresenta o plano de motion design do DuoDay com a identidade do próprio app: paleta “rosé e areia” no tema escuro, Plus Jakarta Sans, telas recriadas a partir dos prints reais (Bia & Rafa) e os tokens de movimento do design-system (150/220/320 ms, escala 0.97, folhas 420/260 ms).

**Resultado:** `duoday-motion.mp4`

## Como foi feito

| Arquivo | Papel |
| --- | --- |
| `narracao.json` | Roteiro, dividido em trechos (um por cena). |
| `tts_edge.py` | Narração usada agora: voz neural pt-BR **Francisca**, com o tempo de cada palavra → `narracao.mp3` + `tempos.json`. |
| `tts.py` | Mesma coisa com a voz **Bella** da ElevenLabs. Gera os mesmos arquivos; precisa de plano pago (o gratuito bloqueia chamadas por proxy). |
| `index.html` | As cenas. `window.render(t)` desenha o quadro do instante `t`; cada animação é sincronizada com a palavra falada (`cue()`). |
| `render.mjs` | Abre a página num navegador sem tela, fotografa os quadros e junta tudo com o áudio via ffmpeg. |

## Gerar de novo

```bash
cd video
pip install edge-tts           # ou use tts.py (ElevenLabs)
python3 tts_edge.py            # narração + tempos
node render.mjs                # vídeo final (~3 min com 4 processos)
node render.mjs --frames 0,900 # só alguns quadros, em out/, para conferir
```

Requisitos: Node 18+, Playwright com Chromium, ffmpeg.
