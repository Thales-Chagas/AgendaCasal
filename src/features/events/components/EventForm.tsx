import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ZodError } from 'zod';

import { AppText, Button, DateTimeField, ListRow, Screen, TextField, toast, useTheme } from '@/design-system';
import { ChevronDown, ChevronUp, Hourglass, MapPin, NotebookPen } from '@/design-system/icons';

import { addDaysToKey, toDateKey } from '../domain/dates';
import { withEnd, withStart, type EventFormState } from '../domain/form';
import { categoryMeta, priorityLabels, REMINDER_OPTIONS } from '../domain/presentation';
import { describeRule, presetRule, type RecurrencePreset } from '../domain/recurrence';
import { CATEGORIES, PRIORITIES } from '../domain/types';
import { ChipRow } from './ChipRow';
import { CustomRepeatSheet } from './CustomRepeatSheet';
import { ScopePicker } from './ScopePicker';

type Props = {
  initial: EventFormState;
  partnerName: string | null;
  submitLabel: string;
  header: React.ReactNode;
  /** Salva; lança `ZodError` para erros de validação. */
  onSubmit: (state: EventFormState) => Promise<void>;
  /** Abre "Mais opções" de início (edição com campos extras preenchidos). */
  startExpanded?: boolean;
};

const REPEAT_OPTIONS: { value: RecurrencePreset; label: string }[] = [
  { value: 'none', label: 'Não repete' },
  { value: 'daily', label: 'Todo dia' },
  { value: 'weekly', label: 'Toda semana' },
  { value: 'monthly', label: 'Todo mês' },
  { value: 'yearly', label: 'Todo ano' },
  { value: 'custom', label: 'Personalizar…' },
];

/**
 * Formulário progressivo: primeiro só o essencial (o quê, quando, de quem, categoria).
 * O resto fica em "Mais opções".
 */
export function EventForm({ initial, partnerName, submitLabel, header, onSubmit, startExpanded }: Props) {
  const { spacing, colors, radius } = useTheme();
  const [state, setState] = useState(initial);
  const [expanded, setExpanded] = useState(!!startExpanded);
  const [customOpen, setCustomOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<EventFormState>) => setState((s) => ({ ...s, ...patch }));
  const today = toDateKey(new Date());
  const startKey = toDateKey(state.start);

  const setDay = (dayKey: string) => {
    const [y, m, d] = dayKey.split('-').map(Number) as [number, number, number];
    const start = new Date(state.start);
    start.setFullYear(y, m - 1, d);
    setState((s) => withStart(s, start));
  };

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      await onSubmit(state);
    } catch (error) {
      if (error instanceof ZodError) {
        const next: Record<string, string> = {};
        for (const issue of error.issues) next[String(issue.path[0])] ??= issue.message;
        setErrors(next);
        toast.error(Object.values(next)[0] ?? 'Confira os dados do compromisso.');
      } else {
        toast.error('Não conseguimos salvar o compromisso. Tente novamente.');
      }
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button label={submitLabel} onPress={submit} loading={saving} testID="event-save" />}>
      {header}
      <View style={{ gap: spacing.xl }}>
        <TextField
          label="O que vai acontecer?"
          placeholder="Ex.: Jantar, consulta, viagem…"
          value={state.title}
          onChangeText={(title) => update({ title })}
          error={errors.title}
          autoFocus={!initial.title}
          maxLength={120}
          returnKeyType="done"
          testID="event-title"
        />

        <Section title="Quando">
          <ChipRow
            scroll
            options={[
              { value: today, label: 'Hoje' },
              { value: addDaysToKey(today, 1), label: 'Amanhã' },
            ]}
            isSelected={(v) => v === startKey}
            onToggle={setDay}
          />
          <View style={[styles.row, { gap: spacing.sm }]}>
            <DateTimeField
              label="Dia"
              mode="date"
              value={state.start}
              onChange={(date) => setDay(toDateKey(date))}
              testID="event-date"
            />
            {!state.allDay ? (
              <DateTimeField
                label="Começa"
                mode="time"
                value={state.start}
                onChange={(date) => setState((s) => withStart(s, date))}
                testID="event-start"
              />
            ) : null}
          </View>
          {!state.allDay ? (
            <View style={[styles.row, { gap: spacing.sm }]}>
              <DateTimeField
                label="Termina"
                mode="time"
                value={state.end}
                onChange={(date) => {
                  const end = new Date(state.start);
                  end.setHours(date.getHours(), date.getMinutes(), 0, 0);
                  setState((s) => withEnd(s, end));
                }}
                testID="event-end"
              />
              <View style={styles.flex} />
            </View>
          ) : null}
          {errors.endsAt || errors.startsAt ? (
            <AppText variant="caption" color="danger">
              {errors.endsAt ?? errors.startsAt}
            </AppText>
          ) : null}
          <ListRow
            title="Dia inteiro"
            subtitle="Sem horário (ex.: aniversário, viagem)"
            toggle={{ value: state.allDay, onChange: (allDay) => update({ allDay }) }}
          />
        </Section>

        <Section title="De quem é?">
          <ScopePicker
            value={state.scope}
            onChange={(scope) => update({ scope })}
            partnerName={partnerName}
          />
        </Section>

        <Section title="Categoria">
          <ChipRow
            scroll
            testIDPrefix="category"
            options={CATEGORIES.map((c) => ({
              value: c,
              label: categoryMeta[c].label,
              emoji: categoryMeta[c].emoji,
            }))}
            isSelected={(v) => v === state.category}
            onToggle={(category) => update({ category })}
          />
        </Section>

        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          testID="event-more-options"
          style={[
            styles.moreButton,
            { borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.lg },
          ]}>
          <AppText variant="bodyStrong">Mais opções</AppText>
          <AppText variant="caption" color="textSecondary" style={styles.flex}>
            {'  '}lugar, repetição, lembrete…
          </AppText>
          {expanded ? (
            <ChevronUp size={20} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={colors.textSecondary} />
          )}
        </Pressable>

        {expanded ? (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: spacing.xl }}>
            <TextField
              label="Onde?"
              icon={MapPin}
              placeholder="Endereço ou nome do lugar"
              value={state.location}
              onChangeText={(location) => update({ location })}
              error={errors.location}
              maxLength={200}
            />
            <Section title="Repetir">
              <ChipRow
                options={REPEAT_OPTIONS}
                isSelected={(v) => v === state.repeat}
                onToggle={(repeat) => (repeat === 'custom' ? setCustomOpen(true) : update({ repeat }))}
              />
              {state.repeat !== 'none' ? (
                <AppText variant="caption" color="textSecondary">
                  {describeRule(
                    state.repeat === 'custom' ? state.customRule : presetRule(state.repeat, state.start),
                    state.start,
                  )}
                </AppText>
              ) : null}
            </Section>
            <Section title="Lembrete">
              <ChipRow
                options={REMINDER_OPTIONS.map((o) => ({ value: o.minutes, label: o.label }))}
                isSelected={(v) => state.reminders.includes(v)}
                onToggle={(minutes) =>
                  update({
                    reminders: state.reminders.includes(minutes)
                      ? state.reminders.filter((m) => m !== minutes)
                      : [...state.reminders, minutes].slice(-5),
                  })
                }
              />
              <AppText variant="caption" color="textSecondary">
                {state.reminders.length === 0
                  ? 'Sem lembrete.'
                  : state.allDay
                    ? 'Em compromissos de dia inteiro, o lembrete considera 9h da manhã.'
                    : 'Cada pessoa recebe os lembretes dos próprios compromissos e dos "Nosso".'}
              </AppText>
            </Section>
            <Section title="Prioridade">
              <ChipRow
                options={PRIORITIES.map((p) => ({ value: p, label: priorityLabels[p] }))}
                isSelected={(v) => v === state.priority}
                onToggle={(priority) => update({ priority })}
              />
            </Section>
            <ListRow
              icon={Hourglass}
              iconTone="primary"
              title="Contagem regressiva"
              subtitle='Mostra "Faltam X dias" na tela inicial'
              toggle={{ value: state.showCountdown, onChange: (showCountdown) => update({ showCountdown }) }}
            />
            <TextField
              label="Observações"
              icon={NotebookPen}
              placeholder="Detalhes para lembrar (vocês dois veem)"
              value={state.description}
              onChangeText={(description) => update({ description })}
              error={errors.description}
              multiline
              multilineHeight={110}
              maxLength={2000}
            />
          </Animated.View>
        ) : null}
      </View>

      <CustomRepeatSheet
        visible={customOpen}
        start={state.start}
        initialRule={state.customRule}
        onClose={() => setCustomOpen(false)}
        onSave={(rule) => {
          update({ repeat: 'custom', customRule: rule });
          setCustomOpen(false);
        }}
      />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" color="textSecondary" accessibilityRole="header">
        {title.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  flex: { flex: 1 },
  moreButton: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
});
