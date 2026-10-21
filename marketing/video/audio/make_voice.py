"""Narração feminina do vídeo principal com o Kokoro (voz pf_dora, pt-BR, licença Apache 2.0).

Roda localmente, sem custo. Uso:
  pip install kokoro-onnx soundfile
  baixe kokoro-v1.0.int8.onnx e voices-v1.0.bin em audio/models/
  (https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0)
  python3 make_voice.py   → public/audio/vo-XX.wav e src/narration.json

Cada fala começa no quadro `at` (30 fps) da cena e precisa caber em `max_s` segundos;
se passar, a fala fica um pouco mais rápida (até 1,25×).
"""
import json
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
VOICE = "pf_dora"
FPS = 30

# "Dúo Dêi" é só a grafia para a voz pronunciar "DuoDay" como se fala no Brasil.
LINES = [
    (122, 2.7, "Sábado à noite. Jantar na casa da sogra."),
    (244, 3.7, "Agora vocês dois sabem. Este é o Dúo Dêi, a agenda do casal."),
    (364, 5.4, "Conectar é rápido. Um código, e a agenda de vocês vira uma só."),
    (546, 5.3, "Hoje, semana, mês ou próximos: tudo num lugar só."),
    (726, 5.4, "Criou um compromisso? Ele aparece na hora, no celular do outro."),
    (994, 2.8, "Cada um com a sua cor."),
    (1084, 5.4, "E as suas notas são só suas. Essas, ninguém mais vê."),
    (1264, 4.8, "As contas do casal ficam em dia, com aviso antes de vencer."),
    (1413, 2.9, "E as datas especiais ganham contagem regressiva."),
    (1504, 4.6, "E tem mais: busca, lembretes, tema claro ou escuro."),
    (1684, 5.0, "Dúo Dêi. Porque, eu achei que você sabia, não cola mais."),
]


def trim(x, sr, threshold=0.01):
    idx = np.where(np.abs(x) > threshold)[0]
    if len(idx) == 0:
        return x
    pad = int(0.04 * sr)
    return x[max(0, idx[0] - pad) : min(len(x), idx[-1] + pad)]


def normalize(x, target_rms_db=-19.0, peak_db=-2.0):
    rms = np.sqrt(np.mean(x**2)) or 1e-9
    y = x * (10 ** (target_rms_db / 20) / rms)
    peak = np.max(np.abs(y)) or 1e-9
    limit = 10 ** (peak_db / 20)
    return y * min(1.0, limit / peak)


def main():
    kokoro = Kokoro(str(HERE / "models/kokoro-v1.0.int8.onnx"), str(HERE / "models/voices-v1.0.bin"))
    out = []
    for i, (at, max_s, text) in enumerate(LINES, start=1):
        speed = 1.0
        while True:
            samples, sr = kokoro.create(text, voice=VOICE, speed=speed, lang="pt-br")
            samples = trim(np.asarray(samples, dtype=np.float32), sr)
            dur = len(samples) / sr
            if dur <= max_s or speed >= 1.25:
                break
            speed = round(speed + 0.05, 2)
        name = f"vo-{i:02d}.wav"
        sf.write(ROOT / "public/audio" / name, normalize(samples), sr, subtype="PCM_16")
        frames = int(np.ceil(dur * FPS))
        out.append({"file": name, "at": at, "frames": frames, "text": text, "speed": speed})
        flag = "" if dur <= max_s else "  ⚠ passou do tempo"
        print(f"{name} quadro {at:>4}  {dur:4.2f}s / {max_s}s  velocidade {speed}{flag}")
    (ROOT / "src/narration.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
