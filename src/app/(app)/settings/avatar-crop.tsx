import { router, useLocalSearchParams } from 'expo-router';

import { toAppError } from '@/core/errors/app-error';
import { toast } from '@/design-system';
import { AvatarCropper } from '@/features/couple/components/AvatarCropper';
import { usePeople, useSetAvatar } from '@/features/couple/hooks';
import { goBackOrHome } from '@/shared/navigation';

/** Ajuste (zoom e enquadramento) da foto escolhida, antes de enviar. */
export default function AvatarCropScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const { me } = usePeople();
  const setAvatar = useSetAvatar();

  if (!uri) {
    goBackOrHome();
    return null;
  }

  return (
    <AvatarCropper
      uri={uri}
      onCancel={() => router.back()}
      onConfirm={async (croppedUri) => {
        try {
          await setAvatar.mutateAsync({ localUri: croppedUri, previousPath: me?.avatarPath ?? null });
          toast.success('Foto atualizada ✓');
          router.back();
        } catch (error) {
          toast.error(toAppError(error).userMessage);
        }
      }}
    />
  );
}
