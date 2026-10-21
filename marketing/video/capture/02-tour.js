// Etapa 2: tour completo pelo app como Bia (e um olhar no celular do Rafa), com os dados de seed.sql.
const path = require('node:path');
const { BASE, PEOPLE, open, shot, step, signIn } = require('./lib');

const tab = (page, name) => page.getByTestId(`tab-${name}`).click();
const btn = (page, name) => page.getByRole('button', { name }).first().click();
const text = (page, t, exact = true) => page.getByText(t, { exact }).first().click();

(async () => {
  const bia = await open('bia');
  const page = bia.page;
  await signIn(page, PEOPLE.bia);

  // Sua cor (seletor prismático) primeiro, para o resto do tour já sair na cor da Bia.
  await step('sua cor', async () => {
    await page.goto(`${BASE}settings/account`, { waitUntil: 'networkidle' });
    await page.getByTestId('prism-color-picker').waitFor();
    await page.getByTestId('prism-color-picker').scrollIntoViewIfNeeded();
    await shot(page, '40-cor-antes');
    await page.getByTestId('color-coral').click();
    await shot(page, '40-cor-depois', { wait: 1500 });
  });

  await step('foto de perfil', async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByTestId('account-avatar').click();
    await shot(page, '45-foto-opcoes');
    const chooser = page.waitForEvent('filechooser', { timeout: 8000 });
    await page.getByTestId('avatar-pick-library').click();
    (await chooser).setFiles(path.join(__dirname, 'foto-ficticia.jpg'));
    await page.waitForTimeout(2500);
    await shot(page, '46-foto-recorte');
    await text(page, 'Salvar foto', false);
    await page.waitForTimeout(3000);
    await shot(page, '47-foto-pronta');
  });

  await step('início', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);
    await shot(page, '10-inicio');
    await page.mouse.wheel(0, 700);
    await shot(page, '10b-inicio-rolado');
  });

  await step('agenda: hoje, semana, mês, próximos', async () => {
    await tab(page, 'agenda');
    await shot(page, '11-agenda-hoje', { wait: 1800 });
    for (const [label, name] of [['Semana', '11b-semana'], ['Mês', '11c-mes'], ['Próximos', '11d-proximos']]) {
      await text(page, label);
      await shot(page, name, { wait: 1300 });
    }
  });

  await step('detalhe e exclusão de compromisso que se repete', async () => {
    await text(page, 'Hoje');
    await page.waitForTimeout(800);
    await text(page, 'Pilates');
    await shot(page, '12-detalhe', { wait: 1500 });
    await btn(page, 'Excluir');
    await shot(page, '12b-excluir-repeticao');
    await text(page, 'Cancelar');
    await page.goBack();
  });

  await step('novo compromisso', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.getByTestId('create-button').click();
    await shot(page, '13-criar');
    await text(page, 'Novo compromisso');
    await page.waitForTimeout(1200);
    await shot(page, '14-form-vazio');
    await page.getByTestId('event-title').fill('Jantar no italiano 🍝');
    await page.getByTestId('scope-ours').click().catch(() => {});
    await shot(page, '14b-form-preenchido');
    await page.getByTestId('event-more-options').click();
    await page.waitForTimeout(800);
    await page.mouse.wheel(0, 500);
    await shot(page, '14c-form-opcoes');
    await page.mouse.wheel(0, 900);
    await shot(page, '14d-form-opcoes-2');
    await page.getByTestId('event-save').click();
    await shot(page, '15-salvo', { wait: 2500 });
  });

  await step('o Rafa vê na hora', async () => {
    const rafa = await open('rafa');
    await signIn(rafa.page, PEOPLE.rafa);
    await rafa.page.goto(BASE, { waitUntil: 'networkidle' });
    await shot(rafa.page, '16-rafa-ve', { wait: 3500 });
    await tab(rafa.page, 'finance');
    await shot(rafa.page, '16b-rafa-financas', { wait: 2000 });
    await rafa.context.close();
  });

  await step('notas privadas', async () => {
    await tab(page, 'notes');
    await shot(page, '20-notas-vazio', { wait: 1500 });
    const notes = [
      ['Presente surpresa do Rafa 🤫', 'Aquele relógio que ele ficou olhando na vitrine.\nComprar até dia 8/12. NÃO deixar a aba aberta.'],
      ['Restaurantes para testar', 'Italiano da esquina ✔\nJaponês novo no centro\nAquele de hambúrguer que ele jura que é o melhor'],
      ['Livros para ler', 'O nome do vento\nTudo é rio'],
    ];
    for (const [i, [title, body]] of notes.entries()) {
      await page.getByTestId('notes-new').click();
      await page.waitForTimeout(900);
      await page.getByTestId('note-title').fill(title);
      await page.getByTestId('note-body').fill(body);
      await page.waitForTimeout(1500);
      if (i === 0) {
        await shot(page, '21-nota-editor');
        await btn(page, 'Fixar no topo');
        await shot(page, '21b-nota-fixada', { wait: 600 });
      }
      await page.goBack();
      await page.waitForTimeout(1200);
    }
    await shot(page, '22-notas-lista');
    await btn(page, 'Buscar nas notas');
    await page.keyboard.type('vitrine', { delay: 60 });
    await shot(page, '23-notas-busca');
    await page.keyboard.press('Escape');
    await tab(page, 'notes');
    await page.waitForTimeout(800);
    await text(page, 'Livros para ler');
    await page.waitForTimeout(800);
    await btn(page, 'Arquivar');
    await shot(page, '24-nota-arquivada', { wait: 500 });
    await page.goBack();
    await btn(page, 'Ordenar');
    await shot(page, '25-ordenar');
    await page.keyboard.press('Escape');
  });

  await step('finanças', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await tab(page, 'finance');
    await shot(page, '32-financas', { wait: 2000 });
    await page.getByRole('checkbox', { name: 'Marcar Internet como paga' }).click();
    await shot(page, '33-paga', { wait: 1200 });
    await text(page, 'Todas');
    await shot(page, '34-todas', { wait: 1200 });
    await btn(page, 'Nova conta');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Ex.: Aluguel, Internet, Cartão Nubank').fill('Plano de saúde');
    await page.getByPlaceholder('R$ 0,00').fill('48990');
    await shot(page, '35-conta-nova');
    await page.goBack();
  });

  await step('datas especiais', async () => {
    await page.goto(`${BASE}special-dates`, { waitUntil: 'networkidle' });
    await shot(page, '30-datas', { wait: 2000 });
    await btn(page, 'Adicionar data');
    await page.waitForTimeout(1000);
    await page.getByTestId('special-date-title').fill('Primeira viagem juntos');
    await shot(page, '31-data-nova');
  });

  await step('busca', async () => {
    await page.goto(`${BASE}search`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.keyboard.type('jantar', { delay: 70 });
    await shot(page, '36-busca', { wait: 1500 });
  });

  await step('nós e configurações', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await tab(page, 'us');
    await shot(page, '37-nos', { wait: 1500 });
    await page.mouse.wheel(0, 800);
    await shot(page, '37b-nos-rolado');
    for (const [route, name] of [
      ['settings/theme', '38-aparencia'],
      ['settings/notifications', '39-notificacoes'],
      ['settings/privacy', '41-privacidade'],
      ['settings/relationship', '42-relacionamento'],
      ['settings/help', '43-ajuda'],
      ['settings/about', '44-sobre'],
    ]) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await shot(page, name, { wait: 1500 });
    }
  });

  await bia.context.close();
})();
