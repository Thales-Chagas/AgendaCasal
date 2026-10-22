import { addDays } from 'date-fns/addDays';
import { endOfMonth } from 'date-fns/endOfMonth';
import { endOfWeek } from 'date-fns/endOfWeek';
import { format } from 'date-fns/format';
import { isSameDay } from 'date-fns/isSameDay';
import { isSameMonth } from 'date-fns/isSameMonth';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { ptBR } from 'date-fns/locale/pt-BR';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, fontFamilies, useTheme } from '@/design-system';
import { toDateKey } from '@/features/events/domain/dates';
import type { Responsibility } from '@/features/events/domain/types';
import { useResponsibilityTones } from '@/features/events/tones';

const WEEK_OPTIONS = { weekStartsOn: 0 as const };
const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const OWNER_ORDER: readonly Responsibility[] = ['ours', 'mine', 'partner'];

/** `#RRGGBB` + opacidade → `rgba(...)`. */
function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

type Props = {
  month: Date;
  selected: Date;
  onSelect: (day: Date) => void;
  /** Por dia (YYYY-MM-DD): quais "donos" têm compromissos (para tingir o dia com a cor de cada um). */
  marks: Record<string, Responsibility[]>;
};

/**
 * Calendário mensal. Dia com compromisso ganha um fundo suave e um leve brilho na cor de quem
 * marcou (rosé quando é do casal); com mais de um dono, o fundo se divide em faixas.
 */
export const MonthGrid = memo(function MonthGrid({ month, selected, onSelect, marks }: Props) {
  const { colors, radius } = useTheme();
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
            const unique = OWNER_ORDER.filter((owner) => owners.includes(owner));
            const lead = unique[0] ? tones[unique[0]] : undefined;
            const marked = !!lead && !isSelected;
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
                      borderRadius: radius.md,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      opacity: inMonth || isSelected ? 1 : 0.55,
                    },
                    marked && {
                      borderWidth: 1,
                      borderColor: withAlpha(lead.solid, 0.4),
                      boxShadow: `0 2px 8px ${withAlpha(lead.solid, 0.28)}`,
                    },
                    isToday && !isSelected && { borderWidth: 2, borderColor: colors.primary },
                  ]}>
                  {marked ? (
                    <View style={[StyleSheet.absoluteFill, styles.bands, { borderRadius: radius.md }]}>
                      {unique.map((owner) => (
                        <View key={owner} style={[styles.band, { backgroundColor: tones[owner].soft }]} />
                      ))}
                    </View>
                  ) : null}
                  <AppText
                    variant="callout"
                    compact
                    tabular
                    style={{
                      color: isSelected
                        ? colors.textOnPrimary
                        : marked && unique.length === 1
                          ? lead.strong
                          : inMonth
                            ? colors.textPrimary
                            : colors.textTertiary,
                      fontFamily: marked || isToday || isSelected ? fontFamilies.bold : undefined,
                    }}>
                    {day.getDate()}
                  </AppText>
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
  day: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bands: { flexDirection: 'row', overflow: 'hidden' },
  band: { flex: 1 },
});
