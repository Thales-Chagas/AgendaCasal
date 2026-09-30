# Privacidade e LGPD

> **Rascunho técnico.** Descreve como o sistema trata dados pessoais. Precisa de revisão
> jurídica antes da publicação. O texto exibido no app fica em `src/features/legal/content.ts`.

## Mapa de dados

| Dado                              | Onde fica                           | Quem acessa                             | Base legal (LGPD, art. 7º)               | Retenção                                             |
| --------------------------------- | ----------------------------------- | --------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| E-mail e senha (hash)             | Supabase Auth (São Paulo)           | Só o titular                            | Execução de contrato (V)                 | Até excluir a conta                                  |
| Nome ou apelido e cor do avatar   | `profiles`                          | Titular e parceiro conectado            | Execução de contrato (V)                 | Até excluir a conta                                  |
| Compromissos e datas especiais    | `events`, `special_dates`           | Os dois membros do casal                | Execução de contrato (V)                 | Até excluir. Itens excluídos são apagados em 30 dias |
| Contas do casal (Finanças)        | `bills` (`owner_scope = couple`)    | Os dois membros do casal                | Execução de contrato (V)                 | Até excluir. Itens excluídos são apagados em 30 dias |
| Contas pessoais (Finanças)        | `bills` (`owner_scope = person`)    | **Só o titular** (RLS)                  | Execução de contrato (V)                 | Até excluir; somem ao excluir a conta                |
| Foto de perfil (opcional)         | Storage privado `avatars`           | Titular e parceiro (URL temporária)     | Consentimento (I): a pessoa escolhe      | Trocada/removida pela pessoa; apagada ao excluir     |
| Preferências de notificação       | `notification_settings`             | Só o titular                            | Execução de contrato (V)                 | Até excluir a conta                                  |
| Token de push do aparelho         | `push_tokens`                       | Só o titular (e o servidor para enviar) | Consentimento (I) ao ativar notificações | Removido ao sair ou excluir a conta                  |
| Aceite dos termos (versão e data) | `profiles`                          | Só o titular                            | Cumprimento de obrigação (II)            | Até excluir a conta                                  |
| **Notas privadas**                | **Somente no aparelho** (SQLCipher) | **Só o titular**                        | Não há tratamento pelo controlador       | Até a pessoa apagar ou desinstalar o app             |
| Cópia local da agenda             | Aparelho (SQLCipher)                | Titular                                 | Execução de contrato (V)                 | Apagada ao sair da conta                             |

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

## Pendências (fora do código)

- Nomear o encarregado (DPO) e publicar o canal de contato.
- Revisão jurídica da política e dos termos, e publicação em URL pública.
- Registro das operações de tratamento (art. 37).
- Contratos e cláusulas com os operadores (Supabase, provedor de SMTP e Expo para push).
