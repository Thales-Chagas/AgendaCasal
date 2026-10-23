// Renderiza index.html quadro a quadro (navegador sem tela) e junta com ffmpeg.
// Uso: node render.mjs [--frames 0,90,300] [--workers 4]
import { createRequire } from "module";
import { spawn, execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const globalRoot = execFileSync("npm", ["root", "-g"]).toString().trim();
const { chromium } = require(path.join(globalRoot, "playwright"));

const dir = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const tempos = JSON.parse(fs.readFileSync(path.join(dir, "tempos.json"), "utf8"));
const total = Math.ceil((tempos.duration + 0.6) * FPS);
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const stills = opt("--frames", null);
const workers = +opt("--workers", 4);
const out = path.join(dir, "out");
fs.mkdirSync(out, { recursive: true });

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", (e) => { console.error("pageerror:", e.message); process.exit(1); });
  await page.addInitScript(`window.TEMPOS = ${JSON.stringify(tempos)};`);
  await page.goto("file://" + path.join(dir, "index.html"));
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
if (stills) {
  const page = await openPage(browser);
  for (const f of stills.split(",").map(Number)) {
    await page.evaluate((t) => window.render(t), f / FPS);
    await page.screenshot({ path: path.join(out, `still_${String(f).padStart(5, "0")}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const per = Math.ceil(total / workers);
const t0 = Date.now();
await Promise.all([...Array(workers)].map(async (_, w) => {
  const a = w * per, b = Math.min(total, a + per);
  const page = await openPage(browser);
  const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", path.join(out, `part${w}.mp4`)],
    { stdio: ["pipe", "inherit", "inherit"] });
  for (let f = a; f < b; f++) {
    await page.evaluate((t) => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (w === 0 && (f - a) % 150 === 0) console.log(`~${Math.round((f - a) / (b - a) * 100)}% (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
}));
await browser.close();

fs.writeFileSync(path.join(out, "list.txt"), [...Array(workers)].map((_, w) => `file 'part${w}.mp4'`).join("\n"));
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", path.join(out, "list.txt"),
  "-i", path.join(dir, "narracao.mp3"), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
  "-af", "apad", "-shortest", "-movflags", "+faststart", path.join(dir, "duoday-motion.mp4")], { stdio: "inherit" });
console.log("pronto:", path.join(dir, "duoday-motion.mp4"), `${((Date.now() - t0) / 1000).toFixed(0)}s`);
