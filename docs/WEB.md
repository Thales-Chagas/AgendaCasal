# DuoDay na web: site e app pelo navegador

São dois sites, os dois de graça na **Cloudflare Pages** (o domínio já está na Cloudflare):

| Endereço            | O que é                                               | Pasta / build                  |
| ------------------- | ----------------------------------------------------- | ------------------------------ |
| `duoday.com.br`     | Site de apresentação, Privacidade e Termos            | `site/` → `npm run build:site` |
| `app.duoday.com.br` | O próprio app (PWA), que o iPhone instala pelo Safari | `npm run build:web` → `dist/`  |

## Como funciona no iPhone

O iPhone não instala APK. O app web é instalado pelo Safari: **Compartilhar › Adicionar à Tela de
Início**. Ele abre em tela cheia, com ícone, funciona sem internet e recebe lembretes (iOS 16.4+).

O que muda em relação ao app do celular:

- **Lembretes**: o iPhone não agenda lembretes para sites. O app envia ao servidor a lista dos
  próximos lembretes (até 60, nos próximos 30 dias). A cada minuto o banco (pg_cron) chama a função
  `send-web-push`, que os envia por Web Push. Sem a opção "Mostrar detalhes nos avisos", o servidor só
  recebe um texto genérico ("Lembrete do DuoDay").
- **Notas**: ficam num banco cifrado (AES-256-GCM) no aparelho. A chave abre com um **PIN de 6
  números** ou com **digital/rosto** (passkey do aparelho, extensão PRF). "Esqueci o PIN" apaga as notas
  deste aparelho: não há como recuperar, de propósito.
- **Bloquear o DuoDay** (Nós › Segurança): pede digital ou rosto ao abrir. Vale no celular e no web.
- **Login** fica salvo; a agenda abre do aparelho na hora, mesmo sem internet.

## Publicar o app web (`app.duoday.com.br`)

1. Gere as chaves VAPID (uma vez por ambiente; a privada **nunca** vai para o git):
   ```bash
   node scripts/generate-vapid-keys.mjs
   ```
2. Build (com o Supabase de **produção**):
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
   EXPO_PUBLIC_VAPID_PUBLIC_KEY=<pública> \
   npm run build:web
   ```
   Sai em `dist/` com `sw.js`, `_headers` (CSP e cache) e `_redirects` (rotas do app).
3. Cloudflare Pages › Criar projeto › **Upload direto** da pasta `dist/` (ou ligar ao GitHub com o
   comando acima e a pasta `dist`). Domínio personalizado: `app.duoday.com.br`.
4. Supabase (produção):
   - Database › Extensions: `pg_cron` e **`pg_net`** ativos.
   - `npx supabase db push` (migration `20261022120000_web_push.sql`).
   - Segredos das funções:
     ```bash
     npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
       VAPID_SUBJECT=mailto:ajuda@duoday.com.br WEB_PUSH_SECRET=<segredo longo e aleatório>
     npx supabase functions deploy send-web-push --no-verify-jwt
     npx supabase functions deploy notify-partner --no-verify-jwt
     ```
   - No SQL Editor (Vault), para o banco chamar a função:
     ```sql
     select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-web-push', 'web_push_url');
     select vault.create_secret('<o mesmo WEB_PUSH_SECRET>', 'web_push_secret');
     ```
   - Authentication › URL Configuration: incluir `https://app.duoday.com.br` nas Redirect URLs.

## Publicar o site (`duoday.com.br`)

1. `npm run build:site` → `dist-site/` (Privacidade e Termos saem do mesmo texto do app).
2. Cloudflare Pages › Upload direto de `dist-site/`. Domínio: `duoday.com.br` (e `www`).
3. **Link do APK**: em `site/_redirects`, troque o destino de `/baixar/android` pelo APK de
   **produção** (hoje aponta para o build de teste, que usa o banco de teste).
   O APK tem mais de 25 MB, limite de arquivo da Pages; opções: o link do build na Expo, ou um bucket
   público no Cloudflare R2 (grátis até 10 GB).

## Animações do site

`site/motion.js` usa **GSAP 3.15** (ScrollSmoother, ScrollTrigger e SplitText: rolagem suave no
computador, telas que passam de lado com a seção presa, títulos que sobem) e **anime.js 4.5** (título do
topo, ícones, botões que seguem o mouse, perguntas que deslizam). As bibliotecas ficam em `site/vendor/`
(servidas pelo próprio site, por causa da CSP). O anime.js é uma versão enxuta, gerada com:

```bash
echo "export { animate, stagger, splitText, scrambleText, createAnimatable, spring, utils } from 'animejs';" > entry.js
npx esbuild entry.js --bundle --format=iife --global-name=anime --minify --outfile=anime.min.js
```

Com "reduzir movimento" ligado no aparelho, ou sem JavaScript, o site aparece igual, sem animação.

## Testar localmente (sem tocar no TST nem na produção)

```bash
npm run db:start
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chave local> \
  npm run build:web
# sirva dist/ em http://localhost:8099 (com fallback para index.html)
```

`npm run test:db` cobre inscrições, RLS e o envio único dos lembretes; `npm run check` confere a
criptografia do Web Push contra a biblioteca de referência (`http_ece`) e o cofre das notas.
