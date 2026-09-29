import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatFieldValue(mode: 'date' | 'time', value: Date): string {
  return mode === 'date' ? format(value, "EEE, d 'de' MMM", { locale: ptBR }) : format(value, 'HH:mm');
}
