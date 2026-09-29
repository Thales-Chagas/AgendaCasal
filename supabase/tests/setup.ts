import { closeAllClients } from './helpers';

jest.setTimeout(30_000);

afterAll(async () => {
  await closeAllClients();
});
