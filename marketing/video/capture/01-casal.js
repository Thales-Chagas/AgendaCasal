// Etapa 1: boas-vindas, cadastro, confirmação por código e o vínculo do casal em tempo real.
const { BASE, PEOPLE, open, shot, code, step } = require('./lib');

async function signUp(page, person, capture) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  if (capture) {
    await shot(page, '01-boas-vindas-1');
    await page.getByText('Continuar', { exact: true }).click();
    await shot(page, '01-boas-vindas-2');
    await page.getByText('Continuar', { exact: true }).click();
    await shot(page, '01-boas-vindas-3');
    await page.getByText('Começar', { exact: true }).click();
  } else {
    await page.getByText('Pular').click();
  }
  await page.waitForTimeout(700);
  await page.getByPlaceholder('Seu nome ou apelido').fill(person.name);
  await page.getByPlaceholder('voce@exemplo.com').fill(person.email);
  await page.getByPlaceholder('Mínimo de 8 caracteres').fill(person.password);
  await page.getByRole('checkbox').first().click();
  if (capture) await shot(page, '02-cadastro');
  await page.getByText('Criar conta', { exact: true }).last().click();
  const otp = await code(person.email);
  await page.waitForTimeout(800);
  if (capture) await shot(page, '03-codigo');
  await page.keyboard.type(otp, { delay: 80 });
  await page.waitForTimeout(3500);
}

(async () => {
  const bia = await open('bia');
  const rafa = await open('rafa');

  await step('cadastro da Bia', () => signUp(bia.page, PEOPLE.bia, true));
  await step('tela "Como você quer começar?"', () => shot(bia.page, '04-comecar'));
  await step('cadastro do Rafa', () => signUp(rafa.page, PEOPLE.rafa, false));

  let invite = '';
  await step('Bia cria o convite', async () => {
    await bia.page.getByText('Criar nossa agenda').click();
    await bia.page.waitForTimeout(2500);
    await shot(bia.page, '05-convite');
    invite = (await bia.page.innerText('body')).match(/\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/)?.[1] ?? '';
    console.log('  código do convite:', invite);
  });

  await step('Rafa entra com o convite', async () => {
    await rafa.page.getByText('Entrar com convite').first().click();
    await rafa.page.waitForTimeout(1200);
    await rafa.page.getByPlaceholder('ABCD-2345').fill(invite);
    await shot(rafa.page, '06-entrar-com-convite');
    await rafa.page.getByText('Aceitar e conectar').click();
    await rafa.page.waitForTimeout(1500);
    if (await rafa.page.getByText('Começar sem seus compromissos?').count()) {
      await shot(rafa.page, '06b-confirmar');
      await rafa.page.getByText('Aceitar e conectar').last().click();
    }
    await rafa.page.waitForTimeout(3000);
    await shot(rafa.page, '07-conectados-rafa');
  });

  await step('Bia vê a conexão em tempo real', async () => {
    await bia.page.waitForTimeout(2500);
    await shot(bia.page, '07-conectados-bia');
  });

  await bia.context.close();
  await rafa.context.close();
})();
