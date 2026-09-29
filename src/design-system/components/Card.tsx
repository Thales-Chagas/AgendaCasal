import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import type { ColorTokens } from '../tokens/colors';
import { useTheme } from '../theme/theme';
import { PressableScale } from './PressableScale';

export type CardProps = PropsWithChildren<{
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  tone?: keyof Pick<ColorTokens, 'surface' | 'surfaceMuted' | 'primarySoft' | 'privateSoft'>;
  padded?: boolean;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>;

export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  tone = 'surface',
  padded = true,
  elevated = true,
  style,
  testID,
}: CardProps) {
  const { colors, radius, spacing, elevation } = useTheme();
  const cardStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: colors[tone],
      borderRadius: radius.xl,
      padding: padded ? spacing.lg : 0,
    },
    elevated && tone === 'surface' ? elevation('card') : null,
    style,
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={cardStyle}>
        {children}
      </View>
    );
  }

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      scaleTo={0.985}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={cardStyle}>
      {children}
    </PressableScale>
  );
}
