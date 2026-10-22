import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { personColor, type AvatarColor } from '../tokens/person-colors';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '♡';
}

export type AvatarProps = {
  name: string;
  color?: AvatarColor;
  size?: number;
  ring?: boolean;
  /** Foto de perfil (opcional). Sem foto, mostra as iniciais na cor da pessoa. */
  photoUri?: string | null;
};

/** Avatar com foto ou iniciais na cor sólida da pessoa (a foto é opcional: minimização de dados). */
export function Avatar({ name, color = 'rose', size = 44, ring, photoUri }: AvatarProps) {
  const { colors } = useTheme();
  const { solid: bg, onSolid: fg } = personColor(color);
  // Foto que não carregou (link vencido, sem internet) volta para as iniciais, nunca um círculo vazio.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showPhoto = !!photoUri && photoUri !== failedUri;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: ring ? 3 : 0,
          borderColor: colors.surface,
          // O círculo recorta a foto (mais confiável no Android do que arredondar a própria imagem).
          overflow: 'hidden',
        },
      ]}>
      {/* Iniciais sempre embaixo: aparecem enquanto a foto carrega ou se ela falhar. */}
      <AppText
        compact
        style={{ color: fg, fontSize: size * 0.38, lineHeight: size * 0.5 }}
        variant="bodyStrong">
        {initialsOf(name)}
      </AppText>
      {showPhoto ? (
        <Image
          source={{ uri: photoUri }}
          recyclingKey={photoUri}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          onError={() => setFailedUri(photoUri)}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

export type CoupleAvatarProps = {
  me: { name: string; color?: AvatarColor; photoUri?: string | null };
  partner?: { name: string; color?: AvatarColor; photoUri?: string | null } | null;
  size?: number;
};

/** Dois avatares sobrepostos. Sem parceiro, mostra um espaço tracejado com "+". */
export function CoupleAvatar({ me, partner, size = 44 }: CoupleAvatarProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={partner ? `${me.name} e ${partner.name}` : me.name}>
      <Avatar name={me.name} color={me.color} photoUri={me.photoUri} size={size} ring />
      <View style={{ marginLeft: -size * 0.28 }}>
        {partner ? (
          <Avatar name={partner.name} color={partner.color} photoUri={partner.photoUri} size={size} ring />
        ) : (
          <View
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: colors.borderStrong,
                backgroundColor: colors.surface,
              },
            ]}>
            <AppText color="textTertiary" variant="bodyStrong">
              +
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
