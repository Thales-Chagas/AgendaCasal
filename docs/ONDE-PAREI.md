# Onde parei

Última atualização: 30/09/2026.

## Estado do projeto

- Todo o código está na branch `claude/busy-darwin-7lbh10` (ainda não foi para a `main`).
  Ela contém tudo da antiga `claude/magical-keller-lh4mgu` mais o `expo-dev-client`.
- Banco testado na nuvem: as 7 migrations aplicam sem erro, `npm run test:db` passa 62/62,
  `npm run check` passa 140/140 e `npm run db:lint` não acha erros.

## Decisões tomadas

- **Nome do app: DuoDay.** Domínio `duoday.com.br` (registrado). Pacote Android/iOS
  `br.com.duoday` (não muda depois de publicado), esquema de links `duoday://` (no Supabase:
  _Site URL_ `duoday://`).
- Domínio comprado na HostGator (só o domínio, sem hospedagem nem e-mail). Nameservers trocados
  em 30/09 para `cullen.ns.cloudflare.com` e `joselyn.ns.cloudflare.com`; aguardando a
  Cloudflare ficar _Active_. Depois: _Email Routing_ e autenticação do Brevo.
- Domínio: DNS na Cloudflare (grátis), com _Email Routing_ encaminhando `ajuda@` e
  `privacidade@duoday.com.br` para o Gmail. Brevo autenticado no domínio, remetente
  `noreply@duoday.com.br`.
- **Supabase online, plano grátis** (sem mensalidade). Aguenta com folga ~200 usuários.
  Sem Docker: o banco local (caminho B) foi descartado.
- Dois projetos criados na região São Paulo (`sa-east-1`):
  - `Agenda_Casal TST`: teste, para desenvolver.
  - `Agenda_Casal`: produção, só para usuários reais.
- **Lançar primeiro só na Play Store** (conta de US$ 25). iPhone depois, quando der para pagar
  a Apple (US$ 99/ano); o mesmo código serve.
- Rodar no celular com _development build_ feito no EAS (nuvem), sem Android Studio.

## Plano

1. ✅ Instalar Git e Node.
2. ✅ Criar os 2 projetos no Supabase.
3. ⏳ Ligar o app no projeto de teste e rodar no celular Android.
   - Feito: SMTP Brevo, modelos de e-mail novos (código de 6 dígitos) e _Site URL_.
   - Feito: `supabase link` + `db push` no TST (8 tabelas criadas; ref `ytwkgqpfmvibfhbpbjbl`)
     e projeto no Expo (`@thaleschagas-team/duoday`, ID `3738207b-…-12ae005003c6`, já no
     `app.json`).
   - Feito: build de desenvolvimento Android (EAS, perfil `development`), com `expo-updates`.
     Link: https://expo.dev/accounts/thaleschagas-team/projects/duoday/builds/49ef39a9-75d8-46ac-a982-d0e385817e50
   - Feito: app instalado no celular, conectado ao TST; e-mail de confirmação chegando.
   - Achado: o Supabase online gera código de 8 dígitos por padrão; o app pede 6. Ajustar
     _Email OTP Length_ para 6 nos dois projetos (TST e produção).
   - Falta: testar cadastro completo e o vínculo do casal.
   - Travou no 3.3: no plano grátis o Supabase só deixa editar os modelos de e-mail com SMTP
     próprio. O app precisa do modelo com o código de 6 dígitos (`{{ .Token }}`), então o
     SMTP (Brevo, grátis) foi adiantado e vale para os dois projetos.
4. Criar a conta na Play Console.
5. E-mail grátis (Brevo) via SMTP no projeto de produção (mesma configuração do teste). O SMTP padrão do Supabase não
   serve para usuários reais.
6. Teste fechado do Google: 12 pessoas por 14 dias (exigência para conta pessoal).
7. Em paralelo: publicar a Política de Privacidade (GitHub Pages ou Google Sites) e preencher
   o _Data safety_.
8. Publicar na Play Store.
9. iPhone depois.

Pedidos de mudança do app (cores, aba Financeiro, foto de perfil, tema, lentidão): ver
`docs/PEDIDOS.md`. Cores e Finanças prontos; **antes de testar no celular, aplicar as novas
migrations no TST**: `git pull`, `npm ci` e `npx supabase db push` (vale para produção também).

Pendências do nome: conferir se "DuoDay" está livre na Play Store; criar os encaminhamentos
`ajuda@duoday.com.br` e `privacidade@duoday.com.br`, que aparecem no app.

Pendências conhecidas do plano grátis: backup semanal (sugerido via GitHub Actions,
criptografado) e o projeto pausa após 7 dias sem uso (reativar no painel).
