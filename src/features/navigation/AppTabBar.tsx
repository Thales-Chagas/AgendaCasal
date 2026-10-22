import type Tabs from 'expo-router/js-tabs';
import { useEffect, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, fontFamilies, maxContentWidth, PressableScale, useTheme } from '@/design-system';
import { CalendarDays, Heart, House, NotebookPen, Plus, Wallet, type Icon } from '@/design-system/icons';

import { CreateSheet } from './CreateSheet';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const tabMeta: Record<string, { label: string; icon: Icon }> = {
  index: { label: 'Início', icon: House },
  agenda: { label: 'Agenda', icon: CalendarDays },
  finance: { label: 'Finanças', icon: Wallet },
  notes: { label: 'Notas', icon: NotebookPen },
  us: { label: 'Nós', icon: Heart },
};

const BAR_HEIGHT = 64;
const BAR_PADDING = 4;
const CREATE_SIZE = 60;

/** Altura ocupada pela barra, sem contar a área segura de baixo. */
export const TAB_BAR_HEIGHT = BAR_HEIGHT + 16;

/**
 * Barra inferior flutuante: uma cápsula com as 5 abas, igualmente espaçadas, e o "+" redondo
 * ao lado, sempre ao alcance do polegar. O destaque desliza até a aba escolhida.
 */
export function AppTabBar({ state, navigation }: TabBarProps) {
  const { colors, spacing, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const [createOpen, setCreateOpen] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  const routes = state.routes.filter((r) => tabMeta[r.name]);
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    routes.findIndex((r) => r.key === activeKey),
  );
  const tabWidth = routes.length ? (barWidth - BAR_PADDING * 2) / routes.length : 0;

  const indicatorX = useSharedValue(0);
  const ready = barWidth > 0;
  useEffect(() => {
    if (!ready) return;
    indicatorX.set(
      withTiming(activeIndex * tabWidth, { duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1) }),
    );
  }, [activeIndex, tabWidth, ready, indicatorX]);
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.get() }] }));

  return (
    <>
      <View
        style={[
          styles.wrapper,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            paddingTop: spacing.sm,
            paddingHorizontal: spacing.md,
          },
        ]}>
        <View style={[styles.row, { gap: spacing.md }]}>
          <View
            accessibilityRole="tablist"
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            style={[
              styles.bar,
              { backgroundColor: colors.tabBar, borderRadius: radius.pill },
              elevation('raised'),
            ]}>
            {ready ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.indicator,
                  { width: tabWidth, backgroundColor: colors.primarySoft, borderRadius: radius.pill },
                  indicatorStyle,
                ]}
              />
            ) : null}
            {routes.map((route) => {
              const meta = tabMeta[route.name];
              if (!meta) return null;
              const focused = route.key === activeKey;
              const IconComponent = meta.icon;
              const tint = focused ? colors.onPrimarySoft : colors.textSecondary;
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={meta.label}
                  testID={`tab-${route.name}`}
                  onPress={() => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                  }}
                  style={styles.tab}>
                  <IconComponent size={22} color={tint} strokeWidth={focused ? 2.4 : 2} />
                  <AppText
                    variant="caption"
                    compact
                    numberOfLines={1}
                    style={[styles.tabLabel, { color: tint }, focused && styles.tabLabelFocused]}>
                    {meta.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <PressableScale
            haptic
            testID="create-button"
            accessibilityLabel="Criar"
            accessibilityHint="Abre opções para novo compromisso, conta, nota ou data especial"
            onPress={() => setCreateOpen(true)}
            style={[
              styles.createButton,
              { backgroundColor: colors.primary, borderRadius: radius.pill },
              elevation('raised'),
            ]}>
            <Plus size={28} color={colors.textOnPrimary} strokeWidth={2.6} />
          </PressableScale>
        </View>
      </View>
      <CreateSheet visible={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: maxContentWidth },
  bar: { flex: 1, flexDirection: 'row', height: BAR_HEIGHT, padding: BAR_PADDING },
  indicator: { position: 'absolute', top: BAR_PADDING, bottom: BAR_PADDING, left: BAR_PADDING },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: 11, lineHeight: 14 },
  tabLabelFocused: { fontFamily: fontFamilies.bold },
  createButton: { width: CREATE_SIZE, height: CREATE_SIZE, alignItems: 'center', justifyContent: 'center' },
});
