# DuoDay ❤️

Agenda compartilhada para casais. Cada pessoa tem sua conta, e duas contas formam um casal
com uma agenda sincronizada. Cada um ainda tem um espaço de **notas privadas que nunca saem
do celular**.

- **Agenda do casal:** Hoje, Semana, Mês e Próximos. Compromissos com recorrência,
  lembretes, categorias e responsável (👤 Meu, 👤 Do parceiro, ❤️ Nosso)
- **Conexão simples:** convite por código, QR Code ou link (WhatsApp), com validade de 48 h
- **Tempo real e offline:** o que um cria aparece para o outro em instantes. Sem internet,
  tudo continua funcionando e é enviado depois
- **Notas privadas 🔒:** criptografadas no aparelho (SQLCipher), com busca, fixar, arquivar
  e salvamento automático
- **Datas especiais** com contagem regressiva ("Faltam 12 dias ❤️")
- **Segurança e LGPD:** autorização no banco (RLS), dados no Brasil, exportação e exclusão
  de conta dentro do app

## Stack

Expo SDK 57 (React Native, TypeScript estrito, Expo Router) · Supabase (PostgreSQL + RLS,
Auth, Realtime, Edge Functions) · TanStack Query · Zustand · expo-sqlite/SQLCipher ·
expo-secure-store · expo-notifications · zod · date-fns · rrule.

As decisões e alternativas avaliadas estão em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Começando

```bash
npm install
npm run db:start                 # Supabase local (requer Docker)
cp .env.example .env.local       # preencha com a URL e a chave publicável (npx supabase status)
npm run web                      # pré-visualização rápida no navegador (sem criptografia local)
npx expo run:android             # ou run:ios: build de desenvolvimento com SQLCipher
```

> As notas usam SQLCipher, que não existe no Expo Go. Use um _development build_
> (`npx expo run:*` ou `eas build --profile development`).

O guia completo de ambiente, produção e publicação está em [`docs/SETUP.md`](docs/SETUP.md).

## Qualidade

| Comando           | O que faz                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`   | Typecheck + lint + formatação + testes unitários                                                                                                                      |
| `npm test`        | 140 testes unitários (recorrência, sincronização local, notas, lembretes, contraste...)                                                                               |
| `npm run test:db` | 62 testes de integração contra o Supabase local (autorização Casal A × Casal B, convites, sincronização entre dois aparelhos, tempo real, autenticação ponta a ponta) |
| `npm run db:lint` | Análise estática das funções do banco                                                                                                                                 |

## Estrutura

```
src/app/            Telas (Expo Router), finas
src/core/           Infraestrutura: Supabase, banco criptografado, logger, erros, rede
src/design-system/  Tokens (claro e escuro), tema e componentes acessíveis
src/features/       auth, couple, events, sync, notes, special-dates, notifications, search...
supabase/           migrations, Edge Functions, templates de e-mail e testes de integração
docs/               Arquitetura, setup e privacidade
```

## Privacidade em uma frase

**Agenda:** compartilhada com seu parceiro. **Notas:** somente neste aparelho. **Conta:**
informações privadas. Detalhes em [`docs/PRIVACIDADE.md`](docs/PRIVACIDADE.md).
