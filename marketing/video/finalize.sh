#!/bin/bash
# Finaliza um MP4 do Remotion para publicação: cor yuv420p (faixa de TV, a mais compatível),
# limitador de áudio em -1 dBTP e "faststart" (começa a tocar antes de baixar tudo).
set -euo pipefail
in="$1"
out="${in%.mp4}.final.mp4"
ffmpeg -y -loglevel error -i "$in" \
  -vf "scale=in_range=full:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 18 -profile:v high -level 4.2 -r 30 \
  -af "alimiter=limit=0.891:level=false" -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart "$out"
mv "$out" "$in"
echo "finalizado: $in"
