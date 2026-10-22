import { format } from 'date-fns/format';
import { ptBR } from 'date-fns/locale/pt-BR';

export function formatFieldValue(mode: 'date' | 'time', value: Date): string {
  return mode === 'date' ? format(value, "EEE, d 'de' MMM", { locale: ptBR }) : format(value, 'HH:mm');
}
