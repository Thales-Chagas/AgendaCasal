# Setup, produção e publicação

## 1. Desenvolvimento local

**Pré-requisitos:** Node 22+, Docker e, para rodar em aparelho, Android Studio e/ou Xcode
(ou use o EAS na nuvem).

```bash
npm install
npm run db:start      # sobe o Supabase local e aplica as migrations
npx supabase status   # mostra a URL e a chave publicável (PUBLISHABLE_KEY)
cp .env.example .env.local
```

Preencha `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321      # no emulador Android: http://10.0.2.2:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

- Os e-mails com código de confirmação chegam no **Mailpit**: http://127.0.0.1:54324
- `npm run db:reset` recria o banco do zero (sem dados fictícios)
- `npm run web` abre uma pré-visualização no navegador. **Não use o web como produto:** lá
  não existe Keychain nem SQLCipher
- Rodar no aparelho: `npx expo run:android` / `npx expo run:ios` (_development build_, necessário
  para SQLCipher e notificações)

### Testes

```bash
npm run check      # typecheck, lint, formatação, testes unitários
npm run test:db    # integração: precisa do Supabase local rodando
npm run db:lint
```

## 2. Supabase em produção

1. Crie um projeto em https://supabase.com na região **South America (São Paulo)**. No
   formulário: _Enable Data API_ **ligado**, _Automatically expose new tables_ **desligado**
   (as migrations concedem acesso tabela por tabela) e _Enable automatic RLS_ **ligado**.
2. Vincule e aplique as migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
3. **Authentication › Providers › Email**: ative _Confirm email_, _Secure password change_,
   mínimo de 8 caracteres com letras e números e _Leaked password protection_.
   **Email OTP Length: 6** (projetos novos vêm com 8, e o app pede exatamente 6 números).
4. **Authentication › Email Templates**: copie `supabase/templates/confirmation.html`
   ("Confirm signup") e `supabase/templates/recovery.html` ("Reset password"). Eles usam o
   código `{{ .Token }}`, não links.
5. **Authentication › SMTP**: configure um provedor transacional (Resend, Amazon SES...) com
   SPF e DKIM no domínio. O SMTP padrão do Supabase tem limites baixos.
6. **Authentication › URL Configuration**: _Site URL_ `duoday://`.
7. **Database › Extensions**: confirme `pg_cron` (limpeza diária) e ative `pg_net` (push).

### Push para o parceiro (opcional, recomendado)

```bash
# Segredo compartilhado entre o banco e a função (gere um valor aleatório longo)
npx supabase secrets set NOTIFY_PARTNER_SECRET=<segredo>
npx supabase functions deploy notify-partner --no-verify-jwt
```

No SQL Editor, registre no Vault a URL da função e o mesmo segredo:

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1/notify-partner', 'notify_partner_url');
select vault.create_secret('<segredo>', 'notify_partner_secret');
```

Sem esses dois segredos, o gatilho simplesmente não envia nada. Salvar compromissos nunca é
afetado.

## 3. Build e lojas (EAS)

```bash
npx eas-cli@latest login
npx eas-cli@latest init             # cria o projectId (necessário para push)
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit
```

- Configure `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como
  variáveis do EAS (visibilidade "plain text": são públicas por natureza).
- Push: o EAS gerencia as credenciais APNs (iOS) e FCM (Android) em `eas credentials`.
- Link universal (opcional): para o QR Code abrir o app direto pela câmera, configure um
  domínio (ex.: `duoday.com.br/convite/...`) com _Associated Domains_ e _App Links_.
  Hoje o link usa o esquema `duoday://`.

## 4. Checklist antes de publicar

- [ ] Revisão jurídica de `docs/PRIVACIDADE.md` e dos textos em `src/features/legal/content.ts`
- [ ] Publicar a Política de Privacidade em uma URL pública (exigência das lojas)
- [ ] App Store: rótulos de privacidade (e-mail, nome, conteúdo do usuário: agenda). Sem rastreamento
- [ ] Google Play: formulário _Data safety_, mais o link de exclusão de conta (a exclusão já existe no app)
- [ ] Nomear o encarregado (DPO) e o canal de contato da LGPD
- [ ] SMTP próprio configurado e testado
- [ ] Monitoramento de erros (ex.: Sentry) conectado ao `addLogSink`, com mascaramento já ativo
- [ ] Backups do banco (plano pago do Supabase inclui PITR)
