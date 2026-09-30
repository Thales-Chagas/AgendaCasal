import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ZodError } from 'zod';

import {
  AppText,
  Button,
  DateTimeField,
  PressableScale,
  Screen,
  SegmentedControl,
  TextField,
  toast,
  useTheme,
} from '@/design-system';
import { Heart, Lock, type Icon } from '@/design-system/icons';
import { ChipRow } from '@/features/events/components/ChipRow';
import { fromDateKey, toDateKey } from '@/features/events/domain/dates';

import {
  billCategoryMeta,
  billReminderLabels,
  centsFromTyped,
  formatCents,
  repeatLabel,
} from '../domain/presentation';
import { BILL_CATEGORIES, BILL_REMINDER_OPTIONS, type BillFields, type BillFrequency } from '../domain/types';

type Props = {
  initial: BillFields;
  /** Na edição, o tipo (casal/pessoal) é só exibido: não muda depois de criado. */
  scopeLocked?: boolean;
  viewerId: string;
  header: ReactNode;
  submitLabel: string;
  onSubmit: (fields: BillFields) => Promise<void>;
  extraFooter?: ReactNode;
};

const FREQUENCIES = [
  { value: 'monthly', label: 'Todo mês' },
  { value: 'yearly', label: 'Todo ano' },
] as const satisfies readonly { value: BillFrequency; label: string }[];

export function BillForm({
  initial,
  scopeLocked,
  viewerId,
  header,
  submitLabel,
  onSubmit,
  extraFooter,
}: Props) {
  const { spacing } = useTheme();
  const [fields, setFields] = useState(initial);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const update = (patch: Partial<BillFields>) => setFields((f) => ({ ...f, ...patch }));

  const submit = async () => {
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit(fields);
    } catch (e) {
      const message = e instanceof ZodError ? e.issues[0]?.message : 'Não conseguimos salvar. Tente de novo.';
      setError(message);
      toast.error(message ?? 'Confira os dados.');
      setSaving(false);
    }
  };

  return (
    <Screen
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button label={submitLabel} onPress={submit} loading={saving} testID="bill-save" />
          {extraFooter}
        </View>
      }>
      {header}
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="textSecondary">
            DE QUEM É
          </AppText>
          <View style={[styles.row, { gap: spacing.sm }]} accessibilityRole="radiogroup">
            <ScopeOption
              icon={Heart}
              title="Do casal"
              subtitle="Vocês dois veem"
              selected={fields.ownerScope === 'couple'}
              disabled={scopeLocked}
              onPress={() => update({ ownerScope: 'couple', ownerUserId: null })}
              testID="bill-scope-couple"
            />
            <ScopeOption
              icon={Lock}
              title="Só minha"
              subtitle="Privada: só você vê"
              selected={fields.ownerScope === 'person'}
              disabled={scopeLocked}
              onPress={() => update({ ownerScope: 'person', ownerUserId: viewerId })}
              testID="bill-scope-person"
            />
          </View>
          {scopeLocked ? (
            <AppText variant="caption" color="textTertiary">
              Para mudar de quem é, exclua e crie a conta de novo.
            </AppText>
          ) : null}
        </View>

        <TextField
          label="Nome da conta"
          placeholder="Ex.: Aluguel, Internet, Cartão Nubank"
          value={fields.title}
          onChangeText={(title) => update({ title })}
          error={error}
          maxLength={80}
          testID="bill-title"
        />

        <TextField
          label="Valor (opcional)"
          placeholder="R$ 0,00"
          keyboardType="number-pad"
          value={fields.amountCents === null ? '' : formatCents(fields.amountCents)}
          onChangeText={(text) => update({ amountCents: centsFromTyped(text) || null })}
          helper="Deixe em branco se o valor muda todo mês (ex.: luz)."
          testID="bill-amount"
        />

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="textSecondary">
            VENCIMENTO
          </AppText>
          <SegmentedControl
            accessibilityLabel="Repetição"
            segments={FREQUENCIES}
            value={fields.frequency}
            onChange={(frequency) => update({ frequency })}
          />
          <View style={styles.row}>
            <DateTimeField
              label="Próximo vencimento"
              mode="date"
              value={fromDateKey(fields.firstDueDate)}
              onChange={(d) => update({ firstDueDate: toDateKey(d) })}
            />
          </View>
          <AppText variant="caption" color="textSecondary">
            {repeatLabel(fields)}. Se o dia não existir no mês (ex.: 31), vence no último dia.
          </AppText>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="textSecondary">
            CATEGORIA
          </AppText>
          <ChipRow
            options={BILL_CATEGORIES.map((c) => ({
              value: c,
              label: billCategoryMeta[c].label,
              emoji: billCategoryMeta[c].emoji,
            }))}
            isSelected={(v) => v === fields.category}
            onToggle={(category) => update({ category })}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="textSecondary">
            LEMBRAR
          </AppText>
          <ChipRow
            options={BILL_REMINDER_OPTIONS.map((d) => ({ value: d, label: billReminderLabels[d] as string }))}
            isSelected={(v) => fields.reminderDays.includes(v)}
            onToggle={(day) =>
              update({
                reminderDays: fields.reminderDays.includes(day)
                  ? fields.reminderDays.filter((d) => d !== day)
                  : [...fields.reminderDays, day].sort((a, b) => a - b),
              })
            }
          />
        </View>

        <TextField
          label="Observação (opcional)"
          placeholder="Ex.: pagar pelo app do banco"
          value={fields.notes ?? ''}
          onChangeText={(notes) => update({ notes })}
          maxLength={500}
          multiline
          multilineHeight={88}
        />
      </View>
    </Screen>
  );
}

function ScopeOption({
  icon: IconComponent,
  title,
  subtitle,
  selected,
  disabled,
  onPress,
  testID,
}: {
  icon: Icon;
  title: string;
  subtitle: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { colors, radius, spacing } = useTheme();
  const tone = selected ? colors.primary : colors.textSecondary;
  return (
    <PressableScale
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={`${title}. ${subtitle}`}
      style={[
        styles.option,
        {
          borderRadius: radius.lg,
          gap: spacing.xxs,
          padding: spacing.md,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          opacity: disabled && !selected ? 0.45 : 1,
        },
      ]}>
      <IconComponent size={20} color={tone} strokeWidth={2.2} />
      <AppText
        variant="bodyStrong"
        compact
        style={{ color: selected ? colors.onPrimarySoft : colors.textPrimary }}>
        {title}
      </AppText>
      <AppText variant="caption" color="textSecondary" compact>
        {subtitle}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  option: { flex: 1, borderWidth: 1.5, minHeight: 88, justifyContent: 'center' },
});
