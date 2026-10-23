# Alternativa à ElevenLabs: voz feminina neural pt-BR (Francisca) com tempos por palavra.
import asyncio, json, os, ssl, edge_tts, edge_tts.communicate

# Usa o bundle de CA do ambiente quando existir (proxy corporativo/nuvem).
if os.path.exists("/root/.ccr/ca-bundle.crt"):
    edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
VOICE = "pt-BR-FranciscaNeural"
segs = json.load(open("narracao.json"))

async def main():
    words, offset = [], 0.0
    audio = bytearray()
    for s in segs:
        comm = edge_tts.Communicate(s["text"], VOICE, rate="+4%", boundary="WordBoundary")
        chunk = bytearray()
        seg_words = []
        async for ev in comm.stream():
            if ev["type"] == "audio":
                chunk += ev["data"]
            elif ev["type"] == "WordBoundary":
                seg_words.append({"w": ev["text"], "t0": ev["offset"] / 1e7, "t1": (ev["offset"] + ev["duration"]) / 1e7})
        open("_seg.mp3", "wb").write(chunk)
        p = await asyncio.create_subprocess_exec("ffprobe", "-v", "error", "-show_entries", "format=duration",
                                                 "-of", "csv=p=0", "_seg.mp3", stdout=asyncio.subprocess.PIPE)
        dur = float((await p.communicate())[0])
        s["t0"], s["t1"] = offset, offset + dur
        for w in seg_words:
            words.append({"w": w["w"], "t0": w["t0"] + offset, "t1": w["t1"] + offset, "seg": s["id"]})
        audio += chunk
        offset += dur
    open("narracao.mp3", "wb").write(audio)
    json.dump({"segments": segs, "words": words, "duration": offset}, open("tempos.json", "w"), ensure_ascii=False, indent=1)
    print("dur", round(offset, 2))
    for s in segs: print(s["id"], round(s["t0"], 2), round(s["t1"], 2))

asyncio.run(main())
