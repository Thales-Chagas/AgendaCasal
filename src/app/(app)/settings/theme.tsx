import { View } from 'react-native';

import { usePreferences, type ThemePreference } from '@/core/preferences/preferences-store';
import { Card, ListRow, Screen, ScreenHeader, useTheme } from '@/design-system';
import { Check, Moon, Sun, SunMoon, type Icon } from '@/design-system/icons';

const options: { value: ThemePreference; title: string; subtitle: string; icon: Icon }[] = [
  { value: 'system', title: 'Automático', subtitle: 'Segue o modo do celular', icon: SunMoon },
  { value: 'light', title: 'Claro', subtitle: 'Sempre claro', icon: Sun },
  { value: 'dark', title: 'Escuro', subtitle: 'Mais confortável à noite', icon: Moon },
];

export default function ThemeScreen() {
  const { colors, spacing } = useTheme();
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);

  return (
    <Screen>
      <ScreenHeader title="Aparência" />
      <Card padded={false}>
        <View style={{ paddingHorizontal: spacing.lg }} accessibilityRole="radiogroup">
          {options.map((o) => (
            <ListRow
              key={o.value}
              icon={o.icon}
              title={o.title}
              subtitle={o.subtitle}
              onPress={() => setTheme(o.value)}
              right={theme === o.value ? <Check size={20} color={colors.primary} strokeWidth={2.6} /> : null}
              testID={`theme-${o.value}`}
            />
          ))}
        </View>
      </Card>
    </Screen>
  );
}
