#!/usr/bin/env node
/**
 * Gera o app web instalável (PWA) em `dist/`, pronto para publicar em app.duoday.com.br.
 *
 *   EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... npm run build:web
 *
 * Além do `expo export`, este script:
 *   - cria o `sw.js` com a lista exata de arquivos da versão (abre sem rede, atualiza sozinho);
 *   - escreve `_headers` (cache e segurança, inclusive CSP) e `_redirects` (rotas do app)
 *     no formato da Cloudflare Pages.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = resolve(process.env.WEB_OUT_DIR ?? join(root, 'dist'));

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (!supabaseUrl || !process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  console.error('Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  process.exit(1);
}
const supabase = new URL(supabaseUrl);
const supabaseOrigin = supabase.origin;
const supabaseWs = `${supabase.protocol === 'https:' ? 'wss' : 'ws'}://${supabase.host}`;

if (!process.argv.includes('--skip-export')) {
  rmSync(out, { recursive: true, force: true });
  const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--clear', '--output-dir', out], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const toUrl = (path) => `/${relative(out, path).split(sep).join('/')}`;

// index.html: origem do servidor para o `preconnect`.
const indexPath = join(out, 'index.html');
writeFileSync(indexPath, readFileSync(indexPath, 'utf8').replaceAll('%SUPABASE_ORIGIN%', supabaseOrigin));

// O que a abertura precisa: casca, código, banco local (wasm), fontes, ícones e manifesto.
const files = walk(out);
const precache = files
  .map(toUrl)
  .filter(
    (url) =>
      url === '/index.html' ||
      url === '/register-sw.js' ||
      url === '/manifest.webmanifest' ||
      url.startsWith('/_expo/static/') ||
      url.startsWith('/icons/') ||
      url.endsWith('.wasm') ||
      url.endsWith('.ttf'),
  )
  .filter((url) => !url.endsWith('.map'))
  .sort();

const hash = createHash('sha256');
for (const url of precache) hash.update(url).update(readFileSync(join(out, url)));
const version = hash.digest('hex').slice(0, 12);

const sw = readFileSync(join(root, 'web', 'sw.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__PRECACHE__', JSON.stringify(precache));
writeFileSync(join(out, 'sw.js'), sw);

const csp = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin}`,
  "font-src 'self' data:",
  // blob:/data: — o app lê a foto escolhida (recortada no aparelho) antes de enviar.
  `connect-src 'self' blob: data: ${supabaseOrigin} ${supabaseWs}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ');

writeFileSync(
  join(out, '_headers'),
  `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=(), usb=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/_expo/static/*
  Cache-Control: public, max-age=31536000, immutable

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/index.html
  Cache-Control: no-cache

/sw.js
  Cache-Control: no-cache

/register-sw.js
  Cache-Control: no-cache

/manifest.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: no-cache
`,
);

// Qualquer endereço do app (ex.: /agenda, /convite/ABCD) abre o index.html.
writeFileSync(join(out, '_redirects'), '/*  /index.html  200\n');

const size = (urls) => urls.reduce((total, url) => total + statSync(join(out, url)).size, 0);
console.log(
  `\nPWA pronto em ${relative(process.cwd(), out) || '.'}: versão ${version}, ` +
    `${precache.length} arquivos guardados no aparelho (${(size(precache) / 1048576).toFixed(1)} MB).`,
);
if (!existsSync(join(out, 'manifest.webmanifest')))
  console.warn('Aviso: manifest.webmanifest não encontrado.');
