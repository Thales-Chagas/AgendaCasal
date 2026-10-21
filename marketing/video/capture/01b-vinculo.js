// Etapa 1b: Rafa cria a conta e aceita o convite enquanto a Bia espera na tela do convite.
const { BASE, PEOPLE, open, shot, code, step, signIn } = require('./lib');

(async () => {
  const bia = await open('bia');
  const rafa = await open('rafa');

  let invite = '';
  await step('Bia abre o convite e espera', async () => {
    await signIn(bia.page, PEOPLE.bia);
    await bia.page.goto(`${BASE}couple/invite`, { waitUntil: 'networkidle' });
    await bia.page.waitForTimeout(2500);
    invite = (await bia.page.innerText('body')).match(/\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/)?.[1] ?? '';
    console.log('  código do convite:', invite);
  });

  await step('cadastro do Rafa', async () => {
    const page = rafa.page;
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByText('Pular').click();
    await page.waitForTimeout(700);
    await page.getByText('Começar', { exact: true }).click();
    await page.waitForTimeout(900);
    await page.getByPlaceholder('Seu nome ou apelido').fill(PEOPLE.rafa.name);
    await page.getByPlaceholder('voce@exemplo.com').fill(PEOPLE.rafa.email);
    await page.getByPlaceholder('Mínimo de 8 caracteres').fill(PEOPLE.rafa.password);
    await page.getByRole('checkbox').first().click();
    await page.getByText('Criar conta', { exact: true }).last().click();
    const otp = await code(PEOPLE.rafa.email);
    await page.waitForTimeout(800);
    await page.keyboard.type(otp, { delay: 80 });
    await page.waitForTimeout(3500);
    console.log('  Rafa em', page.url());
  });

  await step('Rafa entra com o convite', async () => {
    const page = rafa.page;
    await page.getByText('Entrar com convite').first().click();
    await page.waitForTimeout(1200);
    await page.getByPlaceholder('ABCD-2345').fill(invite);
    await shot(page, '06-entrar-com-convite');
    await page.getByText('Aceitar e conectar').click();
    await page.waitForTimeout(1500);
    if (await page.getByText('Começar sem seus compromissos?').count()) {
      await shot(page, '06b-confirmar');
      await page.getByText('Aceitar e conectar').last().click();
    }
    await page.waitForTimeout(3000);
    await shot(page, '07-conectados-rafa');
  });

  await step('Bia vê a conexão em tempo real', async () => {
    await bia.page.waitForTimeout(2000);
    await shot(bia.page, '07-conectados-bia');
  });

  await bia.context.close();
  await rafa.context.close();
})();
