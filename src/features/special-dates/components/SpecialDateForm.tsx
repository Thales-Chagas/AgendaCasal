import { useState } from 'react';
import { View } from 'react-native';
import { ZodError } from 'zod';

import { AppText, Button, DateTimeField, ListRow, Screen, TextField, toast, useTheme } from '@/design-system';
import { Repeat } from '@/design-system/icons';
import { ChipRow } from '@/features/events/components/ChipRow';
import { fromDateKey, toDateKey } from '@/features/events/domain/dates';

import { kindMeta, reminderDayLabels } from '../domain/presentation';
import { REMINDER_DAY_OPTIONS, SPECIAL_DATE_KINDS, type SpecialDateFields } from '../domain/types';

type Props = {
  initial: SpecialDateFields;
  header: React.ReactNode;
  submitLabel: string;
  onSubmit: (fields: SpecialDateFields) => Promise<void>;
  extraFooter?: React.ReactNode;
};

export function SpecialDateForm({ initial, header, submitLabel, onSubmit, extraFooter }: Props) {
  const { spacing } = useTheme();
  const [fields, setFields] = useState(initial);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const update = (patch: Partial<SpecialDateFields>) => setFields((f) => ({ ...f, ...patch }));

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
          <Button label={submitLabel} onPress={submit} loading={saving} testID="special-date-save" />
          {extraFooter}
        </View>
      }>
      {header}
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="textSecondary">
            TIPO
          </AppText>
          <ChipRow
            options={SPECIAL_DATE_KINDS.map((k) => ({
              value: k,
              label: kindMeta[k].label,
              emoji: kindMeta[k].emoji,
            }))}
            isSelected={(v) => v === fields.kind}
            onToggle={(kind) =>
              update({
                kind,
                title: fields.title || (kind === 'custom' || kind === 'birthday' ? '' : kindMeta[kind].label),
              })
            }
          />
        </View>
        <TextField
          label="Nome"
          placeholder={
            fields.kind === 'birthday' ? 'Ex.: Aniversário da Ana' : 'Ex.: Nosso primeiro encontro'
          }
          value={fields.title}
          onChangeText={(title) => update({ title })}
          error={error}
          maxLength={80}
          testID="special-date-title"
        />
        <View style={{ flexDirection: 'row' }}>
          <DateTimeField
            label="Data"
            mode="date"
            value={fromDateKey(fields.date)}
            onChange={(d) => update({ date: toDateKey(d) })}
          />
        </View>
        <ListRow
          icon={Repeat}
          title="Repetir todo ano"
          toggle={{ value: fields.repeatsYearly, onChange: (repeatsYearly) => update({ repeatsYearly }) }}
        />
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" color="textSecondary">
            LEMBRAR
          </AppText>
          <ChipRow
            options={REMINDER_DAY_OPTIONS.map((d) => ({ value: d, label: reminderDayLabels[d] as string }))}
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
      </View>
    </Screen>
  );
}
