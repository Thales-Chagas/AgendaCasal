"""Trilha e efeitos sonoros do vídeo, sintetizados do zero (sem amostras de terceiros).

Uso: python3 make_audio.py  → grava em ../public/audio/
- music-main.wav  (62 s, com a "pausa cômica" em 7–8 s; também serve para a versão vertical)
- music-long.wav  (duração da demonstração completa, sem pausa)
- sfx-*.wav       (toque, whoosh, scratch, ding, pop, riser, coração, impacto)
120 BPM: 1 tempo = 0,5 s, 1 compasso = 2 s.
"""
import sys
import wave
from pathlib import Path

import numpy as np
from scipy import signal

SR = 44100
BEAT = 0.5
BAR = 4 * BEAT
OUT = Path(__file__).resolve().parent.parent / "public" / "audio"
rng = np.random.default_rng(7)


def n(sec):
    return int(round(sec * SR))


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lowpass(x, hz, order=2):
    b, a = signal.butter(order, min(hz / (SR / 2), 0.99))
    return signal.lfilter(b, a, x)


def highpass(x, hz, order=2):
    b, a = signal.butter(order, hz / (SR / 2), btype="high")
    return signal.lfilter(b, a, x)


def bandpass(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], btype="band")
    return signal.lfilter(b, a, x)


def env(length, a=0.005, d=0.1, s=0.0, r=0.05):
    total = n(length)
    e = np.zeros(total)
    ia, idd = n(a), n(d)
    e[:ia] = np.linspace(0, 1, ia, endpoint=False) if ia else 1
    end_d = min(ia + idd, total)
    e[ia:end_d] = np.linspace(1, s, end_d - ia, endpoint=False) if end_d > ia else s
    e[end_d:] = s
    ir = min(n(r), total)
    if ir:
        e[-ir:] *= np.linspace(1, 0, ir)
    return e


def saw(freq, length, detune=0.0):
    t = np.arange(n(length)) / SR
    ph = rng.random()
    return 2 * ((t * freq * (1 + detune) + ph) % 1.0) - 1


def tri(freq, length):
    return 2 * np.abs(saw(freq, length)) - 1


def sine(freq, length):
    t = np.arange(n(length)) / SR
    return np.sin(2 * np.pi * freq * t)


def place(track, sound, at, gain=1.0, pan=0.0):
    i = n(at)
    if i >= track.shape[1]:
        return
    j = min(i + len(sound), track.shape[1])
    s = sound[: j - i] * gain
    left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    track[0, i:j] += s * left * 1.414
    track[1, i:j] += s * right * 1.414


def _ir_reverb(seconds=2.2, seed=0):
    """Resposta ao impulso de sala: ruído com decaimento exponencial, mais escuro no fim."""
    r = np.random.default_rng(seed)
    t = np.arange(n(seconds)) / SR
    ir = r.standard_normal(n(seconds)) * np.exp(-t * 3.2)
    ir = lowpass(ir, 6000)
    ir[: n(0.012)] = 0  # pré-atraso
    return ir / np.sqrt(np.sum(ir**2))


IRS = [_ir_reverb(seed=1), _ir_reverb(seed=2)]


def reverb(x, mix=0.25):
    wet = np.vstack([signal.fftconvolve(x[ch], IRS[ch])[: x.shape[1]] for ch in range(2)])
    return x * (1 - mix) + wet * mix * 0.6


def delay(x, sec=0.375, fb=0.35, mix=0.3):
    """Eco com realimentação, como resposta ao impulso (6 repetições), levemente estéreo."""
    out = x.copy()
    for ch, off in ((0, 0), (1, n(0.011))):
        ir = np.zeros(n(sec) * 7 + off + 1)
        for k in range(1, 7):
            ir[k * n(sec) + off] = fb ** (k - 1)
        out[ch] = x[ch] + mix * signal.fftconvolve(x[ch], ir)[: x.shape[1]]
    return out


# --- instrumentos -------------------------------------------------------------------------
def kick():
    L = 0.42
    t = np.arange(n(L)) / SR
    f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5) + 0.15 * highpass(rng.standard_normal(n(L)), 3000) * np.exp(-t * 90)


def clap():
    L = 0.25
    x = bandpass(rng.standard_normal(n(L)), 900, 4200)
    t = np.arange(n(L)) / SR
    e = np.exp(-t * 22)
    for k in (0.0, 0.011, 0.022):
        e[n(k) : n(k) + n(0.006)] += 0.6
    return x * e * 0.55


def hat(open_=False):
    L = 0.22 if open_ else 0.05
    x = highpass(rng.standard_normal(n(L)), 7000)
    t = np.arange(n(L)) / SR
    return x * np.exp(-t * (14 if open_ else 70)) * 0.35


def bass_note(m, L):
    x = saw(midi(m), L) + 0.5 * sine(midi(m - 12), L)
    return lowpass(x, 420) * env(L, 0.004, 0.08, 0.75, 0.04) * 0.5


def pad_chord(notes, L, cutoff):
    x = np.zeros(n(L))
    for m in notes:
        for dt in (-0.006, 0.0, 0.007):
            x += saw(midi(m), L, dt)
    return lowpass(x, cutoff) * env(L, 0.35, 0.3, 0.8, 0.6) * (0.09 / len(notes))


def pluck(m, L=0.28):
    x = tri(midi(m), L) * 0.7 + saw(midi(m), L) * 0.3
    return lowpass(x, 3200) * env(L, 0.002, 0.18, 0.0, 0.05) * 0.22


def bell(m, L=1.6):
    t = np.arange(n(L)) / SR
    f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3)
    return x * np.exp(-t * 2.6) * 0.25


# Progressão (dó maior, clima romântico-pop): Fmaj7 · G6 · Em7 · Am7
CHORDS = [
    ([53, 57, 60, 64], 41),
    ([55, 59, 62, 64], 43),
    ([52, 55, 59, 62], 40),
    ([57, 60, 64, 67], 45),
]
ARP = [0, 1, 2, 3, 2, 1, 2, 3]


def song(length, sections):
    """sections: lista de (início, fim, nível) — 0 = só pad, 1 = leve, 2 = completo; 'cut' silencia."""
    mix = np.zeros((2, n(length) + SR))
    duck = np.ones(n(length) + SR)
    bars = int(np.ceil(length / BAR))

    def level(t):
        for a, b, lv in sections:
            if a <= t < b:
                return lv
        return None

    k, c = kick(), clap()
    for bar in range(bars):
        t0 = bar * BAR
        notes, root = CHORDS[bar % 4]
        lv = level(t0 + 0.01)
        if lv is None or lv == "cut":
            continue
        cutoff = 900 if lv == 0 else (1800 if lv == 1 else 2600)
        place(mix, pad_chord(notes, BAR + 0.6, cutoff), t0, 1.7 if lv == 0 else 1.0)
        for i in range(8):
            ti = t0 + i * BEAT / 2
            if level(ti) in (None, "cut"):
                continue
            m = notes[ARP[i]] + 12
            place(mix, pluck(m), ti, 0.9 if lv == 0 else 0.8, pan=-0.35 if i % 2 else 0.35)
        if lv >= 1:
            for i in range(8):
                ti = t0 + i * BEAT / 2
                if level(ti) in (None, "cut"):
                    continue
                place(mix, bass_note(root, BEAT / 2 - 0.02), ti, 0.8 if lv == 2 else 0.5)
                place(mix, hat(), ti + BEAT / 4, 0.7, pan=0.2)
        if lv == 2:
            for b in range(4):
                tb = t0 + b * BEAT
                if level(tb) in (None, "cut"):
                    continue
                place(mix, k, tb, 0.95)
                duck[n(tb) : n(tb) + n(0.22)] = np.minimum(
                    duck[n(tb) : n(tb) + n(0.22)], np.linspace(0.45, 1, n(0.22))
                )
                if b in (1, 3):
                    place(mix, c, tb, 0.8, pan=0.05)
                if b == 3 and bar % 4 == 3:
                    place(mix, hat(True), tb + BEAT / 2, 0.6, pan=-0.2)
    melodic = delay(mix) * duck
    out = reverb(melodic, 0.22)[:, : n(length)]
    # Trechos "cut" ficam em silêncio de verdade (corte seco para a pausa cômica).
    for a, b, lv in sections:
        if lv == "cut":
            mask = np.ones(out.shape[1])
            ramp = n(0.015)
            mask[n(a) : n(b)] = 0
            mask[n(a) - ramp : n(a)] = np.linspace(1, 0, ramp)
            mask[n(b) : n(b) + ramp] = np.linspace(0, 1, ramp)
            out *= mask
    return out


def finish(x, fade_in=0.05, fade_out=2.5):
    x = highpass(x, 25)
    peak = np.max(np.abs(x)) or 1
    x = np.tanh(1.2 * x / peak) / np.tanh(1.2) * 0.89
    a, b = n(fade_in), n(fade_out)
    x[:, :a] *= np.linspace(0, 1, a)
    x[:, -b:] *= np.linspace(1, 0, b)
    return x


def ending(x, at):
    """Acorde final (Fmaj9 → Cmaj9) com sininhos, para o logo."""
    tail = np.zeros((2, x.shape[1]))
    place(tail, pad_chord([48, 55, 59, 62, 64], 6.0, 2400), at, 2.2)
    for i, m in enumerate([76, 79, 83, 88]):
        place(tail, bell(m, 2.5), at + 0.12 * i, 0.9, pan=-0.4 + 0.27 * i)
    place(tail, kick(), at, 0.9)
    return x + reverb(tail, 0.4)


def save(path, x):
    pcm = (np.clip(x, -1, 1).T * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("gravado", path.name, f"{x.shape[1] / SR:.1f}s")


def mono_to_st(x):
    return np.vstack([x, x])


# --- efeitos -------------------------------------------------------------------------------
def sfx():
    t = lambda L: np.arange(n(L)) / SR  # noqa: E731
    out = {}
    L = 0.06
    out["tap"] = (np.sin(2 * np.pi * 1800 * t(L)) * np.exp(-t(L) * 90) * 0.5 + bandpass(rng.standard_normal(n(L)), 2000, 6000) * np.exp(-t(L) * 120) * 0.25)
    L = 0.7
    noise = rng.standard_normal(n(L))
    sweep = np.concatenate([bandpass(noise[i : i + 2205], 300 + 5000 * (i / n(L)) ** 1.5, 600 + 9000 * (i / n(L)) ** 1.5) for i in range(0, n(L), 2205)])[: n(L)]
    out["whoosh"] = sweep * np.sin(np.pi * t(L) / L) ** 2 * 0.5
    L = 0.55
    f = 300 + 900 * np.abs(np.sin(2 * np.pi * 3.2 * t(L)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    grit = bandpass(rng.standard_normal(n(L)), 500, 3500)
    out["scratch"] = (signal.sawtooth(ph) * 0.4 + grit * 0.5) * np.minimum(1, t(L) * 40) * np.exp(-t(L) * 2.5) * 0.6
    L = 1.2
    out["ding"] = bell(88, L) * 1.4 + np.concatenate([np.zeros(n(0.09)), bell(95, L)[: n(L) - n(0.09)]]) * 1.1
    L = 0.12
    f = 500 + 700 * t(L) / L
    out["pop"] = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t(L) * 30) * 0.5
    L = 2.0
    noise = highpass(rng.standard_normal(n(L)), 2000)
    out["riser"] = noise * (t(L) / L) ** 2.2 * 0.28 + saw(220, L) * 0  # só o "shhh" subindo
    L = 1.6
    out["heart"] = sum(bell(m, L) for m in (79, 83, 86)) * 0.8
    L = 1.4
    tt = t(L)
    out["impact"] = np.sin(2 * np.pi * np.cumsum(40 + 80 * np.exp(-tt * 9)) / SR) * np.exp(-tt * 2.8) * 0.9
    for name, x in out.items():
        x = x / (np.max(np.abs(x)) or 1) * 0.8
        save(OUT / f"sfx-{name}.wav", mono_to_st(x))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    main_len = 62.0
    main = song(main_len, [(0, 4, 0), (4, 7.0, 1), (7.0, 8.0, "cut"), (8.0, 54.0, 2), (54.0, 56.0, 1)])
    main = ending(main, 56.0)
    save(OUT / "music-main.wav", finish(main, fade_out=3.0))
    long_len = float(sys.argv[1]) if len(sys.argv) > 1 else 134.0
    longer = song(long_len, [(0, 4, 0), (4, 8, 1), (8, long_len - 6, 2)])
    longer = ending(longer, long_len - 6)
    save(OUT / "music-long.wav", finish(longer, fade_out=3.0))
    sfx()
