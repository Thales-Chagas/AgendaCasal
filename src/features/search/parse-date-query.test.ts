import { parseDateQuery } from './parse-date-query';

describe('busca por data', () => {
  const today = new Date(2026, 8, 29);
  it.each([
    ['12/10', new Date(2026, 9, 12)],
    ['12/10/2027', new Date(2027, 9, 12)],
    ['1-1-27', new Date(2027, 0, 1)],
  ])('%s', (input, expected) => {
    expect(parseDateQuery(input, today)).toEqual(expected);
  });

  it.each(['31/02', 'jantar', '12', '99/99'])('ignora "%s"', (input) => {
    expect(parseDateQuery(input, today)).toBeNull();
  });
});
