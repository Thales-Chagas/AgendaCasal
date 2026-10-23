"""Trilha e efeitos da Apresentação, sintetizados do zero (sem amostras de terceiros).

Uso (na pasta marketing/video): python3 audio/apresentacao/trilha.py [segundos] [entrada da batida]
Sem argumentos, mede tudo pela narração (src/apresentacao/narracao.json): a duração do vídeo
(mesma conta de src/apresentacao/core.ts) e a batida entrando no "Dúo Dêi" do gancho.
Grava em public/apresentacao/som/:
- trilha.wav: pop leve e brincalhão, 112 BPM, marimba + baixo pluck + palmas e chocalho.
  Começa só com a marimba (gancho), entra a batida no "Eu sou o DuoDay" e fecha num acorde.
- pop, toque, whoosh, ding, boing, scratch, plim (efeitos curtos).
"""
import sys
import wave
from pathlib import Path

import numpy as np
from scipy import signal

SR = 44100
BPM = 112
BEAT = 60 / BPM
OUT = Path(__file__).resolve().parents[2] / "public/apresentacao/som"
rng = np.random.default_rng(11)


def n(sec):
    return int(round(sec * SR))


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(length, a=0.005, d=0.25, curve=6.0):
    t = np.arange(length) / SR
    att = np.clip(t / a, 0, 1)
    return att * np.exp(-curve * t / max(d, 1e-3))


def lowpass(x, f, order=2):
    b, a = signal.butter(order, min(f / (SR / 2), 0.99))
    return signal.lfilter(b, a, x)


def highpass(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), btype="high")
    return signal.lfilter(b, a, x)


def bandpass(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], btype="band")
    return signal.lfilter(b, a, x)


def marimba(m, dur=0.6, vel=1.0):
    L = n(dur)
    t = np.arange(L) / SR
    f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.28 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 30)
    x += 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 60)
    return x * env(L, 0.002, dur * 0.55, 5) * vel


def pluck_bass(m, dur=0.4, vel=1.0):
    L = n(dur)
    t = np.arange(L) / SR
    f = hz(m)
    x = signal.sawtooth(2 * np.pi * f * t, 0.5) * 0.6 + np.sin(2 * np.pi * f * t)
    x = lowpass(x * env(L, 0.003, dur * 0.6, 4), 900)
    return x * vel


def kick(vel=1.0):
    L = n(0.35)
    t = np.arange(L) / SR
    f = 50 + 90 * np.exp(-t * 35)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    return x * vel


def clap(vel=1.0):
    L = n(0.25)
    noise = rng.standard_normal(L)
    e = np.zeros(L)
    for k, off in enumerate([0, 0.011, 0.022]):
        s = n(off)
        e[s:] += np.exp(-np.arange(L - s) / SR * (90 if k < 2 else 22))
    return bandpass(noise * e, 900, 5000) * 0.6 * vel


def shaker(vel=1.0):
    L = n(0.09)
    x = highpass(rng.standard_normal(L), 6000) * env(L, 0.01, 0.05, 4)
    return x * 0.25 * vel


def snap(vel=1.0):
    L = n(0.12)
    x = bandpass(rng.standard_normal(L), 1800, 3800) * env(L, 0.001, 0.03, 5)
    return x * 0.8 * vel


def add(buf, x, at):
    s = n(at)
    if s >= len(buf):
        return
    e = min(len(buf), s + len(x))
    buf[s:e] += x[: e - s]


def music(total, beat_in=8.0):
    L = n(total)
    mel, bass, drums = np.zeros(L), np.zeros(L), np.zeros(L)
    # Progressão I–vi–IV–V em Dó (um acorde por compasso), melodia saltitante na pentatônica.
    chords = [(48, [60, 64, 67]), (45, [57, 60, 64]), (41, [53, 57, 60]), (43, [55, 59, 62])]
    riff = [
        [72, None, 76, 79, None, 76, 74, None],
        [72, None, 69, 72, None, 76, None, 74],
        [69, None, 72, 77, None, 76, 72, None],
        [74, None, 71, 74, 79, None, 77, 76],
    ]
    bar = 4 * BEAT
    end = total - 4.0  # o final é um acorde, sem batida
    b = 0
    while b * bar < end:
        t0 = b * bar
        root, triad = chords[b % 4]
        for k, note in enumerate(riff[b % 4]):
            if note is not None:
                add(mel, marimba(note, 0.5, 0.55 if k % 2 else 0.7), t0 + k * BEAT / 2)
        if t0 >= beat_in:
            for k in range(4):
                add(bass, pluck_bass(root if k % 2 == 0 else root + 12, BEAT * 0.9, 0.55), t0 + k * BEAT)
                add(drums, kick(0.9 if k in (0, 2) else 0.0), t0 + k * BEAT)
                if k in (1, 3):
                    add(drums, clap(0.55), t0 + k * BEAT)
                for h in range(2):
                    add(drums, shaker(0.9 if h else 0.5), t0 + k * BEAT + h * BEAT / 2)
        else:
            # Gancho: só marimba e um estalo de dedo, quase nada.
            for k in (1, 3):
                add(drums, snap(0.5), t0 + k * BEAT)
            for note in triad:
                add(bass, marimba(note - 12, bar * 0.9, 0.18), t0)
        b += 1
    # Acorde final com brilho.
    for note in [48, 60, 64, 67, 72, 76]:
        add(mel, marimba(note, 3.5, 0.45), end + 0.05)
    mix = mel * 0.5 + bass * 0.55 + drums * 0.7
    mix = lowpass(mix, 12000)
    fade = np.ones(L)
    fade[-n(1.2):] = np.linspace(1, 0, n(1.2))
    fade[: n(0.05)] = np.linspace(0, 1, n(0.05))
    return mix * fade


def sfx():
    out = {}
    L = n(0.18)
    t = np.arange(L) / SR
    f = 500 + 900 * (1 - np.exp(-t * 40))
    out["pop"] = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(L, 0.002, 0.06, 4) * 0.8
    L = n(0.08)
    out["toque"] = bandpass(rng.standard_normal(L), 2000, 6000) * env(L, 0.001, 0.015, 4) * 0.9
    L = n(0.5)
    t = np.arange(L) / SR
    noise = rng.standard_normal(L)
    sweep = np.zeros(L)
    for i in range(0, L, 256):
        c = 400 + 3000 * (i / L)
        seg = noise[i : i + 256]
        sweep[i : i + 256] = bandpass(seg, c, c * 1.8, 1)
    out["whoosh"] = sweep * np.sin(np.pi * t / t[-1]) ** 2 * 0.5
    L = n(1.2)
    t = np.arange(L) / SR
    out["ding"] = sum(np.sin(2 * np.pi * hz(m) * t) * a for m, a in [(84, 1), (91, 0.4), (96, 0.25)]) * env(L, 0.002, 0.9, 4) * 0.35
    L = n(0.55)
    t = np.arange(L) / SR
    f = 180 + 60 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 3) + 140 * np.exp(-t * 4)
    out["boing"] = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(L, 0.004, 0.45, 3) * 0.6
    L = n(0.45)
    t = np.arange(L) / SR
    f = 1200 * np.abs(np.sin(2 * np.pi * 3.2 * t)) + 150
    out["scratch"] = bandpass(rng.standard_normal(L), 300, 4000) * 0.5 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    out["scratch"] *= env(L, 0.005, 0.35, 2.5)
    L = n(0.9)
    t = np.arange(L) / SR
    out["plim"] = (marimba(84, 0.9, 0.7) + np.concatenate([np.zeros(n(0.09)), marimba(91, 0.81, 0.6)]))[:L] * 0.7
    return out


def write(name, x):
    x = np.asarray(x, dtype=np.float64)
    peak = np.max(np.abs(x)) or 1
    x = x / peak * 0.89
    stereo = np.stack([x, x], axis=1)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((stereo * 32767).astype("<i2").tobytes())


def from_narration():
    import json
    import math

    segs = json.loads((OUT.parents[2] / "src/apresentacao/narracao.json").read_text())["segments"]
    frames = sum((14 if i == 0 else 6) + math.ceil(s["dur"] * 30) + 10 for i, s in enumerate(segs)) + 84
    duo = next((w["t0"] for w in segs[0]["words"] if w["w"].lower().startswith("dúo")), 7.5)
    return frames / 30, 14 / 30 + duo


def main():
    total, beat_in = from_narration()
    if len(sys.argv) > 1:
        total = float(sys.argv[1])
    if len(sys.argv) > 2:
        beat_in = float(sys.argv[2])
    OUT.mkdir(parents=True, exist_ok=True)
    write("trilha", music(total, beat_in))
    for k, v in sfx().items():
        write(k, v)
    print("ok", total, "s →", OUT)


if __name__ == "__main__":
    main()
