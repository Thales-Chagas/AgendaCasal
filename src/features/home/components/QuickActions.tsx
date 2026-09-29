import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, useTheme } from '@/design-system';
import { CalendarClock, NotebookPen, type Icon } from '@/design-system/icons';

type Action = { label: string; hint: string; icon: Icon; href: Href; tone: 'primary' | 'private' };

const actions: Action[] = [
  { label: 'Novo evento', hint: 'Para vocês dois', icon: CalendarClock, href: '/event/new', tone: 'primary' },
  { label: 'Nova anotação', hint: '🔒 Só sua', icon: NotebookPen, href: '/note/new', tone: 'private' },
];

export function QuickActions() {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.md }]}>
      {actions.map(({ label, hint, icon: IconComponent, href, tone }) => (
        <Card
          key={label}
          onPress={() => router.push(href)}
          style={styles.flex}
          accessibilityLabel={`${label}. ${hint}`}>
          <View style={{ gap: spacing.sm }}>
            <View
              style={[
                styles.icon,
                {
                  backgroundColor: colors[tone === 'primary' ? 'primarySoft' : 'privateSoft'],
                  borderRadius: radius.md,
                },
              ]}>
              <IconComponent size={20} color={colors[tone]} />
            </View>
            <AppText variant="bodyStrong">{label}</AppText>
            <AppText variant="caption" color="textSecondary">
              {hint}
            </AppText>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  flex: { flex: 1 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
