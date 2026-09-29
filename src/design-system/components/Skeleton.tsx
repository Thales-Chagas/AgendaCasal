import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme/theme';

export type SkeletonProps = { width?: DimensionValue; height?: number; radius?: number };

/** Bloco de carregamento suave (usado no lugar de spinners). */
export function Skeleton({ width = '100%', height = 16, radius }: SkeletonProps) {
  const { colors, radius: radii } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    if (!reduceMotion) opacity.set(withRepeat(withTiming(1, { duration: 800 }), -1, true));
  }, [opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius ?? radii.sm, backgroundColor: colors.skeleton }, style]}
    />
  );
}

/** Esqueleto de um card de compromisso. */
export function EventCardSkeleton() {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessibilityLabel="Carregando"
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        gap: spacing.sm,
      }}>
      <Skeleton width="30%" height={12} />
      <Skeleton width="70%" height={18} />
      <Skeleton width="45%" height={12} />
    </View>
  );
}
