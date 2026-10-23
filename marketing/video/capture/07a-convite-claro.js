// Apresentação (tema claro), etapa A: convite e vínculo vistos do zero. Usa um segundo par de
// contas fictícias (mesmos nomes, outros e-mails) para não mexer no casal já conectado.
// Saída: public/apresentacao/ (ou SCREENS_DIR).
const path = require('node:path');
process.env.SCREENS_DIR ??= path.join(__dirname, '../public/apresentacao');
const { BASE, open, shot, code, step } = require('./lib');

const bia = { name: 'Bia', email: 'bia.convite@duoday.local', password: 'senhaDemo2026' };
const rafa = { name: 'Rafa', email: 'rafa.convite@duoday.local', password: 'senhaDemo2026' };

async function signUp(page, person) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByText('Pular').click();
  await page.waitForTimeout(700);
  if (await page.getByText('Começar', { exact: true }).count()) {
    await page.getByText('Começar', { exact: true }).click();
    await page.waitForTimeout(900);
  }
  await page.getByPlaceholder('Seu nome ou apelido').fill(person.name);
  await page.getByPlaceholder('voce@exemplo.com').fill(person.email);
  await page.getByPlaceholder('Mínimo de 8 caracteres').fill(person.password);
  await page.getByRole('checkbox').first().click();
  await page.getByText('Criar conta', { exact: true }).last().click();
  const otp = await code(person.email);
  await page.waitForTimeout(800);
  await page.keyboard.type(otp, { delay: 80 });
  await page.waitForTimeout(3500);
}

(async () => {
  const a = await open('bia-convite', { scheme: 'light' });
  const b = await open('rafa-convite', { scheme: 'light' });

  await step('boas-vindas', async () => {
    await a.page.goto(BASE, { waitUntil: 'networkidle' });
    await shot(a.page, 'a00-boas-vindas', { wait: 1500 });
  });
  await step('cadastro da Bia', () => signUp(a.page, bia));
  await step('como começar', () => shot(a.page, 'a01-comecar'));

  let invite = '';
  await step('Bia cria o convite', async () => {
    await a.page.getByText('Criar nossa agenda').click();
    await a.page.waitForTimeout(2500);
    await shot(a.page, 'a02-convite');
    invite = (await a.page.innerText('body')).match(/\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/)?.[1] ?? '';
    console.log('  código do convite:', invite);
  });

  await step('cadastro do Rafa', () => signUp(b.page, rafa));

  await step('Rafa entra com o convite', async () => {
    await b.page.getByText('Entrar com convite').first().click();
    await b.page.waitForTimeout(1200);
    await b.page.getByPlaceholder('ABCD-2345').fill(invite);
    await shot(b.page, 'a03-entrar-com-convite');
    await b.page.getByText('Aceitar e conectar').click();
    await b.page.waitForTimeout(1500);
    if (await b.page.getByText('Começar sem seus compromissos?').count()) {
      await b.page.getByText('Aceitar e conectar').last().click();
    }
    await shot(b.page, 'a04-conectados-rafa', { wait: 3000 });
  });

  await step('Bia vê a conexão', () => shot(a.page, 'a04-conectados-bia', { wait: 2500 }));

  await a.context.close();
  await b.context.close();
})();
