import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import {
  AppText,
  Avatar,
  darkColors,
  motion,
  PERSONAL_COLORS,
  personColor,
  PrismSwatch,
  radius,
  spacing,
  type AvatarColor,
} from '@/design-system';
import { Check } from '@/design-system/icons';

/**
 * O seletor fica sempre num "palco" escuro, mesmo no tema claro: é o fundo que valoriza a luz
 * dos degradês. Por isso usa os tokens do tema escuro diretamente.
 */
const stage = darkColors;
const GAP = spacing.md;
const MAX_TILE = 84;

export type PrismColorPickerProps = {
  value: AvatarColor;
  onChange: (color: AvatarColor) => void;
  /** Nome da pessoa, para as iniciais do avatar na prévia. */
  name: string;
};

/**
 * "Sua cor": os degradês prismáticos são só a apresentação da opção; o que fica salvo e
 * identifica a pessoa no app é a cor sólida (`solid`) de cada uma.
 */
export function PrismColorPicker({ value, onChange, name }: PrismColorPickerProps) {
  const [width, setWidth] = useState(0);
  const columns = width > 0 && width < 260 ? 3 : 5;
  const tile = Math.min(MAX_TILE, Math.floor((width - GAP * (columns - 1)) / columns));
  const selected = personColor(value);

  return (
    <View style={styles.stage} testID="prism-color-picker">
      <AmbientGlow colors={selected.prism} />
      <PreviewCard color={value} name={name} />
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Sua cor"
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.grid, { gap: GAP }]}>
        {width > 0
          ? PERSONAL_COLORS.map((color) => (
              <PrismOption
                key={color}
                color={color}
                size={tile}
                selected={color === value}
                onPress={() => onChange(color)}
              />
            ))
          : null}
      </View>
    </View>
  );
}

function PreviewCard({ color, name }: { color: AvatarColor; name: string }) {
  const option = personColor(color);
  return (
    <View
      style={styles.preview}
      accessible
      accessibilityLabel={`Cor selecionada: ${option.name}, código ${option.solid}`}
      accessibilityLiveRegion="polite"
      testID="prism-preview">
      <View style={styles.previewLine} pointerEvents="none">
        <PrismSwatch colors={option.prism} />
      </View>
      <View style={[styles.avatarRing, { borderColor: option.solid }]}>
        <Avatar name={name || '·'} color={color} size={52} />
      </View>
      <View style={styles.previewText}>
        <AppText variant="bodyStrong" numberOfLines={1} style={{ color: stage.textPrimary }}>
          {option.name}
        </AppText>
        <View style={styles.hexRow}>
          <View style={[styles.hexDot, { backgroundColor: option.solid }]} />
          <AppText variant="caption" tabular style={{ color: stage.textSecondary }}>
            {option.solid}
          </AppText>
        </View>
      </View>
      <View style={[styles.selectedPill, { backgroundColor: option.solid }]}>
        <Check size={14} color={option.onSolid} strokeWidth={3} />
        <AppText variant="label" compact style={{ color: option.onSolid }}>
          Selecionada
        </AppText>
      </View>
    </View>
  );
}

function PrismOption({
  color,
  size,
  selected,
  onPress,
}: {
  color: AvatarColor;
  size: number;
  selected: boolean;
  onPress: () => void;
}) {
  const option = personColor(color);
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const scale = useSharedValue(selected ? 1.05 : 1);
  useEffect(() => {
    const target = selected ? 1.05 : 1;
    scale.set(reduceMotion ? target : withSpring(target, motion.spring));
  }, [selected, reduceMotion, scale]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const ringColor = selected ? '#FFFFFF' : focused ? stage.focusRing : 'transparent';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={option.name}
      accessibilityHint={`Cor ${option.solid} nos seus compromissos e no avatar`}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hitSlop={4}
      testID={`color-${color}`}
      style={[styles.option, { width: size }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderColor: ringColor,
            boxShadow: selected ? `0 0 18px 2px ${option.solid}` : undefined,
          },
          animatedStyle,
        ]}>
        <View style={styles.swatch}>
          <PrismSwatch colors={option.prism} />
          <View style={[styles.solidDot, { backgroundColor: option.solid }]} />
        </View>
        {selected ? (
          <Animated.View entering={ZoomIn.duration(motion.duration.fast)} style={styles.check}>
            <Check size={13} color={option.solid} strokeWidth={3.4} />
          </Animated.View>
        ) : null}
      </Animated.View>
      <AppText
        variant="label"
        compact
        numberOfLines={1}
        style={{ color: selected ? stage.textPrimary : stage.textSecondary, letterSpacing: 0 }}>
        {option.label}
      </AppText>
    </Pressable>
  );
}

/** Luz difusa da cor escolhida no canto do palco. Decorativa. */
function AmbientGlow({ colors }: { colors: readonly string[] }) {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Defs>
        <RadialGradient id="prismAmbientA" cx="0.92" cy="0.02" r="0.75">
          <Stop offset="0" stopColor={colors[0]} stopOpacity="0.22" />
          <Stop offset="1" stopColor={colors[0]} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="prismAmbientB" cx="0.04" cy="1" r="0.7">
          <Stop offset="0" stopColor={colors[colors.length - 1]} stopOpacity="0.14" />
          <Stop offset="1" stopColor={colors[colors.length - 1]} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#prismAmbientA)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#prismAmbientB)" />
    </Svg>
  );
}

const hairline = 'rgba(255, 255, 255, 0.10)';

const styles = StyleSheet.create({
  stage: {
    backgroundColor: stage.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: hairline,
    padding: spacing.lg,
    gap: spacing.xl,
    overflow: 'hidden',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    paddingTop: spacing.md + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: hairline,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
  },
  previewLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.9 },
  avatarRing: { borderWidth: 2, borderRadius: 32, padding: 2 },
  previewText: { flex: 1, gap: spacing.xxs },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hexDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: hairline },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  option: { alignItems: 'center', gap: spacing.xs, minHeight: 48 },
  ring: {
    borderRadius: radius.lg + 4,
    borderWidth: 2,
    padding: 3,
    ...Platform.select({ web: { cursor: 'pointer' as const }, default: {} }),
  },
  swatch: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  solidDot: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  check: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
