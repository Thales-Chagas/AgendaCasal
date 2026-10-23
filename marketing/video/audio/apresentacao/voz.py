"""Narração feminina da Apresentação, uma fala por cena, com o tempo de cada palavra.

Uso (na pasta marketing/video):
  python3 audio/apresentacao/voz.py elevenlabs   # voz da ElevenLabs (precisa de plano pago)
  python3 audio/apresentacao/voz.py edge         # reserva grátis: voz neural pt-BR da Microsoft

Lê roteiro.json (campo `say` é o que a voz fala; `text` é a legenda) e grava
public/apresentacao/voz/<id>.mp3 e src/apresentacao/narracao.json. O vídeo se ajusta sozinho
à duração de cada fala, então dá para trocar a voz sem mexer nas cenas.

ElevenLabs: a chave vem de ELEVENLABS_API_KEY (ou do proxy da sessão na nuvem do Claude).
ELEVEN_VOICE escolhe a voz (padrão: Jessica, "Playful, Bright, Warm"); com plano pago dá para
usar uma voz brasileira da Voice Library. ELEVEN_MODEL troca o modelo (padrão eleven_multilingual_v2).
"""
import asyncio
import base64
import json
import os
import re
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / "public/apresentacao/voz"
CA = "/root/.ccr/ca-bundle.crt"

segs = json.loads((HERE / "roteiro.json").read_text(encoding="utf-8"))


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True)
    return float(out.stdout)


def loudnorm(path):
    """Deixa cada fala em -16 LUFS (volume de vídeo para web), sem mudar a duração."""
    tmp = path.with_suffix(".tmp.mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(path), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-ar", "44100", "-b:a", "192k", str(tmp)], check=True)
    tmp.replace(path)


def words_from_chars(chars, t0s, t1s):
    words, cur = [], None
    for c, a, b in zip(chars, t0s, t1s):
        if re.match(r"[\wÀ-ÿ'-]", c):
            if cur is None:
                cur = {"w": "", "t0": a}
            cur["w"] += c
            cur["t1"] = b
        elif cur is not None:
            words.append(cur)
            cur = None
    if cur is not None:
        words.append(cur)
    return words


def elevenlabs(seg, i):
    voice = os.environ.get("ELEVEN_VOICE", "cgSgspJ2msm6clMCkdW9")
    model = os.environ.get("ELEVEN_MODEL", "eleven_multilingual_v2")
    body = {
        "text": seg["say"],
        "model_id": model,
        "voice_settings": {"stability": 0.32, "similarity_boost": 0.8, "style": 0.55, "use_speaker_boost": True},
    }
    # Só os modelos Turbo/Flash aceitam fixar o idioma; o Multilingual detecta pelo texto.
    if "turbo" in model or "flash" in model:
        body["language_code"] = "pt"
    # Contexto das falas vizinhas, para a entonação continuar de uma cena para a outra.
    if i > 0:
        body["previous_text"] = segs[i - 1]["say"]
    if i + 1 < len(segs):
        body["next_text"] = segs[i + 1]["say"]
    headers = {"Content-Type": "application/json"}
    if os.environ.get("ELEVENLABS_API_KEY"):
        headers["xi-api-key"] = os.environ["ELEVENLABS_API_KEY"]
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_192",
        data=json.dumps(body).encode(), headers=headers)
    try:
        r = json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs recusou ({e.code}): {e.read().decode()[:400]}")
    path = OUT / f"{seg['id']}.mp3"
    path.write_bytes(base64.b64decode(r["audio_base64"]))
    al = r["alignment"]
    return path, words_from_chars(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"])


async def edge(seg, _i):
    import edge_tts
    import edge_tts.communicate

    if os.path.exists(CA):
        edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile=CA)
    voice = os.environ.get("EDGE_VOICE", "pt-BR-ThalitaMultilingualNeural")
    comm = edge_tts.Communicate(seg["say"], voice, rate="+10%", pitch="+4Hz", boundary="WordBoundary")
    audio, words = bytearray(), []
    async for ev in comm.stream():
        if ev["type"] == "audio":
            audio += ev["data"]
        elif ev["type"] == "WordBoundary":
            words.append({"w": ev["text"], "t0": ev["offset"] / 1e7, "t1": (ev["offset"] + ev["duration"]) / 1e7})
    path = OUT / f"{seg['id']}.mp3"
    path.write_bytes(bytes(audio))
    return path, words


def main():
    engine = sys.argv[1] if len(sys.argv) > 1 else "elevenlabs"
    OUT.mkdir(parents=True, exist_ok=True)
    result = []
    for i, seg in enumerate(segs):
        if engine == "edge":
            path, words = asyncio.run(edge(seg, i))
        else:
            path, words = elevenlabs(seg, i)
        loudnorm(path)
        dur = duration(path)
        result.append({"id": seg["id"], "text": seg["text"], "file": f"apresentacao/voz/{path.name}",
                       "dur": round(dur, 3), "words": [{**w, "t0": round(w["t0"], 3), "t1": round(w["t1"], 3)} for w in words]})
        print(f"{seg['id']:<10} {dur:5.2f}s  {len(words)} palavras")
    meta = {"engine": engine, "segments": result}
    dest = ROOT / "src/apresentacao/narracao.json"
    dest.write_text(json.dumps(meta, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("total", round(sum(s["dur"] for s in result), 2), "s ->", dest.relative_to(ROOT))


if __name__ == "__main__":
    main()
