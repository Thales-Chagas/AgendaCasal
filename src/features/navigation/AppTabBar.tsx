import type Tabs from 'expo-router/js-tabs';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, PressableScale, useTheme } from '@/design-system';
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

export const TAB_BAR_HEIGHT = 64;

/**
 * Barra inferior: Início · Agenda · Finanças · [+] · Notas · Nós.
 * O "+" central abre as ações de criação, sempre ao alcance do polegar.
 */
export function AppTabBar({ state, navigation }: TabBarProps) {
  const { colors, spacing, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const [createOpen, setCreateOpen] = useState(false);

  const routes = state.routes.filter((r) => tabMeta[r.name]);
  const renderTab = (route: (typeof state.routes)[number]) => {
    const meta = tabMeta[route.name];
    if (!meta) return null;
    const focused = state.routes[state.index]?.key === route.key;
    const IconComponent = meta.icon;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        testID={`tab-${route.name}`}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.tab}>
        <View
          style={[
            styles.iconPill,
            { borderRadius: radius.pill, backgroundColor: focused ? colors.primarySoft : 'transparent' },
          ]}>
          <IconComponent
            size={22}
            color={focused ? colors.onPrimarySoft : colors.textSecondary}
            strokeWidth={focused ? 2.4 : 2}
          />
        </View>
        <AppText variant="caption" compact color={focused ? 'textPrimary' : 'textSecondary'}>
          {meta.label}
        </AppText>
      </Pressable>
    );
  };

  const half = Math.ceil(routes.length / 2);

  return (
    <>
      <View
        accessibilityRole="tablist"
        style={[
          styles.bar,
          {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom,
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingHorizontal: spacing.sm,
          },
        ]}>
        {routes.slice(0, half).map(renderTab)}
        <View style={styles.centerSlot}>
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
        {routes.slice(half).map(renderTab)}
      </View>
      <CreateSheet visible={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 56 },
  iconPill: { width: 48, height: 30, alignItems: 'center', justifyContent: 'center' },
  centerSlot: { flex: 1, alignItems: 'center' },
  createButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: -20 },
});
