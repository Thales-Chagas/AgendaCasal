# Gera a narração com a voz feminina da ElevenLabs e grava narracao.mp3 + tempos.json
# (mesmo formato do tts_edge.py, então o render.mjs funciona com qualquer um dos dois).
# Exige plano pago: o plano gratuito recusa chamadas feitas por proxy/VPN.
import base64, json, re, sys, urllib.error, urllib.request

VOICE = "hpp4J3VqNfWAUOO0d1Us"  # Bella - Professional, Bright, Warm
segs = json.load(open("narracao.json"))
text = " ".join(s["text"] for s in segs)
body = json.dumps({
    "text": text,
    "model_id": "eleven_multilingual_v2",
    "language_code": "pt",
    "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.25, "use_speaker_boost": True},
}).encode()
req = urllib.request.Request(
    f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
    data=body, headers={"Content-Type": "application/json"})
try:
    r = json.load(urllib.request.urlopen(req))
except urllib.error.HTTPError as e:
    print(e.code, e.read().decode()[:500])
    sys.exit(1)
open("narracao.mp3", "wb").write(base64.b64decode(r["audio_base64"]))

al = r["alignment"]
chars, t0s, t1s = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
# Trecho de cada caractere, pela posição no texto completo.
bounds, pos = [], 0
for s in segs:
    bounds.append((pos, pos + len(s["text"]), s["id"]))
    pos += len(s["text"]) + 1
seg_of = lambda i: next(sid for a, b, sid in bounds if a <= i <= b)

words, cur = [], None
for i, c in enumerate(chars):
    if re.match(r"[\wÀ-ÿ'-]", c):
        if cur is None:
            cur = {"w": "", "t0": t0s[i], "seg": seg_of(i)}
        cur["w"] += c
        cur["t1"] = t1s[i]
    elif cur is not None:
        words.append(cur)
        cur = None
if cur is not None:
    words.append(cur)

for s in segs:
    ws = [w for w in words if w["seg"] == s["id"]]
    s["t0"], s["t1"] = ws[0]["t0"], ws[-1]["t1"]
for a, b in zip(segs, segs[1:]):
    a["t1"] = b["t0"] = (a["t1"] + b["t0"]) / 2
segs[0]["t0"] = 0.0
segs[-1]["t1"] = t1s[-1] + 0.4
json.dump({"segments": segs, "words": words, "duration": segs[-1]["t1"]},
          open("tempos.json", "w"), ensure_ascii=False, indent=1)
print("ok", round(segs[-1]["t1"], 2))
