import { AppError, toAppError } from '@/core/errors/app-error';
import { logger } from '@/core/logging/logger';
import { getAuthRepository } from '@/features/auth/auth-service';
import { getCoupleRepository } from '@/features/couple/hooks';
import { destroyNotes } from '@/features/notes/notes-service';
import { prepareSignOut } from '@/features/notifications/notification-service';

/** Sair da conta neste aparelho. As notas privadas ficam guardadas (por usuário). */
export async function signOut(): Promise<void> {
  await prepareSignOut();
  await getAuthRepository().signOut();
}

/**
 * Excluir a conta (LGPD / App Store):
 *   1. confirma a senha (evita exclusão por quem pegou o celular desbloqueado);
 *   2. o servidor apaga os dados pessoais (os compromissos "Nosso" ficam com o parceiro);
 *   3. este aparelho apaga notas, agenda local e lembretes desta conta.
 */
export async function deleteAccount(email: string, password: string, userId: string): Promise<void> {
  try {
    await getAuthRepository().signIn(email, password);
  } catch (error) {
    const appError = toAppError(error);
    if (appError.code === 'invalid_credentials') {
      throw new AppError('invalid_credentials', { userMessage: 'A senha não confere.' });
    }
    throw appError;
  }

  await prepareSignOut();
  await getCoupleRepository().deleteMyAccount();

  await destroyNotes(userId).catch((error) => logger.warn('Destroy notes failed', { error }));
  // A sessão agora é inválida no servidor: encerra localmente (dispara a limpeza da agenda local).
  await getAuthRepository()
    .signOut()
    .catch(() => undefined);
}
