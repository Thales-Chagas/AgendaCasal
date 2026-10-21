// Etapa 6: "Minha conta" aberta pelo caminho normal (Nós → Minha conta), com o nome já
// preenchido: sua cor (antes/depois) e foto de perfil. Atualiza a posição do toque no Coral.
// Antes, volte o perfil da Bia ao estado inicial:
//   update public.profiles set avatar_color = 'indigo', avatar_path = null where id = <Bia>;
const fs = require('node:fs');
const path = require('node:path');
const { BASE, PEOPLE, open, shot, step, signIn } = require('./lib');

(async () => {
  const { context, page } = await open('bia');
  await signIn(page, PEOPLE.bia);
  const tapsFile = path.join(__dirname, '../src/taps.json');
  const taps = JSON.parse(fs.readFileSync(tapsFile, 'utf8'));

  await step('minha conta: sua cor', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await page.getByTestId('tab-us').click();
    await page.waitForTimeout(1200);
    await page.getByText('Minha conta', { exact: true }).click();
    await page.getByTestId('prism-color-picker').waitFor();
    await page.waitForTimeout(1200);
    await page.getByTestId('prism-color-picker').scrollIntoViewIfNeeded();
    await shot(page, '40-cor-antes');
    const b = await page.getByTestId('color-coral').boundingBox();
    taps.corCoral = [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2)];
    await page.getByTestId('color-coral').click();
    await shot(page, '40-cor-depois', { wait: 1500 });
  });

  await step('minha conta: foto de perfil', async () => {
    await page.evaluate(() => document.querySelectorAll('*').forEach((el) => el.scrollTop && (el.scrollTop = 0)));
    await page.waitForTimeout(600);
    await page.getByTestId('account-avatar').click();
    await shot(page, '45-foto-opcoes');
    const chooser = page.waitForEvent('filechooser', { timeout: 8000 });
    await page.getByTestId('avatar-pick-library').click();
    await (await chooser).setFiles(path.join(__dirname, 'foto-ficticia.jpg'));
    await page.waitForTimeout(2500);
    await shot(page, '46-foto-recorte');
    await page.getByText('Usar esta foto').click();
    await page.waitForTimeout(3500);
    await shot(page, '47-foto-pronta');
  });

  fs.writeFileSync(tapsFile, JSON.stringify(taps, null, 2) + '\n');
  console.log('corCoral', taps.corCoral);
  await context.close();
})();
