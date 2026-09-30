import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, useTheme } from '@/design-system';
import { toDateKey } from '@/features/events/domain/dates';
import type { Responsibility } from '@/features/events/domain/types';
import { useResponsibilityTones } from '@/features/events/tones';

const WEEK_OPTIONS = { weekStartsOn: 0 as const };
const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

type Props = {
  month: Date;
  selected: Date;
  onSelect: (day: Date) => void;
  /** Por dia (YYYY-MM-DD): quais "donos" têm compromissos (para os pontinhos). */
  marks: Record<string, Responsibility[]>;
};

/** Calendário mensal com pontinhos coloridos (e contagem para leitores de tela). */
export const MonthGrid = memo(function MonthGrid({ month, selected, onSelect, marks }: Props) {
  const { colors, radius, spacing } = useTheme();
  const tones = useResponsibilityTones();
  const today = new Date();

  const weeks = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), WEEK_OPTIONS);
    const last = endOfWeek(endOfMonth(month), WEEK_OPTIONS);
    const rows: Date[][] = [];
    for (let day = first; day <= last; day = addDays(day, 7)) {
      rows.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)));
    }
    return rows;
  }, [month]);

  return (
    <View accessibilityLabel={format(month, "MMMM 'de' yyyy", { locale: ptBR })}>
      <View style={styles.row}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} style={styles.cell}>
            <AppText variant="caption" color="textTertiary" compact>
              {label}
            </AppText>
          </View>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={toDateKey(week[0] as Date)} style={styles.row}>
          {week.map((day) => {
            const key = toDateKey(day);
            const owners = marks[key] ?? [];
            const inMonth = isSameMonth(day, month);
            const isSelected = isSameDay(day, selected);
            const isToday = isSameDay(day, today);
            const unique = [...new Set(owners)].slice(0, 3);
            return (
              <Pressable
                key={key}
                onPress={() => onSelect(day)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${WEEKDAY_NAMES[day.getDay()]}, ${format(day, "d 'de' MMMM", { locale: ptBR })}${
                  isToday ? ', hoje' : ''
                }. ${owners.length === 0 ? 'Sem compromissos' : `${owners.length} ${owners.length === 1 ? 'compromisso' : 'compromissos'}`}`}
                style={styles.cell}>
                <View
                  style={[
                    styles.day,
                    {
                      borderRadius: radius.pill,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      borderWidth: isToday && !isSelected ? 1.5 : 0,
                      borderColor: colors.primary,
                    },
                  ]}>
                  <AppText
                    variant="callout"
                    compact
                    tabular
                    style={{
                      color: isSelected
                        ? colors.textOnPrimary
                        : inMonth
                          ? colors.textPrimary
                          : colors.textTertiary,
                    }}>
                    {day.getDate()}
                  </AppText>
                </View>
                <View style={[styles.dots, { gap: spacing.xxs }]}>
                  {unique.map((owner) => (
                    <View key={owner} style={[styles.dot, { backgroundColor: tones[owner].strong }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center', paddingVertical: 2 },
  day: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
