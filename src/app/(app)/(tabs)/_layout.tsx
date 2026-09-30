import Tabs from 'expo-router/js-tabs';

import { useTheme } from '@/design-system';
import { AppTabBar } from '@/features/navigation/AppTabBar';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="finance" options={{ title: 'Finanças' }} />
      <Tabs.Screen name="notes" options={{ title: 'Notas' }} />
      <Tabs.Screen name="us" options={{ title: 'Nós' }} />
    </Tabs>
  );
}
