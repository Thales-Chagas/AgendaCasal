import * as ImagePicker from 'expo-image-picker';

import { toast } from '@/design-system';

/**
 * Escolhe uma foto (galeria ou câmera) para o perfil. O recorte é feito depois, na tela de
 * ajuste. Devolve `null` se a pessoa cancelar ou negar a permissão.
 */
export async function pickAvatarImage(from: 'library' | 'camera'): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: false,
    // Reencoda a imagem: já vem na orientação correta e bem menor que o original.
    quality: 0.9,
    exif: false,
  };

  if (from === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.error('Sem acesso à câmera. Libere nas configurações do celular.');
      return null;
    }
  }

  const result =
    from === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
