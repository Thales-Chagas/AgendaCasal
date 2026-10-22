# Pedidos de mudança

Pedidos feitos depois de ver o app rodando no celular (30/09/2026).

Situação: ✅ 1, 2, 3, 6 a 15 feitos · 4 já existia · 5 medir antes de publicar.

## 1. Cores dos compromissos ✅

- Compromisso **do casal**: sempre a cor padrão do app (o rosa, `rose600`).
- Compromisso **pessoal**: o fundo do quadradinho usa a cor que a pessoa escolheu em
  _Minha conta_ (hoje já existe a escolha de cor do avatar, com 6 opções; hoje os pessoais
  usam cores fixas `mine`/`partner`).
- Cada pessoa com a sua cor, diferente da do casal. A cor do casal (rosa) não deve estar entre
  as opções pessoais, para não confundir.

## 2. Nova aba "Finanças" (Notas continua como está) ✅

- Cadastrar **contas fixas recorrentes** (ex.: aluguel, internet, cartão).
- Cada conta é **do casal** (os dois veem) ou **pessoal/privada** (só quem criou vê).
- Gera **lembrete** antes do vencimento.
- Sugestão de campos: nome, valor, dia do vencimento, repetição (mensal, anual...), quantos
  dias antes avisar e "marcar como paga" no mês.
- Decidido: contas privadas ficam **no servidor**, protegidas por RLS para só o dono ver.
- Feito: tabela `bills` (migration `20260930120100_bills.sql`), sincronização offline, tela
  Finanças (total do mês, pago/falta, marcar como paga, atrasadas), formulário, lembretes e
  opção "Contas a pagar" em Notificações. Testes de privacidade no banco (`bills.test.ts`).

## 3. Foto de perfil ✅

- Poder colocar uma foto em _Minha conta_.
- Ajuste como nos apps modernos: arrastar para enquadrar, dar zoom e escolher o melhor ângulo
  (recorte circular).
- Feito: tela "Ajustar foto" (arrastar, pinça, toque duplo e botões − / +), envio em JPEG
  512×512 para o bucket **privado** `avatars` (só a pessoa e o parceiro veem, por URL
  temporária), remover foto, e as fotos são apagadas ao excluir a conta. Migration
  `20260930120200_avatars.sql` e testes em `avatars.test.ts`.
- Precisa de um **novo build** do app (entraram `expo-image-picker` e `expo-image-manipulator`).

## 4. Tema claro ou escuro

- Já existe: _Nós › Aparência_ (claro, escuro ou seguir o sistema). Conferir se está fácil de
  achar.

## 5. Dúvida: app lento

- Parte da lentidão é do modo de teste (_development build_): o código vem do computador pelo
  Wi-Fi, sem otimização e com verificações extras. A versão da loja é bem mais rápida.
- Antes de publicar, gerar um build de pré-visualização (`--profile preview`) para medir a
  velocidade real e corrigir o que ainda estiver lento.

## 6. Seletor de cor prismático (21/10/2026) ✅

- "Sua cor" com visual prismático (degradês, faixas diagonais de luz, profundidade) num palco
  escuro, 15 opções, prévia em tempo real (avatar, nome da cor, código hex, ✓).
- **Separação**: o degradê é só a apresentação no seletor; o que identifica a pessoa (avatar,
  barra e ponto dos compromissos, calendário) é a **cor sólida** de cada opção. Textos usam um
  tom derivado com contraste de 4.5:1 garantido em teste.
- Feito: `src/design-system/tokens/person-colors.ts` (as 15 opções), `PrismSwatch`,
  `PrismColorPicker`, atualização otimista no `useUpdateProfile`. As 6 chaves antigas continuam
  válidas e com os mesmos tons. Migration `20261021120000_prismatic_colors.sql` só amplia a lista
  aceita em `profiles.avatar_color` (nenhum dado muda).
- Acessibilidade: grupo de rádio com nomes, setas/Espaço/Enter no teclado (web), anel de foco,
  "reduzir movimento" respeitado.
- Para testar no celular: aplicar a migration no TST e gerar um build novo (ou `eas update`).

## Rodada de 22/10/2026

### 7. Animação mais elegante nas folhas ✅

- Todas as folhas que sobem de baixo (Alterar senha, Excluir conta, "+", confirmações, foto…)
  usam o mesmo `BottomSheet`: agora sobem com desaceleração longa, sem quique (curva das folhas
  do iOS, 420 ms), o fundo escurece junto, e **descem animadas ao fechar** (antes o Modal sumia
  de uma vez). "Reduzir movimento" do sistema continua respeitado. Tempos em `motion.sheet`.

### 8. Termos, Política de Privacidade e LGPD ✅ (falta revisão jurídica)

- Texto conferido contra o código e reescrito. Detalhes e pendências da auditoria em
  `docs/PRIVACIDADE.md` ("Revisão de 22/10/2026"). Versão dos termos: `2026-10`.

### 9. Barra de navegação ✅

- Antes: 5 abas + "+" no meio = 6 espaços, com o "+" fora do centro (3 de um lado, 2 do outro).
- Agora: cápsula flutuante com as 5 abas igualmente espaçadas e o destaque deslizando até a
  aba escolhida; o "+" virou um botão redondo flutuante ao lado da cápsula.

### 10. Dias em destaque na Agenda ✅

- Semana e Próximos: cada dia tem um cabeçalho com selo (DOM / 18), nome do dia em destaque,
  data por extenso e a quantidade de compromissos. Hoje tem o selo cheio na cor do app; dias
  que já passaram ficam um pouco apagados.
- Mês: o dia com compromisso ganha fundo suave e leve brilho na cor de quem marcou (rosé quando
  é do casal); com mais de um dono, o fundo se divide em faixas. Saíram os pontinhos.

## Rodada de 22/10/2026 (tarde): web, iPhone e segurança

Ideia do usuário: como o iPhone não instala APK, ter um site de apresentação e o próprio app pelo
navegador para o iPhone (Android continua com o APK). Detalhes e publicação em `docs/WEB.md`.

### 11. App pelo navegador (PWA) ✅

- Instalável no iPhone pelo Safari (Adicionar à Tela de Início), com ícone, tela cheia e abertura
  instantânea (service worker guarda a versão no aparelho). `npm run build:web`.

### 12. Login rápido ✅

- No navegador o login fica salvo. Nos dois (celular e web) o último "espaço do casal" fica guardado,
  então a agenda abre do aparelho na hora, sem esperar a internet.
- Corrigido junto: sem internet a agenda aparecia vazia (consultas locais eram pausadas).
- Pacote menor e mais rápido de abrir: ícones e datas importados um a um (web: 7,3 → 4,0 MB).

### 13. Notas com PIN e digital/rosto ✅

- Web: PIN de 6 números (cria no primeiro uso, recusa PIN óbvio, espera crescente após erros) e
  digital/rosto pela passkey do aparelho. Notas cifradas no aparelho. "Esqueci o PIN" apaga as notas.
- Celular: opção "Pedir digital ou rosto nas notas" agora aparece em Nós › Segurança.

### 14. Desbloquear o app com digital ou rosto ✅

- Nós › Segurança › Bloquear o DuoDay (celular e web): pede a biometria ao abrir e ao voltar depois
  de 30 segundos fora. Alternativa: entrar com e-mail e senha.

### 15. Lembretes no iPhone (Web Push) e site ✅

- O servidor envia os lembretes de quem usa o app pelo navegador (texto genérico sem consentimento)
  e o aviso "novo compromisso do parceiro" também chega por Web Push.
- Site `duoday.com.br` (`site/`, `npm run build:site`): apresentação, telas, privacidade, instalação
  no iPhone e no Android, perguntas frequentes, Privacidade e Termos.
