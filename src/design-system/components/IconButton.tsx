import { StyleSheet } from 'react-native';

import type { Icon } from '../icons';
import type { ColorTokens } from '../tokens/colors';
import { touch } from '../tokens/layout';
import { useTheme } from '../theme/theme';
import { PressableScale } from './PressableScale';

export type IconButtonProps = {
  icon: Icon;
  /** Obrigatório: é o que o leitor de tela anuncia. */
  label: string;
  onPress: () => void;
  tone?: 'default' | 'primary' | 'muted';
  color?: keyof ColorTokens;
  size?: number;
  testID?: string;
};

export function IconButton({
  icon: IconComponent,
  label,
  onPress,
  tone = 'default',
  color,
  size = 22,
  testID,
}: IconButtonProps) {
  const { colors, radius } = useTheme();
  const background =
    tone === 'primary' ? colors.primarySoft : tone === 'muted' ? colors.surfaceMuted : 'transparent';
  const foreground = color ? colors[color] : tone === 'primary' ? colors.onPrimarySoft : colors.textPrimary;

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={touch.hitSlop}
      style={[styles.base, { backgroundColor: background, borderRadius: radius.pill }]}>
      <IconComponent size={size} color={foreground} strokeWidth={2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touch.minSize,
    height: touch.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
