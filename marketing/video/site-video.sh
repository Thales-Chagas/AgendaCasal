#!/bin/bash
# Versão do vídeo para o site (duoday.com.br): H.264 1080p leve (bem abaixo do limite de 25 MB
# por arquivo da Cloudflare Pages), "faststart", capa (poster) e legenda WebVTT em site/video/.
#   ./site-video.sh out/duoday-apresentacao-16x9.mp4
set -euo pipefail
in="$1"
dest="$(dirname "$0")/../../site/video"
mkdir -p "$dest"
ffmpeg -y -loglevel error -i "$in" \
  -c:v libx264 -preset slow -crf 24 -profile:v high -level 4.1 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 128k -ar 48000 -movflags +faststart "$dest/duoday-apresentacao.mp4"
# Capa: o quadro do logo no gancho ("Eu sou o DuoDay").
ffmpeg -y -loglevel error -ss 8.6 -i "$in" -frames:v 1 -q:v 3 "$dest/duoday-apresentacao.jpg"
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$(dirname "$0")/legendas.mjs" "$dest/duoday-apresentacao.vtt"
ls -la "$dest"
