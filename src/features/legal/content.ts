/**
 * Textos legais exibidos no app. ATENÇÃO: rascunho técnico, conferido contra o código em
 * 22/10/2026. Precisa de revisão jurídica antes da publicação nas lojas (ver
 * docs/PRIVACIDADE.md). Os trechos entre colchetes ([...]) precisam ser preenchidos.
 */
export type LegalDoc = { title: string; updatedAt: string; sections: { heading: string; body: string }[] };

/** Quem responde pelo tratamento dos dados (controlador, LGPD art. 5º, VI). */
const CONTROLLER = '[nome completo ou razão social], [CPF ou CNPJ], com endereço em [cidade/UF]';
const PRIVACY_EMAIL = 'privacidade@duoday.com.br';
const SUPPORT_EMAIL = 'ajuda@duoday.com.br';

export const privacyPolicy: LegalDoc = {
  title: 'Política de Privacidade',
  updatedAt: 'Outubro de 2026',
  sections: [
    {
      heading: 'Resumo em linguagem simples',
      body:
        'Agenda e datas especiais: compartilhadas só com a pessoa que você conectar.\n' +
        'Contas a pagar: as do casal os dois veem; as marcadas como "só minha" só você vê.\n' +
        'Notas: ficam somente no seu celular, criptografadas. Nós não temos acesso.\n' +
        'Conta: seu e-mail nunca é mostrado a ninguém; seu parceiro vê seu nome, sua cor e sua foto.\n' +
        'Não vendemos dados, não usamos publicidade e não rastreamos o que você faz no app.',
    },
    {
      heading: 'Quem é o responsável',
      body:
        `O controlador dos dados é ${CONTROLLER}. ` +
        `Para qualquer assunto de privacidade, inclusive falar com o encarregado, escreva para ${PRIVACY_EMAIL}.`,
    },
    {
      heading: 'Quais dados tratamos',
      body:
        'Cadastro: nome ou apelido, e-mail e senha (guardada só como código irreversível).\n' +
        'Perfil: a cor que você escolher e, se quiser, uma foto (só a que você escolher, já recortada).\n' +
        'Conteúdo: compromissos, datas especiais e contas a pagar que vocês cadastram.\n' +
        'Configurações: preferências de notificação e, se você ativar as notificações, um identificador do ' +
        'aparelho para enviá-las.\n' +
        'Registro do aceite: versão, data e hora em que você aceitou estes termos.\n' +
        'Registros de acesso: endereço IP, data e hora de entradas na conta, gerados pelo servidor.\n' +
        'No app pelo navegador: a inscrição de notificações do navegador e a lista dos próximos lembretes ' +
        '(horário e texto genérico, ou o nome do compromisso se você autorizar), que o servidor guarda só ' +
        'até enviar.\n' +
        'Não coletamos localização, contatos, outras fotos da galeria, identificador de publicidade nem ' +
        'dados de uso para análise de comportamento.',
    },
    {
      heading: 'Para que usamos e com qual base legal',
      body:
        'Para criar sua conta, sincronizar a agenda entre vocês dois e enviar os lembretes que vocês ' +
        'ativarem: execução do contrato (LGPD, art. 7º, V).\n' +
        'Foto de perfil, notificações no aparelho e detalhes dos compromissos na tela de bloqueio: ' +
        'consentimento (art. 7º, I), que você pode retirar a qualquer momento no próprio app.\n' +
        'Registro do aceite e registros de acesso: cumprimento de obrigação legal (art. 7º, II), inclusive ' +
        'o Marco Civil da Internet (Lei 12.965/2014, art. 15).\n' +
        'Para mandar os e-mails da conta (código de confirmação e troca de senha): execução do contrato.',
    },
    {
      heading: 'Dados sensíveis',
      body:
        'O DuoDay não pede dados sensíveis (como saúde ou religião). Se você escrever algo assim num ' +
        'compromisso, isso fica visível só para vocês dois e é tratado apenas para mostrar a agenda.\n' +
        'O desbloqueio por digital ou rosto é feito pelo sistema do aparelho (no navegador, por uma chave de ' +
        'acesso, a "passkey", guardada no próprio aparelho): o DuoDay nunca recebe nem guarda sua biometria.',
    },
    {
      heading: 'Com quem compartilhamos',
      body:
        'Com a pessoa conectada a você: agenda, datas especiais, contas do casal, nome, cor e foto.\n' +
        'Com prestadores que operam o serviço em nosso nome, só para isso:\n' +
        '• Supabase (servidor e banco de dados; os dados ficam na região de São Paulo, Brasil);\n' +
        '• Brevo (envio dos e-mails da conta);\n' +
        '• Expo (envio das notificações e das atualizações do app de celular);\n' +
        '• Cloudflare (hospedagem do site e do app pelo navegador);\n' +
        '• Apple, Google e Mozilla (entrega das notificações no aparelho e no navegador).\n' +
        'Também podemos fornecer dados quando houver ordem judicial ou obrigação legal. Não vendemos dados.',
    },
    {
      heading: 'Transferência internacional',
      body:
        'Alguns desses prestadores são empresas de outros países (Estados Unidos e União Europeia) e podem ' +
        'tratar dados fora do Brasil, por exemplo, para entregar notificações. Isso é feito com cláusulas ' +
        'contratuais e medidas de segurança, conforme o art. 33 da LGPD. Por padrão, as notificações levam ' +
        'só um texto genérico, sem o nome dos compromissos.',
    },
    {
      heading: 'Notas privadas',
      body:
        'As notas nunca saem do seu aparelho: não são enviadas aos nossos servidores nem ao seu parceiro, ' +
        'e ficam criptografadas no aparelho. No app pelo navegador, elas só abrem com o seu PIN ou com a sua ' +
        'digital ou rosto. Se o app for desinstalado ou os dados do navegador forem apagados, elas são ' +
        'perdidas; use "Exportar minhas notas" na tela de Notas para guardar uma cópia.',
    },
    {
      heading: 'Seus direitos',
      body:
        'A LGPD (art. 18) garante a você: confirmar se tratamos seus dados, acessá-los, corrigi-los, ' +
        'levá-los para outro serviço, pedir anonimização, bloqueio ou eliminação, saber com quem são ' +
        'compartilhados, retirar o consentimento e se opor a um tratamento.\n' +
        'No app: Nós › Privacidade › Exportar meus dados (acesso e portabilidade); Nós › Minha conta ' +
        '(correção e Excluir minha conta); Nós › Notificações (retirar consentimentos).\n' +
        `Pelo e-mail ${PRIVACY_EMAIL} respondemos em até 15 dias. Você também pode reclamar à ` +
        'Autoridade Nacional de Proteção de Dados (ANPD).',
    },
    {
      heading: 'Por quanto tempo guardamos',
      body:
        'Enquanto sua conta existir. Itens que você exclui são apagados definitivamente em até 30 dias.\n' +
        'Ao excluir a conta, apagamos na hora seu cadastro, perfil, foto, preferências, identificadores ' +
        'do aparelho, suas contas pessoais e os compromissos sob sua responsabilidade. O que é do casal ' +
        '(compromissos "Nosso", datas especiais e contas do casal) continua com seu parceiro, porque ' +
        'também pertence a ele, sem a indicação de quem criou.\n' +
        'Lembretes do app pelo navegador são apagados do servidor até 2 dias depois de enviados.\n' +
        'Registros de acesso são guardados por 6 meses, como exige o Marco Civil da Internet. Cópias de ' +
        'segurança podem conter dados excluídos por até 30 dias, até serem substituídas.',
    },
    {
      heading: 'Segurança',
      body:
        'Usamos conexão criptografada, controle de acesso no banco de dados (um casal nunca vê os dados de ' +
        'outro) e criptografia no aparelho. Se acontecer um incidente de segurança que possa causar risco ' +
        'ou dano relevante, avisaremos você e a ANPD, como manda a lei.',
    },
    {
      heading: 'Cookies e armazenamento no aparelho',
      body:
        'O site e o app não usam cookies de propaganda nem de rastreamento. O app pelo navegador guarda no ' +
        'próprio aparelho o que precisa para funcionar: sua sessão, a cópia da agenda e as notas ' +
        'criptografadas. Ao sair da conta, a sessão e a cópia da agenda são apagadas deste aparelho.',
    },
    {
      heading: 'Idade mínima',
      body: 'O DuoDay é destinado a maiores de 18 anos. Não coletamos dados de crianças e adolescentes de propósito.',
    },
    {
      heading: 'Mudanças nesta política',
      body:
        'Se esta política mudar de forma relevante, avisaremos no app antes de a mudança valer e, quando ' +
        'necessário, pediremos um novo aceite.',
    },
  ],
};

export const termsOfUse: LegalDoc = {
  title: 'Termos de Uso',
  updatedAt: 'Outubro de 2026',
  sections: [
    {
      heading: 'Aceite',
      body:
        `Estes termos valem entre você e ${CONTROLLER}, responsável pelo DuoDay. Ao criar uma conta, ` +
        'você declara que leu e aceita estes termos e a Política de Privacidade.',
    },
    {
      heading: 'O serviço',
      body:
        'O DuoDay é uma agenda compartilhada entre duas pessoas, com datas especiais, contas a pagar com ' +
        'lembretes e um espaço de notas privadas que fica só no aparelho. O uso é gratuito. Se um dia ' +
        'existir algo pago, isso será avisado antes e só será cobrado com sua concordância.',
    },
    {
      heading: 'Sua conta',
      body:
        'É preciso ter 18 anos ou mais. Cada pessoa tem sua própria conta, deve informar um e-mail válido e ' +
        'é responsável por manter a senha em segredo. Se suspeitar que alguém usou sua conta, troque a ' +
        `senha e avise ${SUPPORT_EMAIL}.`,
    },
    {
      heading: 'Conexão entre contas',
      body:
        'Ao aceitar um convite, você passa a compartilhar com quem convidou a agenda, as datas especiais e ' +
        'as contas do casal, e os dois podem criar, editar e excluir esses itens. Contas marcadas como ' +
        '"só minha" e as notas continuam só suas. Qualquer um dos dois pode desfazer a conexão quando ' +
        'quiser; cada pessoa fica com seus compromissos.',
    },
    {
      heading: 'Seu conteúdo',
      body:
        'O que você cadastra é seu. Você nos autoriza a guardar e exibir esse conteúdo apenas para o ' +
        'funcionamento do app (por exemplo, para mostrá-lo ao seu parceiro e enviar lembretes).',
    },
    {
      heading: 'Uso adequado',
      body:
        'Não use o app para guardar conteúdo ilegal, para monitorar alguém sem o conhecimento dessa pessoa, ' +
        'para tentar acessar dados de outros usuários ou para atrapalhar o funcionamento do serviço.',
    },
    {
      heading: 'Lembretes e disponibilidade',
      body:
        'Trabalhamos para o app funcionar sempre, mas lembretes dependem do celular, da internet e dos ' +
        'serviços da Apple e do Google, e podem atrasar ou não chegar. Não use o DuoDay como único aviso ' +
        'para compromissos críticos, como remédios ou prazos legais. Notas que ficam só no aparelho se ' +
        'perdem se ele for perdido ou o app desinstalado, a menos que você as exporte.',
    },
    {
      heading: 'Responsabilidade',
      body:
        'Respondemos pelos danos que causarmos, nos limites da lei, inclusive do Código de Defesa do ' +
        'Consumidor. Não respondemos por falhas de serviços de terceiros fora do nosso controle nem pelo ' +
        'conteúdo que os usuários cadastram.',
    },
    {
      heading: 'Encerramento',
      body:
        'Você pode excluir sua conta a qualquer momento em Nós › Minha conta. Podemos suspender contas que ' +
        'violem estes termos, avisando o motivo, salvo quando a lei impedir.',
    },
    {
      heading: 'Propriedade intelectual',
      body: 'O nome DuoDay, a marca, o visual e o código do app pertencem ao responsável pelo DuoDay.',
    },
    {
      heading: 'Alterações',
      body: 'Se estes termos mudarem, avisaremos no app antes de a mudança valer e pediremos um novo aceite quando necessário.',
    },
    {
      heading: 'Lei e foro',
      body:
        'Estes termos seguem as leis do Brasil. Eventuais disputas podem ser levadas ao foro do seu ' +
        `domicílio. Dúvidas: ${SUPPORT_EMAIL}.`,
    },
  ],
};
