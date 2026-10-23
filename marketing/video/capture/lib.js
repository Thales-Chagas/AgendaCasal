// Utilitários das capturas: navegador no tamanho de celular, telas reais do app (web) ligadas
// ao Supabase LOCAL com dados fictícios. Nada aqui toca no banco de teste ou de produção.
const { chromium } = require('playwright-core');
const path = require('node:path');

const BASE = process.env.APP_URL || 'http://localhost:8099/';
const MAILPIT = process.env.MAILPIT_URL || 'http://127.0.0.1:54324';
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium';
const OUT = process.env.SCREENS_DIR || path.join(__dirname, '../public/screens');
const PROFILES = process.env.PROFILES_DIR || path.join(__dirname, '.profiles');

/** Casal fictício usado em todo o vídeo. */
const PEOPLE = {
  bia: { name: 'Bia', email: 'bia@duoday.local', password: 'senhaDemo2026' },
  rafa: { name: 'Rafa', email: 'rafa@duoday.local', password: 'senhaDemo2026' },
};

async function open(who, { scheme = 'dark' } = {}) {
  const context = await chromium.launchPersistentContext(path.join(PROFILES, who), {
    executablePath: CHROME,
    args: ['--lang=pt-BR'],
    env: { ...process.env, LANG: 'pt_BR.UTF-8', LANGUAGE: 'pt_BR:pt', LC_ALL: 'pt_BR.UTF-8' },
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: scheme,
    reducedMotion: 'no-preference',
  });
  const page = context.pages()[0] ?? (await context.newPage());
  page.on('pageerror', (e) => console.log(`[${who}] erro na página:`, String(e).slice(0, 200)));
  return { context, page };
}

async function shot(page, name, { wait = 900, fullPage = false } = {}) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 92, fullPage });
  console.log('  📸', name);
}

async function code(email) {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:' + email)}`);
    const list = await res.json();
    if (list.messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json();
      const found = (msg.Text || msg.HTML || '').match(/\b(\d{6})\b/);
      if (found) return found[1];
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`código não chegou para ${email}`);
}

/** Entra com e-mail e senha (no web a sessão não fica salva entre aberturas). */
async function signIn(page, person) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (page.url().includes('welcome')) {
    await page.getByText('Pular').click();
    await page.waitForTimeout(700);
    await page.getByText('Já tenho uma conta').click();
    await page.waitForTimeout(900);
  }
  if (!page.url().includes('sign-in')) return;
  await page.getByPlaceholder('voce@exemplo.com').fill(person.email);
  await page.locator('input[type=password]').fill(person.password);
  await page.getByText('Entrar', { exact: true }).last().click();
  await page.waitForTimeout(3500);
}

/** Executa um passo sem derrubar o roteiro inteiro se algo falhar. */
async function step(label, fn) {
  try {
    console.log('▶', label);
    await fn();
  } catch (e) {
    console.log('✖', label, '-', e.message.split('\n')[0]);
  }
}

/**
 * Mede a "caixa" visível (cartão, chip, linha, botão) que contém um texto, em pontos de 390×844:
 * sobe a partir do texto até o primeiro elemento com fundo, borda arredondada ou papel de botão
 * (e pelo menos `minW` de largura). Devolve [centroX, centroY, largura, altura].
 * `text` pode ser string (contém) ou RegExp em string ("/^[A-Z0-9]{4}-[A-Z0-9]{4}$/").
 */
async function measure(page, text, { nth = 0, minW = 0, self = false } = {}) {
  return page.evaluate(
    ({ text, nth, minW, self }) => {
      const re = text.startsWith('/') ? new RegExp(text.slice(1, text.lastIndexOf('/'))) : null;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const hits = [];
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const t = n.textContent.trim();
        if (!t || !(re ? re.test(t) : t.includes(text))) continue;
        const r = n.parentElement.getBoundingClientRect();
        if (r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) hits.push(n.parentElement);
      }
      let el = hits[nth];
      if (!el) return null;
      const boxy = (e) => {
        const s = getComputedStyle(e);
        const bg = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
        return bg || parseFloat(s.borderTopLeftRadius) > 0 || parseFloat(s.borderTopWidth) > 0 || e.getAttribute('role') === 'button';
      };
      if (!self) {
        while (el.parentElement && !(boxy(el) && el.getBoundingClientRect().width >= minW)) el = el.parentElement;
      }
      const r = el.getBoundingClientRect();
      return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2), Math.round(r.width), Math.round(r.height)];
    },
    { text, nth, minW, self },
  );
}

/** Caixa de um elemento (locator do Playwright), no mesmo formato de `measure`. */
async function boxOf(locator) {
  const b = await locator.first().boundingBox().catch(() => null);
  return b ? [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2), Math.round(b.width), Math.round(b.height)] : null;
}

/** União de várias caixas [cx, cy, w, h]. */
function union(...boxes) {
  const bs = boxes.filter(Boolean);
  if (!bs.length) return null;
  const x0 = Math.min(...bs.map((b) => b[0] - b[2] / 2));
  const x1 = Math.max(...bs.map((b) => b[0] + b[2] / 2));
  const y0 = Math.min(...bs.map((b) => b[1] - b[3] / 2));
  const y1 = Math.max(...bs.map((b) => b[1] + b[3] / 2));
  return [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2), Math.round(x1 - x0), Math.round(y1 - y0)];
}

module.exports = { BASE, OUT, PEOPLE, open, shot, code, step, signIn, measure, boxOf, union };
