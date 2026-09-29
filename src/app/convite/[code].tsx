import { Redirect, useLocalSearchParams } from 'expo-router';

import { useSession } from '@/features/auth/session-store';
import { isValidInviteCode, normalizeInviteCode } from '@/features/couple/domain/invite-code';
import { usePendingInvite } from '@/features/couple/pending-invite-store';

/**
 * Deep link `nossaagenda://convite/CODIGO`.
 * Logado: abre a tela de aceite. Sem conta: guarda o código (em memória) e leva ao cadastro.
 */
export default function InviteLinkScreen() {
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const signedIn = useSession((s) => s.status === 'signedIn');
  const valid = isValidInviteCode(code);

  if (signedIn) {
    return valid ? (
      <Redirect href={{ pathname: '/couple/join', params: { code: normalizeInviteCode(code) } }} />
    ) : (
      <Redirect href="/" />
    );
  }

  if (valid) usePendingInvite.getState().setCode(code);
  return <Redirect href="/sign-up" />;
}
