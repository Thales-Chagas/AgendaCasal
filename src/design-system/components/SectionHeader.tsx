import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme';
import { AppText } from './AppText';

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.row, { marginBottom: spacing.sm, marginTop: spacing.sm }]}>
      <AppText variant="title3" accessibilityRole="header">
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12} style={styles.action}>
          <AppText variant="callout" color="primary">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  action: { minHeight: 44, justifyContent: 'center' },
});
