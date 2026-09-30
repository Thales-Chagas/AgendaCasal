import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, PressableScale, Tag, toast, useTheme } from '@/design-system';
import { Circle, CircleCheck } from '@/design-system/icons';

import { billCategoryMeta, dueLabel, formatCents, scopeLabels } from '../domain/presentation';
import type { BillDue } from '../domain/schedule';
import { toggleBillPaid } from '../hooks';

const statusTone = {
  paid: 'success',
  overdue: 'danger',
  today: 'warning',
  soon: 'warning',
  upcoming: 'neutral',
} as const;

/** Linha de uma conta no mês: toque no círculo para marcar como paga; no resto, abre a conta. */
export const BillDueRow = memo(function BillDueRow({ item }: { item: BillDue }) {
  const { colors, spacing } = useTheme();
  const { bill, due, dueKey, paid, status } = item;
  const category = billCategoryMeta[bill.category];
  const scope = scopeLabels[bill.ownerScope];

  const toggle = async () => {
    try {
      const nowPaid = await toggleBillPaid(bill, dueKey);
      if (nowPaid) toast.success(`${bill.title}: paga ✓`);
    } catch {
      toast.error('Não conseguimos marcar. Tente de novo.');
    }
  };

  return (
    <View style={[styles.row, { gap: spacing.md, paddingVertical: spacing.md }]}>
      <PressableScale
        haptic
        onPress={() => void toggle()}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: paid }}
        accessibilityLabel={paid ? `${bill.title}: paga. Desmarcar` : `Marcar ${bill.title} como paga`}
        hitSlop={8}
        testID={`bill-paid-${bill.id}-${dueKey}`}>
        {paid ? (
          <CircleCheck size={28} color={colors.success} strokeWidth={2.2} />
        ) : (
          <Circle
            size={28}
            color={status === 'overdue' ? colors.danger : colors.borderStrong}
            strokeWidth={2}
          />
        )}
      </PressableScale>
      <Pressable
        style={[styles.body, { gap: spacing.xxs }]}
        onPress={() => router.push({ pathname: '/bill/[id]', params: { id: bill.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${bill.title}, ${dueLabel(due, status)}${
          bill.amountCents !== null ? `, ${formatCents(bill.amountCents)}` : ''
        }, ${scope.short}`}
        accessibilityHint="Abre a conta">
        <View style={[styles.line, { gap: spacing.sm }]}>
          <AppText
            variant="bodyStrong"
            numberOfLines={1}
            style={[
              styles.flex,
              paid ? { color: colors.textSecondary, textDecorationLine: 'line-through' } : null,
            ]}>
            {category.emoji} {bill.title}
          </AppText>
          <AppText variant="bodyStrong" tabular color={paid ? 'textSecondary' : 'textPrimary'}>
            {bill.amountCents !== null ? formatCents(bill.amountCents) : '—'}
          </AppText>
        </View>
        <View style={[styles.line, { gap: spacing.sm }]}>
          <AppText variant="caption" color="textSecondary" style={styles.flex} numberOfLines={1}>
            Dia {format(due, 'd', { locale: ptBR })} · {scope.emoji} {scope.short}
          </AppText>
          <Tag label={dueLabel(due, status)} tone={statusTone[status]} />
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  body: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
