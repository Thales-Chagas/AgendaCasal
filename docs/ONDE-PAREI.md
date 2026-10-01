# Onde parei

Última atualização: 01/10/2026.

## Estado do projeto

- Todo o código está na branch **`claude/busy-darwin-7lbh10`** (ainda não foi para a `main`).
- 10 migrations. Testes: `npm run check` passa 162/162, `npm run test:db` passa 77/77 e
  `npm run db:lint` não acha erros (rodados contra um Supabase local).
- Pronto e salvo nesta etapa (ver `docs/PEDIDOS.md`):
  1. **Cores**: compromissos do casal em rosa; os pessoais na cor de cada pessoa.
  2. **Aba Finanças**: contas fixas do casal ou privadas, com lembrete e "marcar como paga".
  3. **Foto de perfil**: escolher, ajustar (zoom e enquadramento) e enviar; bucket privado.
- Ainda **não testado no celular**: só no navegador, com dados de teste.

## Decisões tomadas

- **Nome do app: DuoDay.** Domínio `duoday.com.br` (registrado). Pacote Android/iOS
  `br.com.duoday` (não muda depois de publicado), esquema de links `duoday://`.
- **Supabase online, plano grátis.** Dois projetos em São Paulo (`sa-east-1`):
  `Agenda_Casal TST` (teste, ref `ytwkgqpfmvibfhbpbjbl`, é o que está ligado no computador) e
  `Agenda_Casal` (produção).
- **E-mail**: SMTP do Brevo (grátis) no TST, com os modelos novos do DuoDay (código de 6 dígitos).
- **Expo/EAS**: projeto `@thaleschagas-team/duoday` (ID já no `app.json`), com `expo-updates`.
- **Lançar primeiro só na Play Store**; iPhone depois, quando der para pagar a Apple.
- Contas pessoais do Financeiro ficam **no servidor**, visíveis só para o dono.

## Próximo passo (começar por aqui)

No PowerShell, na pasta `AgendaCasal`, um comando por vez:

```powershell
git pull
npm ci
npx supabase db push
npx eas-cli@latest build --profile development --platform android
```

- `db push`: aplica 3 migrations novas no TST (cores, contas, fotos). Responder **Y**.
- O build novo é obrigatório (entraram módulos nativos para a foto). Na pergunta do emulador,
  responder **n**. Instalar o app novo pelo link e depois rodar `npx expo start`.
- Testar no celular: cores na agenda, aba Finanças (criar conta, marcar paga, lembrete),
  foto de perfil (pinça para zoom) e o cadastro/vínculo do casal com uma segunda conta.

## Pendências

- **Supabase**: conferir se _Email OTP Length_ está em **6** nos dois projetos (vem 8 por padrão).
- **Domínio** (Cloudflare): nameservers trocados em 30/09 para `cullen` e `joselyn`
  (`.ns.cloudflare.com`). Quando ficar _Active_: _Email Routing_ de `ajuda@` e
  `privacidade@duoday.com.br` para o Gmail e autenticar o domínio no Brevo (remetente
  `noreply@duoday.com.br`; um único registro SPF).
- **Produção**: repetir no projeto `Agenda_Casal` o SMTP, os modelos de e-mail, o _Site URL_
  `duoday://`, o OTP de 6 dígitos e o `db push`.
- Medir a velocidade real com um build `--profile preview` antes de publicar.
- Conferir se "DuoDay" está livre na Play Store.
- Plano grátis: backup semanal (sugerido via GitHub Actions, criptografado); o projeto pausa
  após 7 dias sem uso (reativar no painel).

## Plano até a loja

1. ✅ Instalar Git e Node.
2. ✅ Criar os 2 projetos no Supabase.
3. ⏳ App rodando no celular (falta testar as novidades acima).
4. Criar a conta na Play Console (US$ 25).
5. Produção configurada (ver Pendências).
6. Teste fechado do Google: 12 pessoas por 14 dias.
7. Em paralelo: Política de Privacidade publicada (`duoday.com.br`) com revisão jurídica e
   formulário _Data safety_.
8. Publicar na Play Store.
9. iPhone depois.
