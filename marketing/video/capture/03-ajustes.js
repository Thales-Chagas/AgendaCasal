// Etapa 3: capturas que dependem de interação mais fina (formulário com horário, agenda,
// notas, finanças, foto). Pode ser rodada de novo sem refazer as etapas anteriores.
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const sql = (q) =>
  execFileSync('docker', ['exec', 'supabase_db_agendacasal', 'psql', '-U', 'postgres', '-t', '-A', '-c', q]).toString().trim();
const { BASE, PEOPLE, open, shot, step, signIn } = require('./lib');

const tab = (page, name) => page.getByTestId(`tab-${name}`).click();
const btn = (page, name) => page.getByRole('button', { name }).first().click();
const scroll = async (page, dy) => {
  await page.mouse.move(195, 520);
  await page.mouse.wheel(0, dy);
};

(async () => {
  const bia = await open('bia');
  const page = bia.page;
  await signIn(page, PEOPLE.bia);
  const only = process.argv.slice(2);
  const want = (k) => only.length === 0 || only.includes(k);

  if (want('foto'))
    await step('foto de perfil', async () => {
      await page.goto(`${BASE}settings/account`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.getByTestId('account-avatar').click();
      await shot(page, '45-foto-opcoes');
      const chooser = page.waitForEvent('filechooser', { timeout: 8000 });
      await page.getByTestId('avatar-pick-library').click();
      await (await chooser).setFiles(path.join(__dirname, 'foto-ficticia.jpg'));
      await page.waitForTimeout(2500);
      await shot(page, '46-foto-recorte');
      await page.getByRole('button', { name: '+' }).first().click().catch(() => {});
      await page.waitForTimeout(400);
      await shot(page, '46b-foto-zoom');
      await page.getByText('Usar esta foto').click();
      await page.waitForTimeout(3500);
      await shot(page, '47-foto-pronta');
    });

  if (want('agenda'))
    await step('agenda: próximos, detalhe e exclusão de repetição', async () => {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await tab(page, 'agenda');
      await page.waitForTimeout(1200);
      await page.getByText('Próximos', { exact: true }).last().click();
      await shot(page, '11d-proximos', { wait: 1500 });
      const id = sql("select id from public.events where title = 'Pilates' and deleted_at is null limit 1");
      await page.goto(`${BASE}event/${id}`, { waitUntil: 'networkidle' });
      await shot(page, '12-detalhe', { wait: 1800 });
      await btn(page, 'Excluir');
      await shot(page, '12b-excluir-repeticao');
    });

  if (want('evento'))
    await step('novo compromisso com horário', async () => {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.getByTestId('create-button').click();
      await shot(page, '13-criar');
      await page.getByText('Novo compromisso').click();
      await page.waitForTimeout(1200);
      await shot(page, '14-form-vazio');
      await page.getByTestId('event-title').fill('Jantar no italiano 🍝');
      await page.locator('[data-testid=event-start] input, input[data-testid=event-start]').first().fill('20:00');
      await page.locator('[data-testid=event-end] input, input[data-testid=event-end]').first().fill('22:00');
      await page.getByTestId('scope-ours').click();
      await shot(page, '14b-form-preenchido');
      await page.getByTestId('event-more-options').click();
      await page.waitForTimeout(800);
      await scroll(page, 520);
      await shot(page, '14c-form-opcoes');
      await scroll(page, 700);
      await shot(page, '14d-form-opcoes-2');
      await page.getByTestId('event-save').click();
      await shot(page, '15-salvo', { wait: 1200 });
    });

  if (want('rafa'))
    await step('o Rafa vê na hora (e só as contas dele)', async () => {
      const rafa = await open('rafa');
      await signIn(rafa.page, PEOPLE.rafa);
      await rafa.page.goto(BASE, { waitUntil: 'networkidle' });
      await rafa.page.waitForTimeout(3000);
      await tab(rafa.page, 'agenda');
      await shot(rafa.page, '16-rafa-ve', { wait: 2500 });
      await tab(rafa.page, 'finance');
      await shot(rafa.page, '16b-rafa-financas', { wait: 2000 });
      await rafa.context.close();
    });

  if (want('notas'))
    await step('notas: busca, arquivar, ordenar', async () => {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await tab(page, 'notes');
      await page.waitForTimeout(1200);
      await shot(page, '22-notas-lista');
      await page.getByPlaceholder('Palavra ou frase').fill('vitrine');
      await shot(page, '23-notas-busca', { wait: 1200 });
      await page.getByPlaceholder('Palavra ou frase').fill('');
      await page.waitForTimeout(800);
      await page.getByText('Livros para ler').first().click();
      await page.waitForTimeout(1000);
      await btn(page, 'Arquivar');
      await shot(page, '24-nota-arquivada', { wait: 400 });
      await page.waitForTimeout(1500);
      await tab(page, 'notes');
      await page.waitForTimeout(1000);
      await btn(page, 'Ordenar');
      await shot(page, '25-ordenar');
    });

  if (want('financas'))
    await step('finanças', async () => {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await tab(page, 'finance');
      await shot(page, '32-financas', { wait: 2500 });
      await page.getByRole('checkbox', { name: 'Marcar Internet como paga' }).first().click();
      await shot(page, '33-paga', { wait: 1500 });
      await page.getByText('Do casal', { exact: false }).first().click();
      await shot(page, '34-do-casal', { wait: 1200 });
      await btn(page, 'Nova conta');
      await page.waitForTimeout(1000);
      await page.getByPlaceholder('Ex.: Aluguel, Internet, Cartão Nubank').fill('Plano de saúde');
      await page.getByPlaceholder('R$ 0,00').fill('48990');
      await shot(page, '35-conta-nova');
    });

  if (want('datas'))
    await step('datas especiais', async () => {
      await page.goto(`${BASE}special-dates`, { waitUntil: 'networkidle' });
      await shot(page, '30-datas', { wait: 2000 });
      await btn(page, 'Adicionar data');
      await page.waitForTimeout(1000);
      await page.getByText('Primeira viagem', { exact: false }).first().click();
      await page.getByTestId('special-date-title').fill('Primeira viagem juntos');
      await shot(page, '31-data-nova');
    });

  await bia.context.close();
})();
