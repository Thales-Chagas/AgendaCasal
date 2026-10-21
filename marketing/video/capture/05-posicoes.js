// Etapa 5: mede onde ficam os botões tocados no vídeo (centro, em pontos de 390×844),
// para os toques animados caírem exatamente sobre os elementos reais. Gera taps.json.
const fs = require('node:fs');
const path = require('node:path');
const { BASE, PEOPLE, open, signIn, step } = require('./lib');

(async () => {
  const { context, page } = await open('bia');
  await signIn(page, PEOPLE.bia);
  const taps = {};
  const center = async (key, locator) => {
    const b = await locator.first().boundingBox();
    if (b) taps[key] = [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2)];
  };

  await step('início', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await center('criar', page.getByTestId('create-button'));
    await center('abaAgenda', page.getByTestId('tab-agenda'));
  });
  await step('agenda', async () => {
    await page.getByTestId('tab-agenda').click();
    await page.waitForTimeout(1200);
    for (const s of ['Semana', 'Mês', 'Próximos']) await center(`seg${s}`, page.getByText(s, { exact: true }).last());
  });
  await step('formulário', async () => {
    await page.goto(`${BASE}event/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await center('nosso', page.getByTestId('scope-ours'));
    await center('salvar', page.getByTestId('event-save'));
    await center('titulo', page.getByTestId('event-title'));
  });
  await step('criar (folha)', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.getByTestId('create-button').click();
    await page.waitForTimeout(800);
    await center('novoCompromisso', page.getByText('Novo compromisso'));
  });
  await step('finanças', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.getByTestId('tab-finance').click();
    await page.waitForTimeout(2000);
    await center('pagarInternet', page.getByRole('checkbox', { name: /Internet/ }));
  });
  await step('cor', async () => {
    await page.goto(`${BASE}settings/account`, { waitUntil: 'networkidle' });
    await page.getByTestId('prism-color-picker').waitFor();
    await page.getByTestId('prism-color-picker').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await center('corCoral', page.getByTestId('color-coral'));
    await center('avatar', page.getByTestId('account-avatar'));
  });
  await step('nota', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.getByTestId('tab-notes').click();
    await page.waitForTimeout(1200);
    await page.getByText('Presente surpresa do Rafa', { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await center('fixar', page.getByRole('button', { name: /Fixar|Desafixar/ }));
  });

  // Telas de outros fluxos, medidas nas capturas (mesmo layout fixo do app).
  taps.aceitarConvite = taps.salvar;
  fs.writeFileSync(path.join(__dirname, '../src/taps.json'), JSON.stringify(taps, null, 2));
  console.log(taps);
  await context.close();
})();
