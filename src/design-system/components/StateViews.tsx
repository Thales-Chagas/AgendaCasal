import { StyleSheet, View } from 'react-native';

import { CircleAlert, WifiOff, type Icon } from '../icons';
import type { ColorTokens } from '../tokens/colors';
import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { Button } from './Button';

type Action = { label: string; onPress: () => void; icon?: Icon };

export type EmptyStateProps = {
  icon: Icon;
  title: string;
  message?: string;
  action?: Action;
  tone?: keyof Pick<ColorTokens, 'primary' | 'private' | 'info'>;
  compact?: boolean;
};

/** Nunca uma tela em branco: sempre explica e sugere o próximo passo. */
export function EmptyState({
  icon: IconComponent,
  title,
  message,
  action,
  tone = 'primary',
  compact,
}: EmptyStateProps) {
  const { colors, spacing, radius } = useTheme();
  const softKey = tone === 'private' ? 'privateSoft' : tone === 'info' ? 'infoSoft' : 'primarySoft';

  return (
    <View
      style={[styles.container, { gap: spacing.md, paddingVertical: compact ? spacing.xl : spacing.huge }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors[softKey], borderRadius: radius.pill }]}>
        <IconComponent size={28} color={colors[tone]} strokeWidth={1.8} />
      </View>
      <AppText variant="title3" align="center" accessibilityRole="header">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color="textSecondary" align="center" style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {action ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button
            label={action.label}
            icon={action.icon}
            onPress={action.onPress}
            fullWidth={false}
            size="md"
          />
        </View>
      ) : null}
    </View>
  );
}

export type ErrorStateProps = {
  title?: string;
  message?: string;
  offline?: boolean;
  onRetry?: () => void;
};

/** Erro amigável. Detalhes técnicos vão só para o log. */
export function ErrorState({ title, message, offline, onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      icon={offline ? WifiOff : CircleAlert}
      tone="info"
      title={title ?? (offline ? 'Sem internet no momento' : 'Algo não saiu como esperado')}
      message={
        message ??
        (offline
          ? 'Assim que a conexão voltar, tudo se atualiza sozinho.'
          : 'Não foi culpa sua. Tente novamente em instantes.')
      }
      action={onRetry ? { label: 'Tentar de novo', onPress: onRetry } : undefined}
    />
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconCircle: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  message: { maxWidth: 320 },
});
