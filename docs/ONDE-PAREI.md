# Onde parei

Última atualização: 22/10/2026 (fim da tarde).

## Estado do projeto

- Todo o código está na branch **`claude/trusting-dirac-shrp4a`** (continuação da
  `claude/compassionate-faraday-kwzzf6`; ainda não foi para a `main`).
- 12 migrations. Testes: `npm run check` passa 245/245, `npm run test:db` passa 85/85 e
  `npm run db:lint` não acha erros (rodados contra um Supabase local, na nuvem do Claude).
- **22/10: web e iPhone** (pedidos 11 a 15, guia em `docs/WEB.md`): app pelo navegador (PWA) para o
  iPhone, login rápido, notas com PIN e digital/rosto, bloqueio do app por biometria, lembretes por
  Web Push e o site `duoday.com.br` (`site/`). Testado no navegador local; **falta publicar** e
  testar num iPhone de verdade.
- Pronto e salvo nesta etapa (ver `docs/PEDIDOS.md`):
  1. **Cores**: compromissos do casal em rosa; os pessoais na cor de cada pessoa.
  2. **Aba Finanças**: contas fixas do casal ou privadas, com lembrete e "marcar como paga".
  3. **Foto de perfil**: escolher, ajustar (zoom e enquadramento) e enviar; bucket privado.
  4. **Seletor de cor prismático** (21/10): 15 opções; degradê só no seletor, cor sólida no
     avatar e nos compromissos. Testado no web; build `preview` de 21/10 pronto para o celular.
  5. **Vídeo de apresentação** (21/10): `marketing/video` (Remotion). Principal 16:9 (62 s),
     vertical 9:16 e demonstração completa (2 min 14 s), e as duas primeiras também **com
     narração feminina** (voz gratuita Kokoro `pf_dora`). Ver `marketing/video/README.md`.
     Os MP4 não ficam no git (foram enviados no chat); para gerar de novo: `npm run render`.
  6. **QR code** do APK de teste: `marketing/qr/duoday-apk-qrcode.png`.
- Ainda **não testado no celular**: só no navegador, com dados de teste.
- 20/10: o TST tinha pausado (7 dias sem uso) e foi reativado. 21/10: as 11 migrations estão
  aplicadas no TST (inclusive a das cores).
- 20/10: primeiro build **`preview`** do Android pronto (aponta para o TST):
  https://expo.dev/accounts/thaleschagas-team/projects/duoday/builds/2b100ba1-28c6-47a1-8f7d-e42f8d56fbb1

## Decisões tomadas

- **Nome do app: DuoDay.** Domínio `duoday.com.br` (registrado). Pacote Android/iOS
  `br.com.duoday` (não muda depois de publicado), esquema de links `duoday://`.
- **Supabase online, plano grátis.** Dois projetos em São Paulo (`sa-east-1`):
  `Agenda_Casal TST` (teste, ref `ytwkgqpfmvibfhbpbjbl`, é o que está ligado no computador) e
  `Agenda_Casal` (produção).
- **E-mail**: SMTP do Brevo (grátis) no TST, com os modelos novos do DuoDay (código de 6 dígitos).
- **Expo/EAS**: projeto `@thaleschagas-team/duoday` (ID já no `app.json`), com `expo-updates`.
- **Lançar primeiro só na Play Store**; iPhone pelo **app web (PWA)** em `app.duoday.com.br`
  enquanto não der para pagar a Apple. Android: APK pelo site até a Play Store.
- **Hospedagem dos dois sites**: Cloudflare Pages (grátis; domínio já está lá).
- Contas pessoais do Financeiro ficam **no servidor**, visíveis só para o dono.

## Próximo passo (começar por aqui)

A sessão na nuvem do Claude agora tem acesso à Expo e ao Supabase por **segredos de rede**
(o Claude nunca vê os valores):

- Expo: robô **`claude-nuvem`** (papel Developer) na conta `thaleschagas-team`, site `api.expo.dev`.
- Supabase: token **`claude-nuvem`**, limitado ao projeto TST, site `api.supabase.com`.
  Permissões: _Project_ só leitura, _Database_ leitura e escrita.

Com isso o Claude aplica migrations no TST e gera builds `preview` sozinho. O perfil `preview`
do `eas.json` já tem a URL e a chave publicável do TST.

**22/10:**

- ✅ Seletor de cor aprovado no celular; corrigido o nome vazio em "Minha conta".
- ✅ Rodada 1 (pedidos 7 a 10): animação das folhas, revisão LGPD, barra flutuante, dias em destaque.
- ✅ Rodada 2 (pedidos 11 a 15): web/iPhone, segurança e site. Ver `docs/WEB.md`.
- Narração: o usuário **quer trocar a voz**, depois das mudanças no app (o vídeo vai mudar).

**Próximo (começar por aqui):**

Combinado em 22/10 à noite: **23/10 subir tudo**. Para isso, ter em mãos:

- acesso da sessão à **Cloudflare** (token com permissão de Pages no domínio `duoday.com.br`);
- **autorização** para o Claude aplicar a migration `web_push` no TST (foi bloqueada nesta sessão);
- nome/razão social e CPF/CNPJ do responsável, para a Política de Privacidade.

1. Publicar: seguir `docs/WEB.md` (Cloudflare Pages para `duoday.com.br` e `app.duoday.com.br`,
   `pg_net`, migration, segredos VAPID e Vault). Pode ser feito pelo Claude com acesso à Cloudflare.
2. Testar num iPhone: instalar pelo Safari, criar PIN, digital/rosto, bloqueio e um lembrete real.
3. Testar no celular o build `preview` de 22/10 (QR em `marketing/qr/`):
   https://expo.dev/accounts/thaleschagas-team/projects/duoday/builds/9a8100f8-4ebb-46f5-a3ad-3db8f686efec
   Migration `web_push` ainda **não** aplicada no TST (o app Android não depende dela).
   Atualização pelo ar (`eas update`, canal `preview`) de 22/10 à noite: avatar do topo, molduras
   dos cartões no Android e dica da busca. Para enviar outra: `eas update --channel preview
--platform android --environment preview` com as variáveis `EXPO_PUBLIC_*` do TST no terminal.
4. Trocar o link do APK em `site/_redirects` pelo de produção quando existir.
5. Continuar as mudanças no app; depois refazer o vídeo com a voz nova.
6. Pendências LGPD em `docs/PRIVACIDADE.md` (preencher o controlador, logs de 6 meses etc.).

Caminho manual, se preferir (PowerShell, na pasta `AgendaCasal`):

```powershell
git fetch
git checkout claude/trusting-dirac-shrp4a
npm ci
npx supabase db push
npx eas-cli@latest build --profile development --platform android
```

Testar no celular: cores na agenda, aba Finanças (criar conta, marcar paga, lembrete),
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
- Apagar o token `claude-nuvem` do Supabase quando não precisar mais dele.
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
