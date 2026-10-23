// Apresentação (tema claro), etapa A: convite e vínculo vistos do zero. Usa um segundo par de
// contas fictícias (mesmos nomes, outros e-mails) para não mexer no casal já conectado.
// CONVITE_TAG muda os e-mails, para poder rodar de novo no mesmo banco (ex.: CONVITE_TAG=2).
// Saída: public/apresentacao/ (ou SCREENS_DIR) e as caixas medidas em src/apresentacao/boxes.json.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
process.env.SCREENS_DIR ??= path.join(__dirname, '../public/apresentacao');
const { BASE, open, shot, code, step, measure, boxOf } = require('./lib');

const sql = (q) =>
  execFileSync('docker', ['exec', 'supabase_db_agendacasal', 'psql', '-U', 'postgres', '-t', '-A', '-c', q]).toString().trim();
const tag = process.env.CONVITE_TAG ?? '';
const bia = { name: 'Bia', email: `bia.convite${tag}@duoday.local`, password: 'senhaDemo2026', color: 'magenta' };
const rafa = { name: 'Rafa', email: `rafa.convite${tag}@duoday.local`, password: 'senhaDemo2026', color: 'cyan' };

const boxes = {};

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
  // A cor de cada um no vídeo (Bia rosa, Rafa azul claro), como se tivessem escolhido em Minha conta.
  sql(`update public.profiles set avatar_color = '${person.color}' where id = (select id from auth.users where email = '${person.email}')`);
}

(async () => {
  const a = await open(`bia-convite${tag}`, { scheme: 'light' });
  const b = await open(`rafa-convite${tag}`, { scheme: 'light' });

  await step('boas-vindas', async () => {
    await a.page.goto(BASE, { waitUntil: 'networkidle' });
    await shot(a.page, 'a00-boas-vindas', { wait: 1500 });
  });
  await step('cadastro da Bia', () => signUp(a.page, bia));
  await step('como começar', async () => {
    await a.page.reload({ waitUntil: 'networkidle' });
    await shot(a.page, 'a01-comecar', { wait: 1500 });
    boxes.criarAgenda = await measure(a.page, 'Criar nossa agenda', { minW: 300 });
  });

  let invite = '';
  await step('Bia cria o convite', async () => {
    await a.page.getByText('Criar nossa agenda').click();
    await a.page.waitForTimeout(2500);
    await shot(a.page, 'a02-convite');
    invite = (await a.page.innerText('body')).match(/\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/)?.[1] ?? '';
    console.log('  código do convite:', invite);
    boxes.codigo = await measure(a.page, '/^[A-Z0-9]{4}-[A-Z0-9]{4}$/', { self: true });
    // O QR Code é o maior desenho (svg) da tela.
    boxes.qr = await a.page.evaluate(() => {
      const r = [...document.querySelectorAll('svg')]
        .map((e) => e.getBoundingClientRect())
        .sort((x, y) => y.width * y.height - x.width * x.height)[0];
      return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2), Math.round(r.width), Math.round(r.height)];
    });
    boxes.enviarConvite = await measure(a.page, 'Enviar convite', { minW: 200 });
  });

  await step('cadastro do Rafa', () => signUp(b.page, rafa));

  await step('Rafa entra com o convite', async () => {
    await b.page.reload({ waitUntil: 'networkidle' });
    await b.page.waitForTimeout(1200);
    await b.page.getByText('Entrar com convite').first().click();
    await b.page.waitForTimeout(1200);
    await b.page.getByPlaceholder('ABCD-2345').fill(invite);
    await shot(b.page, 'a03-entrar-com-convite');
    boxes.aceitar = await measure(b.page, 'Aceitar e conectar', { minW: 200 });
    await b.page.getByText('Aceitar e conectar').click();
    await b.page.waitForTimeout(1500);
    if (await b.page.getByText('Começar sem seus compromissos?').count()) {
      await b.page.getByText('Aceitar e conectar').last().click();
    }
    await shot(b.page, 'a04-conectados-rafa', { wait: 3000 });
  });

  await step('Bia vê a conexão', () => shot(a.page, 'a04-conectados-bia', { wait: 2500 }));

  const file = path.join(__dirname, '../src/apresentacao/boxes.json');
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  fs.writeFileSync(file, JSON.stringify({ ...old, ...boxes }, null, 2) + '\n');
  console.log(boxes);
  await a.context.close();
  await b.context.close();
})();
