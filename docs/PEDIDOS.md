# Pedidos de mudança

Pedidos feitos depois de ver o app rodando no celular (30/09/2026). Nada disso foi feito ainda.

## 1. Cores dos compromissos

- Compromisso **do casal**: sempre a cor padrão do app (o rosa, `rose600`).
- Compromisso **pessoal**: o fundo do quadradinho usa a cor que a pessoa escolheu em
  _Minha conta_ (hoje já existe a escolha de cor do avatar, com 6 opções; hoje os pessoais
  usam cores fixas `mine`/`partner`).
- Cada pessoa com a sua cor, diferente da do casal. A cor do casal (rosa) não deve estar entre
  as opções pessoais, para não confundir.

## 2. Nova aba "Financeiro" (Notas continua como está)

- Cadastrar **contas fixas recorrentes** (ex.: aluguel, internet, cartão).
- Cada conta é **do casal** (os dois veem) ou **pessoal/privada** (só quem criou vê).
- Gera **lembrete** antes do vencimento.
- Sugestão de campos: nome, valor, dia do vencimento, repetição (mensal, anual...), quantos
  dias antes avisar e "marcar como paga" no mês.
- A decidir: contas privadas ficam no servidor, protegidas para só o dono ver (funcionam em
  mais de um aparelho), ou só no aparelho, como as notas.

## 3. Foto de perfil

- Poder colocar uma foto em _Minha conta_.
- Ajuste como nos apps modernos: arrastar para enquadrar, dar zoom e escolher o melhor ângulo
  (recorte circular).

## 4. Tema claro ou escuro

- Já existe: _Nós › Aparência_ (claro, escuro ou seguir o sistema). Conferir se está fácil de
  achar.

## 5. Dúvida: app lento

- Parte da lentidão é do modo de teste (_development build_): o código vem do computador pelo
  Wi-Fi, sem otimização e com verificações extras. A versão da loja é bem mais rápida.
- Antes de publicar, gerar um build de pré-visualização (`--profile preview`) para medir a
  velocidade real e corrigir o que ainda estiver lento.
