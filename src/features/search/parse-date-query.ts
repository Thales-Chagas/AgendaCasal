/** Reconhece "12/10", "12/10/2026" ou "12-10" como um dia (padrão brasileiro dd/mm). */
export function parseDateQuery(term: string, today = new Date()): Date | null {
  const match = term.trim().match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  let year = match[3] ? Number(match[3]) : today.getFullYear();
  if (year < 100) year += 2000;
  const date = new Date(year, month, day);
  if (date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}
