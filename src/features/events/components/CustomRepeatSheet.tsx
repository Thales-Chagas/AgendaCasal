import { useState } from 'react';
import { View } from 'react-native';

import { AppText, BottomSheet, Button, DateTimeField, IconButton, useTheme } from '@/design-system';
import { Minus, Plus } from '@/design-system/icons';

import { fromDateKey, toDateKey } from '../domain/dates';
import {
  buildRule,
  describeRule,
  parseRule,
  weekdayOf,
  type Frequency,
  type Weekday,
} from '../domain/recurrence';
import { ChipRow } from './ChipRow';

type Props = {
  visible: boolean;
  start: Date;
  initialRule: string | null;
  onClose: () => void;
  onSave: (rule: string) => void;
};

const UNITS: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Dias' },
  { value: 'weekly', label: 'Semanas' },
  { value: 'monthly', label: 'Meses' },
  { value: 'yearly', label: 'Anos' },
];
const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 0, label: 'Seg' },
  { value: 1, label: 'Ter' },
  { value: 2, label: 'Qua' },
  { value: 3, label: 'Qui' },
  { value: 4, label: 'Sex' },
  { value: 5, label: 'Sáb' },
  { value: 6, label: 'Dom' },
];

/** Repetição personalizada: "a cada N semanas, às terças e quintas, até tal dia". */
export function CustomRepeatSheet({ visible, start, initialRule, onClose, onSave }: Props) {
  const { spacing } = useTheme();
  const initial = parseRule(initialRule);
  const [freq, setFreq] = useState<Frequency>(initial?.freq ?? 'weekly');
  const [interval, setInterval] = useState(initial?.interval ?? 1);
  const [weekdays, setWeekdays] = useState<Weekday[]>(initial?.weekdays ?? [weekdayOf(start)]);
  const [until, setUntil] = useState<string | null>(initial?.until ?? null);

  const rule = buildRule({ freq, interval, weekdays: freq === 'weekly' ? weekdays : undefined, until });

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Repetir">
      <View style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <AppText variant="body">A cada</AppText>
          <IconButton
            icon={Minus}
            label="Diminuir"
            tone="muted"
            size={16}
            onPress={() => setInterval((n) => Math.max(1, n - 1))}
          />
          <AppText variant="title3" tabular accessibilityLiveRegion="polite">
            {interval}
          </AppText>
          <IconButton
            icon={Plus}
            label="Aumentar"
            tone="muted"
            size={16}
            onPress={() => setInterval((n) => Math.min(99, n + 1))}
          />
        </View>
        <ChipRow options={UNITS} isSelected={(v) => v === freq} onToggle={setFreq} />
        {freq === 'weekly' ? (
          <ChipRow
            options={WEEKDAYS}
            isSelected={(v) => weekdays.includes(v)}
            onToggle={(v) =>
              setWeekdays((current) =>
                current.includes(v)
                  ? current.length > 1
                    ? current.filter((d) => d !== v)
                    : current
                  : [...current, v],
              )
            }
          />
        ) : null}
        <ChipRow
          options={[
            { value: 'never', label: 'Sem data para acabar' },
            { value: 'until', label: 'Até uma data' },
          ]}
          isSelected={(v) => (v === 'until') === !!until}
          onToggle={(v) => {
            if (v === 'never') setUntil(null);
            else {
              const d = new Date(start);
              d.setMonth(d.getMonth() + 3);
              setUntil(toDateKey(d));
            }
          }}
        />
        {until ? (
          <View style={{ flexDirection: 'row' }}>
            <DateTimeField
              label="Último dia"
              mode="date"
              value={fromDateKey(until)}
              minimumDate={start}
              onChange={(d) => setUntil(toDateKey(d))}
            />
          </View>
        ) : null}
        <AppText variant="callout" color="textSecondary">
          {describeRule(rule, start)}
        </AppText>
        <Button label="Usar esta repetição" onPress={() => onSave(rule)} />
      </View>
    </BottomSheet>
  );
}
