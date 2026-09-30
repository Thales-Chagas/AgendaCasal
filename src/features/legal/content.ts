/**
 * Textos legais exibidos no app. ATENÇÃO: rascunho técnico. Precisa de revisão
 * jurídica antes da publicação nas lojas (ver docs/PRIVACIDADE.md).
 */
export type LegalDoc = { title: string; updatedAt: string; sections: { heading: string; body: string }[] };

export const privacyPolicy: LegalDoc = {
  title: 'Política de Privacidade',
  updatedAt: 'Setembro de 2026',
  sections: [
    {
      heading: 'Resumo em linguagem simples',
      body:
        'Agenda: compartilhada só com a pessoa que você conectar.\n' +
        'Notas: ficam somente no seu celular, criptografadas. Nós não temos acesso.\n' +
        'Conta: seu nome e e-mail são usados apenas para o funcionamento do app.',
    },
    {
      heading: 'Quais dados coletamos',
      body:
        'Nome (ou apelido) e e-mail para criar sua conta; os compromissos e datas especiais que vocês cadastram; ' +
        'preferências de notificação; e, se você permitir, um identificador do aparelho para enviar notificações. ' +
        'Não coletamos localização do aparelho, contatos, fotos ou dados de uso para publicidade.',
    },
    {
      heading: 'Para que usamos',
      body:
        'Exclusivamente para oferecer a agenda compartilhada, sincronizar os dados entre vocês dois e enviar os ' +
        'lembretes que vocês ativarem (base legal: execução do contrato — LGPD, art. 7º, V). ' +
        'Detalhes de compromissos em notificações só aparecem se você autorizar (consentimento — art. 7º, I).',
    },
    {
      heading: 'Com quem compartilhamos',
      body:
        'Com a pessoa conectada a você (somente a agenda). Os dados ficam em servidores do Supabase na região de ' +
        'São Paulo (Brasil). Notificações passam pelos serviços da Apple ou do Google. Não vendemos dados.',
    },
    {
      heading: 'Notas privadas',
      body:
        'As notas nunca saem do seu aparelho: não são enviadas aos nossos servidores nem ao seu parceiro. ' +
        'Elas são criptografadas no celular. Se o app for desinstalado, as notas são perdidas.',
    },
    {
      heading: 'Seus direitos',
      body:
        'No app você pode ver e corrigir seus dados, exportar tudo (Perfil › Privacidade › Exportar meus dados) ' +
        'e excluir sua conta a qualquer momento (Perfil › Minha conta › Excluir conta). ' +
        'Dúvidas: privacidade@duoday.app.',
    },
    {
      heading: 'Por quanto tempo guardamos',
      body:
        'Enquanto sua conta existir. Itens excluídos são apagados definitivamente em até 30 dias. ' +
        'Ao excluir a conta, seus dados pessoais são removidos imediatamente.',
    },
  ],
};

export const termsOfUse: LegalDoc = {
  title: 'Termos de Uso',
  updatedAt: 'Setembro de 2026',
  sections: [
    {
      heading: 'O serviço',
      body: 'O DuoDay é uma agenda compartilhada entre duas pessoas, com um espaço de notas privadas por aparelho.',
    },
    {
      heading: 'Sua conta',
      body:
        'Cada pessoa tem sua própria conta e é responsável por manter a senha em segurança. ' +
        'É necessário ter 18 anos ou mais, ou autorização dos responsáveis.',
    },
    {
      heading: 'Conexão entre contas',
      body:
        'Ao aceitar um convite, você passa a compartilhar a agenda com quem convidou. ' +
        'Qualquer um dos dois pode desfazer a conexão quando quiser, sem perder seus compromissos pessoais.',
    },
    {
      heading: 'Uso adequado',
      body: 'Não use o app para armazenar conteúdo ilegal ou para monitorar alguém sem o conhecimento dessa pessoa.',
    },
    {
      heading: 'Alterações',
      body: 'Se estes termos mudarem, avisaremos no app e pediremos um novo aceite quando necessário.',
    },
  ],
};
