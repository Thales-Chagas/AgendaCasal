# DuoDay: arquitetura e decisões técnicas

Documento vivo. Registra **o que** foi escolhido, **por quê** e **o que foi descartado**.
Ordem de prioridade que guia qualquer decisão: facilidade de uso → segurança → clareza →
estabilidade → performance → beleza → novas funcionalidades.

---

## 1. Stack recomendada

| Camada                  | Escolha                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| App (Android + iOS)     | **Expo SDK 57** (React Native 0.86, Nova Arquitetura, Hermes) + **TypeScript estrito**                          |
| Navegação / deep links  | **Expo Router** (rotas por arquivo, links `duoday://`)                                                          |
| Backend                 | **Supabase**: PostgreSQL 17 + Auth + Realtime + Edge Functions                                                  |
| Região                  | `sa-east-1` (São Paulo): dados no Brasil e baixa latência                                                       |
| Autenticação            | Supabase Auth: e-mail e senha com código de 6 dígitos. Google e Apple ficam preparados para a fase 2            |
| Sessão no aparelho      | `expo-secure-store` (Keychain / Keystore)                                                                       |
| Estado de servidor      | **TanStack Query v5**                                                                                           |
| Estado de UI            | **Zustand** (pequeno, sem boilerplate)                                                                          |
| Formulários e validação | **react-hook-form** + **zod** (esquemas compartilhados)                                                         |
| Banco local             | **expo-sqlite com SQLCipher** (AES-256)                                                                         |
| Chaves de criptografia  | `expo-crypto` (geração) + `expo-secure-store` (guarda, _somente este aparelho_)                                 |
| Recorrência             | **rrule** (padrão RFC 5545, o mesmo do Google/Apple Calendar)                                                   |
| Datas                   | **date-fns** + locale `pt-BR`                                                                                   |
| Notificações            | `expo-notifications` (lembretes locais) + Expo Push via Edge Function (avisos ao parceiro)                      |
| Conectividade           | `@react-native-community/netinfo`                                                                               |
| Listas                  | `@shopify/flash-list`                                                                                           |
| UI                      | Design system próprio sobre primitivas do RN + Reanimated + `lucide-react-native` + fonte **Plus Jakarta Sans** |
| Testes                  | Jest (`jest-expo`) + Testing Library + testes de integração contra **Supabase local real**                      |
| Qualidade               | ESLint (`eslint-config-expo`) + Prettier + `tsc --noEmit`                                                       |
| Build / distribuição    | EAS Build / Submit / Update                                                                                     |

## 2. Justificativa e alternativas

**Expo + React Native.** Uma única base de código para Android e iOS, com componentes nativos
de verdade. Expo é o caminho recomendado pelo próprio React Native, tem módulos oficiais para
tudo o que precisamos (SQLite com criptografia, armazenamento seguro, notificações, biometria) e
EAS resolve a compilação na nuvem, sem precisar de Mac para gerar o app de iOS.
_Alternativas:_ **Flutter** (excelente, mas o ecossistema de backend e de tipos em Dart é menor
e a equipe teria duas linguagens); **nativo Kotlin + Swift** (dois apps, custo dobrado);
**PWA** (notificações e armazenamento seguro limitados no iOS).

**Supabase.** É PostgreSQL de verdade: relacional (casal, membros, convites e eventos são dados
relacionais), com **Row Level Security**. A autorização mora _no banco_, e nenhuma tela ou bug
de app consegue contorná-la. Auth, Realtime e Functions vêm integrados, e o plano gratuito cobre
o início. É open source, então dá para migrar ou hospedar por conta própria no futuro.
_Alternativas:_ **Firebase** (Firestore é NoSQL, as regras de segurança são mais difíceis de
testar e modelar relações, e há dependência total do Google); **backend próprio
(NestJS + Postgres)** (mais controle, porém mais código, infraestrutura e superfície de
ataque para manter); **Appwrite / PocketBase** (menos maduros em escala e tempo real).

**TanStack Query + Zustand.** O Query resolve cache, deduplicação, _retry_ e revalidação,
evitando consultas repetidas. O Zustand guarda só o estado de interface. Redux foi descartado
por ser verboso demais para este tamanho de app.

**SQLCipher para dados locais.** É o padrão da indústria para SQLite criptografado, suportado
oficialmente pelo `expo-sqlite`. A alternativa MMKV criptografado não oferece busca textual nem
consultas; o WatermelonDB não tem criptografia nativa.

## 3. Arquitetura

Arquitetura em camadas **por funcionalidade** (_feature-first_), com dependências que só apontam
para dentro:

```
Telas (src/app)          → finas: compõem componentes e chamam hooks
  ↓
Hooks da feature         → orquestram casos de uso + TanStack Query
  ↓
Serviços / domínio       → regras de negócio puras e testáveis (sem React, sem rede)
  ↓
Repositórios             → única camada que fala com Supabase ou SQLite
  ↓
Core (infraestrutura)    → cliente Supabase, banco criptografado, logger, erros, rede
```

Regras:

- Tela **nunca** importa Supabase nem SQLite diretamente.
- Regra de negócio **nunca** depende de React.
- Toda autorização é verificada **no backend** (RLS + funções `security definer`). O app só
  melhora a experiência (esconde botões, valida antes de enviar).
- **Notas privadas** vivem num módulo isolado (`features/notes`) que **não importa** o
  cliente Supabase. Uma regra de lint e um teste automatizado garantem isso.

## 4. Estrutura de pastas

```
src/
  app/                    Rotas do Expo Router (somente telas finas)
    (onboarding)/         Boas-vindas em 3 passos
    (auth)/               Entrar, criar conta, confirmar e-mail, recuperar senha
    (app)/                Área protegida
      (tabs)/             Início, Agenda, Notas, Nós (perfil do casal)
      event/              Novo, detalhe, editar
      note/               Editor de nota
      couple/             Convidar, entrar com código, conectado ❤️
      settings/           Conta, tema, notificações, privacidade, vínculo, ajuda
    convite/[code].tsx    Deep link de convite
  core/                   Infraestrutura compartilhada
    config/  logging/  errors/  supabase/  storage/  network/  query/
  design-system/
    tokens/               cores, tipografia, espaçamento, raios, sombras, movimento
    theme/                ThemeProvider (claro / escuro / sistema)
    components/           Button, TextField, Card, Badge, Avatar, EmptyState, ErrorState,
                          Skeleton, Toast, Sheet, Screen, SectionHeader, Chip...
  features/
    auth/  onboarding/  couple/  events/  notes/  special-dates/
    notifications/  search/  settings/
      (cada feature: domain/  data/  hooks/  components/  schemas/)
  shared/                 utilitários e tipos genéricos
supabase/
  migrations/             SQL versionado (tabelas, constraints, índices, triggers, RLS)
  functions/              Edge Functions (excluir conta, avisar parceiro)
  templates/              E-mails em português
  tests/                  Testes de autorização contra o banco real
docs/                     Arquitetura, privacidade (LGPD), guia de setup
```

## 5. Modelo de banco

| Tabela                  | Conteúdo principal                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.users`            | Gerida pelo Supabase Auth (e-mail, hash da senha)                                                                                                                                                                                                                                                                                                                                     |
| `profiles`              | `id` (= usuário), `display_name`, `avatar_color`, `terms_version`, `terms_accepted_at`                                                                                                                                                                                                                                                                                                |
| `couples`               | `id`, `created_by`, `connected_at`, `created_at`                                                                                                                                                                                                                                                                                                                                      |
| `couple_members`        | `couple_id`, `user_id` (**único**: uma pessoa em um espaço), `role`, `joined_at`                                                                                                                                                                                                                                                                                                      |
| `couple_invites`        | `couple_id`, `code_hash` (SHA-256, o código nunca é salvo em claro), `expires_at`, `used_at`, `revoked_at`                                                                                                                                                                                                                                                                            |
| `invite_attempts`       | Tentativas por usuário, para limitar força bruta                                                                                                                                                                                                                                                                                                                                      |
| `events`                | `couple_id`, `title`, `description`, `location`, `notes`, `all_day`, `starts_at`, `ends_at`, `start_date`, `end_date`, `timezone`, `category`, `priority`, `owner_scope` (`person`/`couple`), `responsible_user_id`, `recurrence_rule`, `recurrence_exdates`, `reminder_minutes[]`, `show_countdown`, `version`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at` |
| `bills`                 | Financeiro: `couple_id`, `owner_scope` (`person` privada / `couple`), `owner_user_id`, `title`, `category`, `amount_cents`, `frequency` (mensal/anual), `first_due_date`, `reminder_days[]`, `paid_periods[]`, `notes`, mais os campos de sincronização. Pessoal: só o dono vê (RLS)                                                                                                  |
| `special_dates`         | `couple_id`, `title`, `kind`, `date`, `repeats_yearly`, `reminder_days[]`                                                                                                                                                                                                                                                                                                             |
| `notification_settings` | Preferências por usuário                                                                                                                                                                                                                                                                                                                                                              |
| `push_tokens`           | Tokens Expo Push por aparelho                                                                                                                                                                                                                                                                                                                                                         |

Decisões importantes:

- **Todo usuário tem um "espaço"** (linha em `couples`) desde o primeiro acesso. Quem escolhe
  "Explorar primeiro" já usa a agenda sozinho. Ao conectar, o convidado pode **levar seus
  compromissos** para a agenda do casal. Nada se perde.
- **Responsável absoluto, rótulo relativo.** O banco guarda `owner_scope` +
  `responsible_user_id`. A interface traduz para _Meu_, _Do parceiro_ ou _Nosso_
  conforme quem está vendo.
- **Dia inteiro usa `date`, não `timestamp`.** Evita o clássico bug de aniversário que "muda
  de dia" por fuso horário.
- **Exclusão lógica (`deleted_at`)** para que o outro aparelho saiba o que foi apagado na
  sincronização. Um job remove definitivamente depois de 30 dias.
- **`version`** incrementada por trigger: base do controle de conflitos.
- **Categorias** são chaves de texto validadas (`casal`, `trabalho`, `saude`...). Categorias
  personalizadas no futuro entram numa tabela própria sem quebrar as atuais.
- O limite de **2 pessoas por espaço** está em um único ponto (trigger), fácil de ampliar para
  uma futura "agenda familiar".

## 6. Relacionamentos

```
auth.users 1─1 profiles
auth.users 1─1 couple_members N─1 couples
couples    1─N couple_invites
couples    1─N events          (events.responsible_user_id → membro do mesmo casal)
couples    1─N special_dates
auth.users 1─1 notification_settings
auth.users 1─N push_tokens
```

## 7. Autenticação

- Cadastro com nome, e-mail e senha (mínimo de 8 caracteres, com letras e números), mais o
  aceite dos Termos e da Política de Privacidade (versão registrada para a LGPD).
- **Confirmação por código de 6 dígitos** enviado por e-mail. Funciona melhor no celular que
  links mágicos: não depende de o link abrir o app certo.
- Recuperação de senha também por código. Troca de senha exige sessão recente.
- A sessão (_refresh token_ rotativo) fica no **Keychain / Keystore** via SecureStore, dividida
  em partes para respeitar o limite de tamanho do Android.
- Rotas protegidas: o layout `(app)` redireciona para o login se não houver sessão.
- **Google e Apple** entram numa fase seguinte, via `signInWithIdToken` nativo. A Apple exige
  "Entrar com Apple" quando se oferece login social no iOS, então os dois entram juntos.

## 8. Vínculo do casal

1. A pessoa A toca em **"Conectar com meu parceiro"**, e o app gera um convite.
2. O convite aparece como **código curto** (`ABCD-2345`, sem caracteres ambíguos como 0/O,
   1/I), **QR Code** e botão **"Enviar pelo WhatsApp"** (link `duoday://convite/CODIGO`).
3. A pessoa B abre o link ou digita o código e vê _"Ana convidou você para compartilhar a
   agenda"_, com os botões **Aceitar** e **Agora não**.
4. As duas veem **"Agora vocês estão conectados ❤️"**.

Segurança do convite: código de 40 bits de entropia, validade de **48 horas**, **uso único**,
salvo apenas como hash, só um convite ativo por espaço, máximo de 10 tentativas erradas por hora
por usuário, e aceite feito por função no servidor com bloqueio de linha (sem condição de
corrida).

**Desfazer vínculo.** A tela explica em linguagem simples:

- os compromissos **só seus** vão com você;
- os compromissos **de vocês dois** continuam com o parceiro, e você pode **levar uma cópia**;
- os compromissos **só do parceiro** ficam com ele.

**Nada é apagado.** A confirmação exige digitar ou tocar explicitamente.

## 9. Agenda compartilhada

- O aparelho mantém uma **cópia local criptografada** dos compromissos do casal (poucos
  milhares de linhas no máximo). As telas Hoje, Semana, Mês, Próximos e Busca leem **do
  aparelho**: abrem instantaneamente e funcionam sem internet.
- Eventos recorrentes são guardados uma vez (regra RRULE) e **expandidos localmente** para o
  período visível.
- Formulário progressivo: **título, quando, de quem**. O resto fica em "Mais opções".

## 10. Notas privadas

- Módulo **isolado**: banco próprio `notes.db`, criptografado com SQLCipher. A chave é
  aleatória, de 256 bits, gerada no aparelho e guardada no SecureStore com
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, então **não vai para backup nem para outro aparelho**.
- **Nenhum código de notas importa o Supabase.** Um teste automatizado falha se isso mudar.
- Busca local por **texto normalizado** (sem acentos e sem diferenciar maiúsculas; todas as
  palavras precisam aparecer), mais fixar, arquivar, ordenar e _autosave_ com _debounce_.
  O FTS5 foi descartado para a busca funcionar igual em iOS, Android e web, sem depender de
  extensões do SQLite. Para o volume de notas pessoais, a busca continua instantânea.
- Opcional: bloqueio por biometria ao abrir as notas.
- No Android, o `allowBackup` fica desativado para o banco local.
- Interface: selo **🔒 Privado · Somente neste aparelho** em toda a área de notas.
- Aviso honesto: se o app for desinstalado ou o aparelho trocado, as notas não vão junto.
  Um backup opcional e criptografado de ponta a ponta fica como melhoria futura.

## 11. Sincronização

- **Delta sync**: o app pede apenas `updated_at > último_cursor` (com margem de segurança de
  60 s e deduplicação por `version`), incluindo exclusões.
- **Supabase Realtime** (`postgres_changes` filtrado por `couple_id`, respeitando RLS) serve
  como _sinal_: ao receber uma mudança, dispara um delta pull. **Não há polling**. Também
  sincroniza ao abrir o app e ao voltar a ter internet.
- **Conflitos (dois aparelhos editam o mesmo evento):** cada alteração local guarda a versão
  base e só os campos modificados. No envio:
  - se a versão no servidor é a mesma, aplica;
  - se mudou, faz _merge por campo_: campos diferentes se combinam, e no mesmo campo vence a
    alteração enviada por último;
  - exclusão vence edição.

  O usuário vê só um aviso discreto quando algo foi combinado.

## 12. Offline

- Notas: 100% offline.
- Agenda: leitura completa offline (cópia local). **Criar, editar e excluir offline** entram
  numa **fila de envio** persistida (_outbox_), com IDs gerados no aparelho (UUID), o que
  torna o reenvio seguro e sem duplicar.
- Indicador discreto: _"Será sincronizado quando houver internet"_.

## 13. Notificações

- **Lembretes** são notificações locais agendadas no próprio aparelho, sem servidor e sem
  expor dados. Cada aparelho agenda apenas os eventos em que a pessoa participa: _Meu_ e
  _Nosso_ (e _Do parceiro_ se ela ativar). O iOS limita 64 agendamentos, então o app agenda
  os próximos e reprograma a cada sincronização.
- **Novo compromisso do parceiro**: Edge Function + Expo Push. Por padrão, o texto é
  **genérico** ("Novo compromisso na agenda de vocês"), porque o conteúdo de push passa pelos
  servidores da Apple e do Google. Mostrar detalhes é uma opção do usuário.
- Datas especiais: 7, 3 ou 1 dia antes e no dia.

## 14. Segurança e LGPD

**Controle de acesso no servidor**

- RLS em **todas** as tabelas, negando por padrão. Funções auxiliares com
  `security definer` + `search_path` vazio.
- `couples`, `couple_members` e `couple_invites` **não aceitam escrita direta**: só via
  funções RPC que validam tudo.
- Triggers impedem trocar o `couple_id` de um evento, forjar `created_by` ou `updated_at`, e
  apontar como responsável alguém de fora do casal.
- Papel `anon` sem acesso a nenhuma tabela.
- O app só conhece a chave **publicável**. A chave de serviço existe apenas nas Edge Functions.
- **Testes automatizados de autorização** contra o banco real: Casal A não lê, não altera e não
  apaga dados do Casal B, não aceita convite expirado, usado ou do próprio casal, não entra
  num casal cheio, e assim por diante.

**LGPD**

- Minimização: pedimos apenas nome e e-mail. Sem telefone, sem localização do aparelho e sem
  foto obrigatória.
- Base legal: execução de contrato (agenda) e consentimento (notificações com detalhes).
- Aceite versionado dos Termos e da Política.
- **Direitos do titular dentro do app:** ver e corrigir dados, **exportar meus dados** (JSON)
  e **excluir minha conta** (exigência também da Apple).
- Logs sem dados pessoais: o logger mascara e-mail, token e conteúdo.
- Dados hospedados no Brasil (`sa-east-1`).
- A Política de Privacidade (rascunho em `docs/PRIVACIDADE.md`) **precisa de revisão
  jurídica** antes da publicação.

## 15. UX/UI

- **Perguntar sempre:** "uma pessoa comum entende o que fazer aqui?"
- Navegação inferior com 4 abas e **botão central "+"**: **Início**, **Agenda**, **+**,
  **Notas**, **Nós**. O "+" abre uma folha com _Novo compromisso_, _Nova nota_ e
  _Data especial_.
- Ações principais na metade de baixo da tela (uso com o polegar). Alvos de toque de pelo
  menos 48 px.
- Textos humanos ("Atualizando agenda...", "Não conseguimos salvar. Tente de novo.").
- Estados vazios com convite à ação; _skeletons_ no lugar de _spinners_.
- "Desfazer" em vez de confirmação, exceto em ações destrutivas grandes.
- Tema claro, escuro ou automático. Respeita o tamanho de fonte do sistema e o leitor de tela.

## 16. Design system inicial

- **Identidade:** "rosé e areia". Um rosa profundo e elegante (não chiclete) sobre fundos
  quentes, com texto em ameixa escura.
- Tokens semânticos (`background`, `surface`, `textPrimary`, `primary`, `success`...) com
  variantes clara e escura. **Um teste automatizado verifica o contraste WCAG AA** de cada
  par texto/fundo.
- Responsável: **Meu** 👤 azul-índigo, **Do parceiro** 👤 violeta, **Nosso** ❤️ rosé.
  Sempre acompanhado de ícone e texto.
- Espaçamento em grade de 4. Raios de 8, 12, 16 e 24. Duas sombras suaves apenas.
- Tipografia _Plus Jakarta Sans_ em 7 níveis (display → legenda).
- Movimento: 150 a 250 ms, _spring_ suave e háptico leve nas confirmações. Respeita "reduzir
  movimento".

## 17. Bibliotecas e serviços

Consulte a tabela da seção 1. Serviços externos: **Supabase** (DB/Auth/Realtime/Functions),
**Expo EAS** (build e push) e um SMTP transacional em produção (Resend ou Amazon SES) para os
e-mails de código. Monitoramento de erros (Sentry, com mascaramento de dados pessoais) fica
plugável no logger.

## 18. Riscos técnicos

| Risco                                  | Mitigação                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| SQLCipher não roda no Expo Go          | Usar _development build_ (EAS). Documentado no setup                                                                   |
| Perda das notas ao trocar de aparelho  | Aviso claro na interface. Backup E2E opcional no futuro                                                                |
| Limite de 64 notificações no iOS       | Agendar em janela deslizante e reagendar a cada sync                                                                   |
| Fuso horário e horário de verão        | `timestamptz` + fuso IANA + `date` para dia inteiro. Testes específicos                                                |
| Conflito de edição simultânea          | Versão + merge por campo + testes                                                                                      |
| E-mail de código cair no spam          | SMTP próprio com SPF/DKIM em produção                                                                                  |
| Realtime desconectado em segundo plano | Delta sync ao abrir, ao reconectar e ao voltar ao primeiro plano                                                       |
| Web não é alvo                         | O web existe só para _preview_ de desenvolvimento, sem criptografia local (o navegador não tem Keychain nem SQLCipher) |

## 19. Ordem de implementação

1. **Setup e arquitetura**: projeto, lint, testes, estrutura, este documento.
2. **Banco e segurança**: migrations, RLS, RPCs e testes de autorização (base de tudo).
3. **Design system**: tokens, tema e componentes.
4. **Infraestrutura do app**: cliente Supabase, sessão segura, logger, erros, rede e
   armazenamento criptografado.
5. **Onboarding e autenticação.**
6. **Casal**: convite, conexão, "Nós".
7. **Agenda**: domínio (recorrência), cópia local, sincronização e offline (fila), feitos
   juntos porque são inseparáveis.
8. **Telas da agenda**: Início, Agenda (Hoje/Semana/Mês/Próximos) e formulário.
9. **Notas privadas.**
10. **Datas especiais** e contagem regressiva.
11. **Notificações.**
12. **Busca global.**
13. **Configurações, privacidade, desfazer vínculo, exportar e excluir conta.**
14. **Refino de UX, performance e revisão de segurança.**

---

## Estado atual (implementado)

| Área                    | Situação                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Banco, RLS e RPCs       | 6 migrations. `supabase db lint` sem avisos                                              |
| Autenticação            | E-mail e senha com código de 6 dígitos, recuperação e troca de senha                     |
| Casal                   | Convite (código, QR e link), aceite, celebração em tempo real, desfazer vínculo          |
| Agenda                  | Hoje, Semana, Mês e Próximos. Formulário progressivo, recorrência, detalhe e edição      |
| Sincronização e offline | Cópia local criptografada, fila de envio e merge por campo                               |
| Notas privadas          | SQLCipher por usuário, busca, fixar, arquivar, ordenar, autosave, biometria e exportação |
| Datas especiais         | Contagem regressiva e lembretes (no dia, 1, 3 e 7 dias antes)                            |
| Notificações            | Lembretes locais planejados e push ao parceiro (Edge Function)                           |
| LGPD                    | Exportar dados, excluir conta com senha, termos versionados                              |
| Testes                  | 140 unitários + 62 de integração contra o Supabase real                                  |

**Próximos passos sugeridos:** login com Google/Apple, backup opcional das notas com
criptografia de ponta a ponta, widgets, integração com Google/Apple Calendar e listas
compartilhadas. A arquitetura já comporta essas expansões: novas tabelas sincronizadas
entram no mesmo motor (`features/sync/entities.ts`).
