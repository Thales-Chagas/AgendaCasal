# Privacidade e LGPD

> **Rascunho técnico.** Descreve como o sistema trata dados pessoais. Precisa de revisão
> jurídica antes da publicação. O texto exibido no app fica em `src/features/legal/content.ts`.

## Mapa de dados

| Dado                              | Onde fica                           | Quem acessa                             | Base legal (LGPD, art. 7º)                | Retenção                                             |
| --------------------------------- | ----------------------------------- | --------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| E-mail e senha (hash)             | Supabase Auth (São Paulo)           | Só o titular                            | Execução de contrato (V)                  | Até excluir a conta                                  |
| Nome ou apelido e cor do avatar   | `profiles`                          | Titular e parceiro conectado            | Execução de contrato (V)                  | Até excluir a conta                                  |
| Compromissos e datas especiais    | `events`, `special_dates`           | Os dois membros do casal                | Execução de contrato (V)                  | Até excluir. Itens excluídos são apagados em 30 dias |
| Contas do casal (Finanças)        | `bills` (`owner_scope = couple`)    | Os dois membros do casal                | Execução de contrato (V)                  | Até excluir. Itens excluídos são apagados em 30 dias |
| Contas pessoais (Finanças)        | `bills` (`owner_scope = person`)    | **Só o titular** (RLS)                  | Execução de contrato (V)                  | Até excluir; somem ao excluir a conta                |
| Foto de perfil (opcional)         | Storage privado `avatars`           | Titular e parceiro (URL temporária)     | Consentimento (I): a pessoa escolhe       | Trocada/removida pela pessoa; apagada ao excluir     |
| Preferências de notificação       | `notification_settings`             | Só o titular                            | Execução de contrato (V)                  | Até excluir a conta                                  |
| Token de push do aparelho         | `push_tokens`                       | Só o titular (e o servidor para enviar) | Consentimento (I) ao ativar notificações  | Removido ao sair ou excluir a conta                  |
| Aceite dos termos (versão e data) | `profiles`                          | Só o titular                            | Cumprimento de obrigação (II)             | Até excluir a conta                                  |
| Registros de acesso (IP, data)    | Supabase Auth (`audit_log_entries`) | Só o controlador                        | Obrigação legal (II), Marco Civil art. 15 | 6 meses (**limpeza ainda não implementada**)         |
| E-mail para códigos e senha       | Brevo (SMTP), só no envio           | Operador                                | Execução de contrato (V)                  | Conforme contrato do operador                        |
| **Notas privadas**                | **Somente no aparelho** (SQLCipher) | **Só o titular**                        | Não há tratamento pelo controlador        | Até a pessoa apagar ou desinstalar o app             |
| Cópia local da agenda             | Aparelho (SQLCipher)                | Titular                                 | Execução de contrato (V)                  | Apagada ao sair da conta                             |

**Não coletamos:** localização do aparelho, contatos, outras fotos da galeria (só a escolhida para o
perfil, já recortada), identificadores de publicidade ou
analytics de comportamento.

## Medidas técnicas

- **Controle de acesso no banco (RLS)**, negando por padrão. Testes automatizados garantem
  que um casal não acessa dados de outro, nem via API nem via tempo real.
- **Criptografia em trânsito** (HTTPS/TLS) e **em repouso**: no servidor (Supabase/AWS) e
  no aparelho (SQLCipher, AES-256, com chave no Keychain/Keystore marcada "somente este
  aparelho").
- **Minimização:** o parceiro vê apenas o nome. O e-mail nunca é exibido a ninguém.
- **Push com texto genérico por padrão**, porque o conteúdo passa por Apple e Google.
  Detalhes só com consentimento.
- **Logs sem dados pessoais:** o logger mascara e-mails, tokens e conteúdos.
- **Códigos de convite** guardados apenas como hash, com validade de 48 h, uso único e limite
  de tentativas.
- **Sessão** guardada no Keychain/Keystore, com tokens rotativos.

## Direitos do titular (art. 18), dentro do app

| Direito                           | Onde                                                            |
| --------------------------------- | --------------------------------------------------------------- |
| Confirmação e acesso              | Nós › Privacidade › Exportar meus dados                         |
| Correção                          | Nós › Minha conta                                               |
| Portabilidade                     | Exportar meus dados (JSON) e Notas › Exportar minhas notas      |
| Eliminação                        | Nós › Minha conta › Excluir minha conta (confirmação com senha) |
| Revogação do consentimento        | Nós › Notificações                                              |
| Informação sobre compartilhamento | Nós › Privacidade                                               |

**Ao excluir a conta:** conta, perfil, preferências, tokens e compromissos pessoais são
apagados imediatamente no servidor. Os compromissos "Nosso" continuam com o parceiro,
pois também pertencem a ele. No aparelho, são apagadas as notas, a cópia local da agenda
e os lembretes.

**Ao desfazer o vínculo:** nada é apagado. Cada pessoa fica com seus compromissos. A
explicação completa aparece na tela antes da confirmação.

## Operadores e transferência internacional (art. 33)

| Operador       | Para quê                                  | Onde                           |
| -------------- | ----------------------------------------- | ------------------------------ |
| Supabase       | Banco, autenticação, arquivos, funções    | AWS São Paulo; empresa nos EUA |
| Brevo          | E-mails de código e troca de senha        | União Europeia (França)        |
| Expo           | Envio de push (`exp.host`) e atualizações | EUA                            |
| Apple / Google | Entrega das notificações (APNs / FCM)     | EUA                            |

## Revisão de 22/10/2026 (texto conferido contra o código)

Corrigido no texto do app (`src/features/legal/content.ts`, versão dos termos `2026-10`):

- Caminhos errados ("Perfil › …") → "Nós › …".
- O parceiro vê **nome, cor e foto** (a tela Privacidade dizia "apenas seu nome").
- Exclusão da conta: a política dizia "dados removidos imediatamente", mas o que é do casal
  (compromissos "Nosso", datas especiais, contas do casal) fica com o parceiro, sem autoria. Agora
  está explicado.
- Faltavam: identificação do controlador e canal do encarregado (art. 9º e 41), lista completa
  dos direitos do art. 18 e prazo de resposta (art. 19), reclamação à ANPD, operadores (Brevo e
  Expo não eram citados), transferência internacional (art. 33), dados sensíveis e biometria
  (o desbloqueio é do sistema), registros de acesso (Marco Civil), incidentes (art. 48), idade
  mínima de 18 anos (antes "ou autorização dos responsáveis", que exigiria consentimento
  específico dos pais, art. 14) e mudanças na política.
- Termos: faltavam aceite, gratuidade, conteúdo do usuário, aviso de que lembretes podem
  falhar, responsabilidade nos limites do CDC, encerramento, propriedade intelectual e foro do
  domicílio do consumidor.
- Tela Privacidade: novo cartão "Finanças" (contas do casal × "só minha").

Conferido e **de acordo** com o código: exclusão lógica apagada em 30 dias (`purge_soft_deleted`,
pg_cron), exclusão da conta em cascata (perfil, preferências, tokens, contas pessoais,
compromissos sob responsabilidade da pessoa) e fotos apagadas antes; exportação (conta, perfil,
preferências, casal, compromissos, datas e contas visíveis à pessoa); push genérico por padrão;
notas só no aparelho; logs do app mascarando dados pessoais e sem envio para fora.

## App pelo navegador (22/10/2026)

- O texto do app foi atualizado: lembretes guardados no servidor até o envio (genéricos sem
  consentimento), passkey para digital/rosto, notas cifradas no aparelho com PIN, Cloudflare e os
  serviços de push dos navegadores, e a seção "Cookies e armazenamento no aparelho".
- Medidas: CSP restrita no site e no app web (scripts só do próprio domínio), notas com
  AES-256-GCM e chave derivada do PIN (PBKDF2-SHA-256, 600 mil iterações, espera crescente após 5
  erros) ou da passkey (PRF + HKDF); a chave só existe em memória e some ao sair do app.
- Web Push cifrado de ponta a ponta para o navegador (RFC 8291): Apple/Google/Mozilla só
  transportam. Cada lembrete é enviado uma única vez (`claim_due_web_pushes`).
- Limitação a registrar: no navegador não há cofre de hardware como o Keychain. Um PIN de 6 números
  protege bem contra quem pega o aparelho, mas não contra quem copia os arquivos do navegador e
  tenta todos os PINs fora do aparelho; a passkey não tem essa fraqueza. Por isso o app oferece a
  biometria logo depois do PIN.

## Pendências antes de publicar (para a auditoria)

1. **Preencher o controlador** em `src/features/legal/content.ts` (`CONTROLLER`: nome ou razão
   social, CPF/CNPJ, cidade/UF). Hoje aparece entre colchetes.
2. **Registros de acesso por 6 meses**: a política promete; falta um job que apague
   `auth.audit_log_entries` com mais de 6 meses (e confirmar que o Supabase grava o IP).
3. **Cópias de segurança**: a política diz "até 30 dias". O backup semanal planejado precisa
   seguir esse prazo.
4. **Novo aceite quando a versão mudar**: a RPC `accept_terms` existe, mas o app ainda não pede
   o aceite de novo quando `TERMS_VERSION` muda (hoje só no cadastro).
5. Exportação ainda não inclui o arquivo da foto nem os tokens de push (só o caminho da foto).
6. E-mails `privacidade@` e `ajuda@duoday.com.br` funcionando (Email Routing da Cloudflare).
7. Encarregado: agente de pequeno porte pode dispensar a nomeação (Resolução CD/ANPD nº 2/2022,
   art. 11), mas precisa manter o canal de contato. Decidir e registrar.
8. Registro das operações de tratamento (art. 37) e contratos/DPAs com os operadores.
9. Revisão jurídica e publicação da política e dos termos em URL pública (`duoday.com.br`, já
   pronta em `site/`), que a Play Store exige, e o formulário _Data safety_ coerente com esta tabela.
10. Contratos/DPAs também com a Cloudflare.
