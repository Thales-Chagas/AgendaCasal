import { AppError, toAppError } from './app-error';

describe('toAppError', () => {
  it.each([
    [{ message: 'invite_invalid' }, 'invite_invalid'],
    [{ message: 'couple_full', code: 'P0001' }, 'couple_full'],
    [{ message: 'Invalid login credentials', code: 'invalid_credentials' }, 'invalid_credentials'],
    [{ message: 'x', code: 'email_exists' }, 'email_taken'],
    [{ message: 'x', code: 'otp_expired' }, 'invalid_otp'],
    [{ message: 'new row violates row-level security policy', code: '42501' }, 'permission'],
    [{ message: 'check constraint', code: '23514' }, 'validation'],
    [{ message: 'Network request failed' }, 'network'],
    [{ message: 'x', status: 429 }, 'rate_limited'],
    [new Error('boom'), 'unknown'],
    [undefined, 'unknown'],
  ])('%p → %s', (input, expected) => {
    expect(toAppError(input).code).toBe(expected);
  });

  it('nunca expõe mensagens técnicas ao usuário', () => {
    const error = toAppError({
      message: 'duplicate key value violates unique constraint "x"',
      code: '23505',
    });
    expect(error.userMessage).not.toMatch(/constraint|duplicate|key/i);
  });

  it('preserva AppError existente', () => {
    const original = new AppError('conflict');
    expect(toAppError(original)).toBe(original);
  });
});
