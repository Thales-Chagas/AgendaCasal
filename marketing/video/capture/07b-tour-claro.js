// Apresentação (tema claro), etapa B: tour por todas as abas como Bia (e o celular do Rafa),
// com os dados de seed.sql. Também mede onde ficam os botões tocados no vídeo → src/apresentacao/taps.json.
// Rode depois de 01-casal.js, 01b-vinculo.js e seed.sql. Saída: public/apresentacao/.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
process.env.SCREENS_DIR ??= path.join(__dirname, '../public/apresentacao');
const { BASE, PEOPLE, open, shot, step, signIn, measure, boxOf, union } = require('./lib');

const sql = (q) =>
  execFileSync('docker', ['exec', 'supabase_db_agendacasal', 'psql', '-U', 'postgres', '-t', '-A', '-c', q]).toString().trim();
const tab = (page, name) => page.getByTestId(`tab-${name}`).click();
const btn = (page, name) => page.getByRole('button', { name }).first().click();
const text = (page, t, exact = true) => page.getByText(t, { exact }).first().click();
const scroll = async (page, dy) => {
  await page.mouse.move(195, 480);
  await page.mouse.wheel(0, dy);
};

const taps = {};
/** Caixas [cx, cy, w, h] dos elementos destacados no vídeo, medidas no mesmo estado da captura. */
const boxes = {};
async function center(key, locator) {
  const b = await locator.first().boundingBox().catch(() => null);
  if (b) taps[key] = [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2)];
}

(async () => {
  // Estado inicial: Bia rosa (magenta), Rafa azul claro (ciano), Bia sem foto e sem o compromisso
  // criado no vídeo.
  const byEmail = (e) => `(select id from auth.users where email = '${e}')`;
  sql(`update public.profiles set avatar_color = 'magenta', avatar_path = null where id = ${byEmail(PEOPLE.bia.email)}`);
  sql(`update public.profiles set avatar_color = 'cyan' where id = ${byEmail(PEOPLE.rafa.email)}`);
  sql("delete from public.events where title like 'Jantar%'");

  const bia = await open('bia', { scheme: 'light' });
  const page = bia.page;
  await signIn(page, PEOPLE.bia);
  const only = process.argv.slice(2);
  const want = (k) => only.length === 0 || only.includes(k);

  if (want('foto'))
    await step('foto de perfil', async () => {
      await page.goto(`${BASE}settings/account`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.getByTestId('account-avatar').click();
      const chooser = page.waitForEvent('filechooser', { timeout: 8000 });
      await page.getByTestId('avatar-pick-library').click();
      await (await chooser).setFiles(path.join(__dirname, 'foto-ficticia.jpg'));
      await page.waitForTimeout(2500);
      await shot(page, 'b70-foto-recorte');
      await page.getByText('Usar esta foto').click();
      await page.waitForTimeout(3500);
    });

  if (want('inicio'))
    await step('início', async () => {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await shot(page, 'b10-inicio', { wait: 3500 });
      for (const t of ['index', 'agenda', 'finance', 'notes', 'us']) await center(`tab_${t}`, page.getByTestId(`tab-${t}`));
      await center('criar', page.getByTestId('create-button'));
      await center('buscar', page.getByRole('button', { name: 'Buscar' }));
      await center('avatar', page.getByRole('button', { name: 'Nosso espaço' }));
      boxes.proximo = await boxOf(page.getByTestId('next-event'));
      boxes.contagem = await measure(page, 'Faltam', { minW: 300 });
      boxes.atalhos = union(await measure(page, 'Novo evento', { minW: 120 }), await measure(page, 'Nova anotação', { minW: 120 }));
      boxes.buscar = await boxOf(page.getByRole('button', { name: 'Buscar' }));
      await scroll(page, 600);
      await shot(page, 'b11-inicio-rolado');
    });

  if (want('agenda'))
    await step('agenda: hoje, semana, mês, próximos', async () => {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await tab(page, 'agenda');
      await shot(page, 'b20-agenda-hoje', { wait: 1800 });
      for (const s of ['Semana', 'Mês', 'Próximos']) await center(`seg_${s}`, page.getByText(s, { exact: true }).last());
      // "Hoje" do seletor no topo (há outros "Hoje" na tela).
      boxes.segHoje = await page.evaluate(() => {
        const el = [...document.querySelectorAll('div')].find(
          (e) => e.childElementCount === 0 && e.textContent.trim() === 'Hoje' && e.getBoundingClientRect().top < 130,
        );
        let p = el;
        while (p && getComputedStyle(p).backgroundColor === 'rgba(0, 0, 0, 0)') p = p.parentElement;
        const r = (p ?? el).getBoundingClientRect();
        return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2), Math.round(r.width), Math.round(r.height)];
      });
      for (const [label, name] of [
        ['Semana', 'b21-semana'],
        ['Mês', 'b22-mes'],
        ['Próximos', 'b23-proximos'],
      ]) {
        await page.getByText(label, { exact: true }).last().click();
        await shot(page, name, { wait: 1400 });
        if (label === 'Semana') boxes.dentistaSemana = await measure(page, 'Dentista', { minW: 250 });
      }
      const id = sql("select id from public.events where title = 'Dentista' and deleted_at is null limit 1");
      await page.goto(`${BASE}event/${id}`, { waitUntil: 'networkidle' });
      await shot(page, 'b24-detalhe-dentista', { wait: 1800 });
      boxes.deRafa = await measure(page, 'De Rafa');
    });

  if (want('criar'))
    await step('novo compromisso pelo +', async () => {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.getByTestId('create-button').click();
      await shot(page, 'b30-criar', { wait: 900 });
      await center('novoCompromisso', page.getByText('Novo compromisso'));
      await text(page, 'Novo compromisso');
      await shot(page, 'b31-form-vazio', { wait: 1300 });
      await center('titulo', page.getByTestId('event-title'));
      await center('nosso', page.getByTestId('scope-ours'));
      boxes.meu = await boxOf(page.getByTestId('scope-mine'));
      boxes.doParceiro = await boxOf(page.getByTestId('scope-partner'));
      boxes.nosso = await boxOf(page.getByTestId('scope-ours'));
      boxes.hora = await boxOf(page.getByTestId('event-start'));
      await page.getByTestId('event-title').fill('Jantar no italiano 🍝');
      await page.getByTestId('scope-ours').click().catch(() => {});
      await shot(page, 'b32-form-preenchido', { wait: 700 });
      await page.getByTestId('event-more-options').click();
      await page.waitForTimeout(800);
      await scroll(page, 500);
      await shot(page, 'b33-form-opcoes');
      boxes.lembrete = await measure(page, '1 hora antes');
      boxes.repeticao = await measure(page, 'Não repete');
      await scroll(page, 900);
      await shot(page, 'b34-form-opcoes-2');
      await center('salvar', page.getByTestId('event-save'));
      await page.getByTestId('event-save').click();
      await shot(page, 'b35-salvo', { wait: 2500 });
      boxes.salvo = await measure(page, 'Compromisso salvo', { minW: 250 });
    });

  if (want('rafa'))
    await step('o Rafa vê na hora', async () => {
      const rafa = await open('rafa', { scheme: 'light' });
      await signIn(rafa.page, PEOPLE.rafa);
      await rafa.page.goto(BASE, { waitUntil: 'networkidle' });
      await shot(rafa.page, 'b36-rafa-ve', { wait: 3500 });
      boxes.rafaProximo = await boxOf(rafa.page.getByTestId('next-event'));
      await rafa.context.close();
    });

  if (want('notas'))
    await step('notas privadas (PIN no web)', async () => {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await tab(page, 'notes');
      await page.waitForTimeout(1500);
      if (await page.getByText('Crie um PIN', { exact: false }).count()) await shot(page, 'b40-notas-pin');
      await page.keyboard.type('482916', { delay: 90 });
      await page.waitForTimeout(900);
      await page.keyboard.type('482916', { delay: 90 });
      await page.waitForTimeout(1500);
      if (await page.getByText('Agora não').count()) await text(page, 'Agora não');
      await page.waitForTimeout(1200);
      await shot(page, 'b41-notas-vazio');
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
          await shot(page, 'b42-nota-editor');
          await btn(page, 'Fixar no topo');
          await page.waitForTimeout(600);
        }
        await page.goBack();
        await page.waitForTimeout(1200);
      }
      await shot(page, 'b43-notas-lista');
      boxes.privado = await measure(page, 'Privado', { minW: 300 });
      boxes.notaPresente = await measure(page, 'Presente surpresa', { minW: 300 });
    });

  if (want('financas'))
    await step('finanças', async () => {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await tab(page, 'finance');
      await shot(page, 'b50-financas', { wait: 2200 });
      // Linha de cada conta: da caixinha de "pago" ao valor, na largura do cartão.
      for (const [k, n] of [
        ['aluguel', 'Aluguel'],
        ['internet', 'Internet'],
        ['streaming', 'Streaming'],
      ]) {
        const row = union(await boxOf(page.getByRole('checkbox', { name: new RegExp(n) })), await measure(page, n, { self: true }));
        boxes[k] = row && [195, row[1], 350, Math.max(row[3], 56)];
      }
      boxes.filtros = union(await measure(page, 'Todas'), await measure(page, 'Só minhas'));
      boxes.aviso = await measure(page, 'Venceu há');
      await center('pagarInternet', page.getByRole('checkbox', { name: /Internet/ }));
      await page.getByRole('checkbox', { name: 'Marcar Internet como paga' }).click();
      await shot(page, 'b51-paga', { wait: 1200 });
      boxes.paga = await measure(page, 'Internet: paga', { minW: 250 });
      await scroll(page, 600);
      await shot(page, 'b52-financas-rolado', { wait: 900 });
      await btn(page, 'Nova conta');
      await page.waitForTimeout(1000);
      await page.getByPlaceholder('Ex.: Aluguel, Internet, Cartão Nubank').fill('Streaming que ninguém assiste');
      await page.getByPlaceholder('R$ 0,00').fill('3490');
      await shot(page, 'b53-conta-nova');
      await page.goBack();
    });

  if (want('nos'))
    await step('nós, datas especiais e configurações', async () => {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await tab(page, 'us');
      await shot(page, 'b60-nos', { wait: 1800 });
      boxes.datas = union(await measure(page, 'Nosso aniversário', { minW: 300 }), await measure(page, 'Adicionar data especial', { minW: 300 }));
      await scroll(page, 700);
      await shot(page, 'b61-nos-rolado');
      for (const [k, t] of [
        ['minhaConta', 'Minha conta'],
        ['aparencia', 'Aparência'],
        ['notificacoes', 'Notificações'],
        ['seguranca', 'Segurança'],
        ['privacidade', 'Privacidade'],
      ])
        boxes[k] = await measure(page, t, { minW: 300 });
      await page.goto(`${BASE}special-dates`, { waitUntil: 'networkidle' });
      await shot(page, 'b62-datas', { wait: 2000 });
      for (const [route, name] of [
        ['settings/theme', 'b63-aparencia'],
        ['settings/notifications', 'b64-notificacoes'],
        ['settings/security', 'b65-seguranca'],
        ['settings/privacy', 'b66-privacidade'],
      ]) {
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
        await shot(page, name, { wait: 1600 });
      }
    });

  if (want('busca'))
    await step('busca', async () => {
      await page.goto(`${BASE}search`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.keyboard.type('dentista', { delay: 70 });
      await shot(page, 'b80-busca', { wait: 1500 });
      boxes.resultado = await measure(page, 'Dentista', { minW: 250 });
    });

  if (want('cor'))
    await step('minha conta: sua cor', async () => {
      await page.goto(`${BASE}settings/account`, { waitUntil: 'networkidle' });
      await page.getByTestId('prism-color-picker').waitFor();
      await page.waitForTimeout(1200);
      await shot(page, 'b71-conta');
      await page.getByTestId('prism-color-picker').scrollIntoViewIfNeeded();
      await shot(page, 'b73-cor-depois', { wait: 900 });
    });

  if (Object.keys(boxes).length) {
    const file = path.join(__dirname, '../src/apresentacao/boxes.json');
    const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    fs.writeFileSync(file, JSON.stringify({ ...old, ...boxes }, null, 2) + '\n');
    console.log(boxes);
  }
  if (Object.keys(taps).length) {
    const file = path.join(__dirname, '../src/apresentacao/taps.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    fs.writeFileSync(file, JSON.stringify({ ...old, ...taps }, null, 2) + '\n');
    console.log(taps);
  }
  await bia.context.close();
})();
