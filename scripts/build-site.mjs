#!/usr/bin/env node
/**
 * Gera o site de apresentação (duoday.com.br) em `dist-site/`:
 *   npm run build:site
 *
 * Copia `site/` e cria /privacidade/ e /termos/ a partir do MESMO texto exibido no app
 * (src/features/legal/content.ts), para os dois nunca ficarem diferentes.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'dist-site');

// Node 22.18+ lê TypeScript simples direto (o arquivo só tem tipos e constantes).
const { privacyPolicy, termsOfUse } = await import(join(root, 'src/features/legal/content.ts'));
const schemas = readFileSync(join(root, 'src/features/auth/schemas.ts'), 'utf8');
const version = schemas.match(/TERMS_VERSION = '([^']+)'/)?.[1] ?? '';

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const linkify = (html) => html.replace(/([a-z0-9.+-]+@duoday\.com\.br)/g, '<a href="mailto:$1">$1</a>');

function renderLegal(doc) {
  const sections = doc.sections
    .map((section) => {
      const paragraphs = section.body
        .split('\n')
        .map((line) => `        <p>${linkify(escape(line))}</p>`)
        .join('\n');
      return `        <h2>${escape(section.heading)}</h2>\n${paragraphs}`;
    })
    .join('\n');
  return readFileSync(join(root, 'site/legal.template.html'), 'utf8')
    .replaceAll('{{TITLE}}', escape(doc.title))
    .replaceAll('{{UPDATED}}', escape(doc.updatedAt))
    .replaceAll('{{VERSION}}', escape(version))
    .replace('{{SECTIONS}}', sections);
}

rmSync(out, { recursive: true, force: true });
cpSync(join(root, 'site'), out, { recursive: true, filter: (src) => !src.endsWith('legal.template.html') });
for (const [path, doc] of [
  ['privacidade', privacyPolicy],
  ['termos', termsOfUse],
]) {
  mkdirSync(join(out, path), { recursive: true });
  writeFileSync(join(out, path, 'index.html'), renderLegal(doc));
}
console.log('Site pronto em dist-site/ (publique na Cloudflare Pages: duoday.com.br).');
