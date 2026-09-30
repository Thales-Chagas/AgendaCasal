import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

export type AvatarColor = 'rose' | 'plum' | 'indigo' | 'teal' | 'amber' | 'sage';

const avatarPalette: Record<AvatarColor, { light: [string, string]; dark: [string, string] }> = {
  rose: { light: ['#F9E4EA', '#8E2644'], dark: ['#4A2231', '#F7B8C8'] },
  plum: { light: ['#EEE7F3', '#5A3F6E'], dark: ['#35283F', '#D9C4EA'] },
  indigo: { light: ['#E7E9FA', '#3F4FB0'], dark: ['#262B52', '#B7C0F8'] },
  teal: { light: ['#DDF2F0', '#12716D'], dark: ['#173634', '#8FDCD5'] },
  amber: { light: ['#FBEFD9', '#8F5205'], dark: ['#3D2D14', '#F5CB8A'] },
  sage: { light: ['#E4F0E6', '#35684A'], dark: ['#1F3326', '#A8D8B6'] },
};

/** Cores que uma pessoa pode escolher. O rosé fica reservado para o que é "do casal". */
export const PERSONAL_COLORS: readonly AvatarColor[] = ['indigo', 'teal', 'plum', 'amber', 'sage'];

/** Tons da cor de uma pessoa: `soft` para fundos, `strong` para destaques e texto. */
export function personTone(color: AvatarColor, scheme: 'light' | 'dark'): { soft: string; strong: string } {
  const [soft, strong] = avatarPalette[color][scheme];
  return { soft, strong };
}

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

/** Avatar com foto ou iniciais: a foto é opcional (minimização de dados). */
export function Avatar({ name, color = 'rose', size = 44, ring, photoUri }: AvatarProps) {
  const { scheme, colors } = useTheme();
  const [bg, fg] = avatarPalette[color][scheme];
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
        },
      ]}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <AppText
          compact
          style={{ color: fg, fontSize: size * 0.38, lineHeight: size * 0.5 }}
          variant="bodyStrong">
          {initialsOf(name)}
        </AppText>
      )}
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
