import { AppText, EmptyState, Screen } from '@/design-system';
import { Settings } from '@/design-system/icons';

/** Exibida apenas quando faltam as variáveis públicas do Supabase (ambiente de desenvolvimento). */
export function NotConfiguredScreen() {
  return (
    <Screen>
      <EmptyState
        icon={Settings}
        tone="info"
        title="Quase lá"
        message="Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env e reinicie o app."
      />
      <AppText variant="caption" color="textSecondary" align="center">
        Veja docs/SETUP.md
      </AppText>
    </Screen>
  );
}
