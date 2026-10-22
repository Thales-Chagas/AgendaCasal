import { webcrypto } from 'node:crypto';

import {
  isValidPin,
  isWeakPin,
  keyFromPin,
  keyFromPrf,
  newDataKey,
  open,
  openWithDataKey,
  pinLockoutMs,
  randomBytes,
  seal,
  sealWithDataKey,
} from './vault-crypto';

beforeAll(() => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
});

// Poucas iterações nos testes (a produção usa PIN_ITERATIONS).
const FAST = 1_000;

describe('cofre das notas (web)', () => {
  it('embrulha a chave de dados com o PIN e só o PIN certo a recupera', async () => {
    const dataKey = newDataKey();
    const salt = randomBytes(16);
    const wrapped = await seal(await keyFromPin('482915', salt, FAST), dataKey);

    await expect(open(await keyFromPin('482915', salt, FAST), wrapped)).resolves.toEqual(dataKey);
    await expect(open(await keyFromPin('482916', salt, FAST), wrapped)).rejects.toBeDefined();
  });

  it('a mesma chave de dados também pode ser aberta pela biometria (PRF)', async () => {
    const dataKey = newDataKey();
    const prf = randomBytes(32);
    const salt = randomBytes(16);
    const wrapped = await seal(await keyFromPrf(prf, salt), dataKey);

    await expect(open(await keyFromPrf(prf, salt), wrapped)).resolves.toEqual(dataKey);
    await expect(open(await keyFromPrf(randomBytes(32), salt), wrapped)).rejects.toBeDefined();
  });

  it('cifra o banco e detecta alteração', async () => {
    const dataKey = newDataKey();
    const plain = new TextEncoder().encode('SQLite format 3 … notas');
    const sealed = await sealWithDataKey(dataKey, plain);

    expect(Buffer.from(sealed.data).includes(Buffer.from('notas'))).toBe(false);
    await expect(openWithDataKey(dataKey, sealed)).resolves.toEqual(plain);

    const tampered = { ...sealed, data: sealed.data.slice() };
    tampered.data[0] = (tampered.data[0] as number) ^ 1;
    await expect(openWithDataKey(dataKey, tampered)).rejects.toBeDefined();
  });

  it('cada cifragem usa um IV novo', async () => {
    const dataKey = newDataKey();
    const plain = new Uint8Array([1, 2, 3]);
    const a = await sealWithDataKey(dataKey, plain);
    const b = await sealWithDataKey(dataKey, plain);
    expect(a.iv).not.toEqual(b.iv);
  });
});

describe('regras do PIN', () => {
  it('aceita só 6 dígitos', () => {
    expect(isValidPin('482915')).toBe(true);
    expect(isValidPin('48291')).toBe(false);
    expect(isValidPin('48291a')).toBe(false);
  });

  it('recusa PINs óbvios', () => {
    expect(isWeakPin('000000')).toBe(true);
    expect(isWeakPin('123456')).toBe(true);
    expect(isWeakPin('654321')).toBe(true);
    expect(isWeakPin('482915')).toBe(false);
  });

  it('espera cresce depois de 5 erros', () => {
    expect(pinLockoutMs(4)).toBe(0);
    expect(pinLockoutMs(5)).toBe(30_000);
    expect(pinLockoutMs(6)).toBe(60_000);
    expect(pinLockoutMs(30)).toBe(60 * 60_000);
  });
});
