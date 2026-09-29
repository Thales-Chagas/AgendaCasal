import { View } from 'react-native';

import { useTheme } from '../theme/theme';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmação só para ações importantes. Para o resto, prefira "Desfazer". */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { spacing } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onCancel} title={title}>
      {message ? (
        <AppText variant="body" color="textSecondary" style={{ marginBottom: spacing.xl }}>
          {message}
        </AppText>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <Button
          label={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          onPress={onConfirm}
          loading={loading}
        />
        <Button label={cancelLabel} variant="ghost" onPress={onCancel} disabled={loading} />
      </View>
    </BottomSheet>
  );
}
