import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { AppError } from '@/core/errors/app-error';

/**
 * Gera um arquivo JSON temporário e abre o compartilhamento do sistema
 * (salvar em Arquivos, enviar por e-mail...). O arquivo temporário é apagado depois.
 */
export async function shareJsonFile(fileName: string, data: unknown): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new AppError('unknown');
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: fileName,
      UTI: 'public.json',
    });
  } finally {
    if (file.exists) file.delete();
  }
}
