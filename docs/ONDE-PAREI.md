# Onde parei

Última atualização: 29/09/2026.

## Estado do projeto

- Todo o código está na branch `claude/magical-keller-lh4mgu` (ainda não foi para a `main`).
- Banco testado na nuvem: as 7 migrations aplicam sem erro, `npm run test:db` passa 62/62,
  `npm run check` passa 140/140 e `npm run db:lint` não acha erros.
- A última migration (`20260929120600_service_role_grants.sql`) dá à função de avisos para o
  parceiro acesso só às tabelas de que ela precisa. Já foi testada.

## Onde travou

Ao seguir a seção 1 do `docs/SETUP.md` no Windows (PowerShell), deram três erros:

1. Os comandos rodaram em `C:\WINDOWS\system32`, fora da pasta do projeto.
2. O projeto ainda não foi baixado para o computador.
3. O Docker não está instalado (`docker: command not found`).

## Próximos passos

### Preparar o computador (uma vez só)

Instalar e depois reabrir o PowerShell:

- Git: https://git-scm.com/download/win
- Node.js 22 LTS: https://nodejs.org
- Docker Desktop (só para o caminho B): https://www.docker.com/products/docker-desktop.
  Pede WSL2 e reinício; abrir e esperar o ícone ficar verde.

Baixar o projeto (um comando por vez):

```powershell
cd $HOME\Documents
git clone https://github.com/Thales-Chagas/AgendaCasal.git
cd AgendaCasal
git checkout claude/magical-keller-lh4mgu
npm install
```

### Escolher o caminho (ainda não decidido)

**A. Direto para o Supabase online (recomendado).** Não precisa de Docker. Seguir a seção 2 do
`docs/SETUP.md`:

```powershell
npx supabase login
npx supabase link --project-ref SEU_REF
npx supabase db push
copy .env.example .env.local
```

No `.env.local`, preencher a URL e a chave publicável (_Project Settings › API Keys_).
`SEU_REF` é o código na URL do projeto: `https://SEU_REF.supabase.co`.

**B. Banco local.** Com o Docker Desktop aberto, dentro da pasta `AgendaCasal`:

```powershell
npm run db:start
npx supabase status
copy .env.example .env.local
```

Dica: no PowerShell, rodar um comando por vez em vez de colar o bloco inteiro.
