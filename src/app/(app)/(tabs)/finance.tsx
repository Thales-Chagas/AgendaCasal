import { addMonths, format, isSameMonth, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  IconButton,
  ListRow,
  Screen,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  useTheme,
} from '@/design-system';
import { ChevronLeft, ChevronRight, Plus, Wallet } from '@/design-system/icons';
import { BillDueRow } from '@/features/finance/components/BillDueRow';
import {
  billCategoryMeta,
  formatCents,
  repeatLabel,
  scopeLabels,
} from '@/features/finance/domain/presentation';
import { monthDues, previousMonthsOverdue, summarize } from '@/features/finance/domain/schedule';
import type { Bill, BillScope } from '@/features/finance/domain/types';
import { useBills } from '@/features/finance/hooks';
import { SyncIndicator } from '@/features/sync/components/SyncIndicator';

type Filter = 'all' | BillScope;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'couple', label: '❤️ Do casal' },
  { value: 'person', label: '🔒 Só minhas' },
];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default function FinanceScreen() {
  const { colors, spacing, radius } = useTheme();
  const { data: allBills = [], isLoading } = useBills();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [filter, setFilter] = useState<Filter>('all');

  // Recalcula a situação das contas quando o dia muda.
  const todayKey = new Date().toDateString();
  const bills = useMemo(
    () => (filter === 'all' ? allBills : allBills.filter((b) => b.ownerScope === filter)),
    [allBills, filter],
  );
  const dues = useMemo(() => monthDues(bills, month, new Date(todayKey)), [bills, month, todayKey]);
  const summary = useMemo(() => summarize(dues), [dues]);
  const isCurrentMonth = isSameMonth(month, new Date(todayKey));
  const overdue = useMemo(
    () => (isCurrentMonth ? previousMonthsOverdue(bills, new Date(todayKey)) : []),
    [bills, isCurrentMonth, todayKey],
  );
  const sortedBills = useMemo(
    () => [...bills].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    [bills],
  );
  const progress = summary.totalCents > 0 ? summary.paidCents / summary.totalCents : 0;

  const addButton = (
    <IconButton icon={Plus} label="Nova conta" tone="primary" onPress={() => router.push('/bill/new')} />
  );

  return (
    <Screen edges={['top']} contentStyle={{ paddingBottom: 120 }}>
      <View style={[styles.header, { marginBottom: spacing.lg }]}>
        <View style={styles.flex}>
          <AppText variant="title1" accessibilityRole="header">
            Finanças
          </AppText>
          <AppText variant="callout" color="textSecondary">
            Contas fixas e lembretes de pagamento
          </AppText>
        </View>
        {addButton}
      </View>

      {isLoading ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={140} />
          <Skeleton height={64} />
          <Skeleton height={64} />
        </View>
      ) : allBills.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta ainda"
          message="Cadastre aluguel, internet, cartão… Avisamos antes de vencer, e vocês marcam quando pagar."
          action={{ label: '+ Adicionar conta', onPress: () => router.push('/bill/new') }}
        />
      ) : (
        <View style={{ gap: spacing.lg }}>
          <SyncIndicator />

          <View style={styles.navigator}>
            <IconButton
              icon={ChevronLeft}
              label="Mês anterior"
              onPress={() => setMonth((m) => addMonths(m, -1))}
            />
            <AppText variant="title3" align="center" style={styles.flex} accessibilityLiveRegion="polite">
              {capitalize(format(month, "MMMM 'de' yyyy", { locale: ptBR }))}
            </AppText>
            <IconButton
              icon={ChevronRight}
              label="Próximo mês"
              onPress={() => setMonth((m) => addMonths(m, 1))}
            />
          </View>
          {!isCurrentMonth ? (
            <Button
              label="Voltar para este mês"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => setMonth(startOfMonth(new Date()))}
              style={{ alignSelf: 'center' }}
            />
          ) : null}

          <Card tone="primarySoft" elevated={false}>
            <View style={{ gap: spacing.sm }}>
              <AppText variant="caption" color="textSecondary">
                TOTAL DO MÊS
              </AppText>
              <AppText
                variant="display"
                tabular
                accessibilityLabel={`Total do mês: ${formatCents(summary.totalCents)}`}>
                {formatCents(summary.totalCents)}
              </AppText>
              <View
                style={[styles.track, { backgroundColor: colors.surface, borderRadius: radius.pill }]}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
                <View
                  style={{
                    width: `${Math.round(progress * 100)}%`,
                    height: '100%',
                    backgroundColor: colors.success,
                    borderRadius: radius.pill,
                  }}
                />
              </View>
              <View style={[styles.line, { gap: spacing.lg }]}>
                <AppText variant="callout" color="textSecondary" tabular>
                  Pago{' '}
                  <AppText variant="callout" tabular>
                    {formatCents(summary.paidCents)}
                  </AppText>
                </AppText>
                <AppText variant="callout" color="textSecondary" tabular>
                  Falta{' '}
                  <AppText variant="callout" tabular>
                    {formatCents(summary.remainingCents)}
                  </AppText>
                </AppText>
              </View>
              <AppText variant="caption" color="textSecondary">
                {summary.paidCount} de {summary.count} {summary.count === 1 ? 'conta paga' : 'contas pagas'}
                {summary.withoutAmount > 0
                  ? ` · ${summary.withoutAmount} sem valor definido (fora da soma)`
                  : ''}
              </AppText>
            </View>
          </Card>

          <SegmentedControl
            accessibilityLabel="Quais contas mostrar"
            segments={FILTERS}
            value={filter}
            onChange={setFilter}
          />

          {overdue.length > 0 ? (
            <Card>
              <AppText variant="bodyStrong" style={{ color: colors.danger }}>
                ⚠️ Atrasadas de meses anteriores
              </AppText>
              {overdue.map((item) => (
                <BillDueRow key={`${item.bill.id}:${item.dueKey}`} item={item} />
              ))}
            </Card>
          ) : null}

          <View>
            <SectionHeader title="Contas do mês" />
            {dues.length === 0 ? (
              <AppText variant="callout" color="textSecondary">
                Nenhuma conta vence neste mês.
              </AppText>
            ) : (
              <Card>
                {dues.map((item) => (
                  <BillDueRow key={`${item.bill.id}:${item.dueKey}`} item={item} />
                ))}
              </Card>
            )}
          </View>

          <View>
            <SectionHeader
              title="Todas as contas"
              actionLabel="+ Nova"
              onAction={() => router.push('/bill/new')}
            />
            <Card padded={false}>
              <View style={{ paddingHorizontal: spacing.lg }}>
                {sortedBills.map((bill: Bill) => (
                  <ListRow
                    key={bill.id}
                    title={`${billCategoryMeta[bill.category].emoji} ${bill.title}`}
                    subtitle={`${repeatLabel(bill)} · ${scopeLabels[bill.ownerScope].emoji} ${scopeLabels[bill.ownerScope].short}`}
                    value={bill.amountCents !== null ? formatCents(bill.amountCents) : undefined}
                    onPress={() => router.push({ pathname: '/bill/[id]', params: { id: bill.id } })}
                  />
                ))}
              </View>
            </Card>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  navigator: { flexDirection: 'row', alignItems: 'center' },
  line: { flexDirection: 'row', alignItems: 'center' },
  track: { height: 8, overflow: 'hidden', marginVertical: 4 },
});
