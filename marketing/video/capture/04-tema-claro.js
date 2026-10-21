// Etapa 4: o mesmo app no tema claro (preferência "Automático" segue o sistema).
const { BASE, PEOPLE, open, shot, step, signIn } = require('./lib');

(async () => {
  const { context, page } = await open('bia', { scheme: 'light' });
  await signIn(page, PEOPLE.bia);
  await step('início e agenda no tema claro', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await shot(page, '50-claro-inicio', { wait: 3000 });
    await page.getByTestId('tab-agenda').click();
    await page.waitForTimeout(1000);
    await page.getByText('Semana', { exact: true }).last().click();
    await shot(page, '50b-claro-semana', { wait: 1500 });
  });
  await context.close();
})();
