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

module.exports = { BASE, OUT, PEOPLE, open, shot, code, step, signIn };
