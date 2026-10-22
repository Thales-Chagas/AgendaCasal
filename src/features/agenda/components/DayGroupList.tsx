import { differenceInCalendarDays } from 'date-fns/differenceInCalendarDays';
import { format } from 'date-fns/format';
import { isSameDay } from 'date-fns/isSameDay';
import { ptBR } from 'date-fns/locale/pt-BR';
import { StyleSheet, View } from 'react-native';

import { AppText, useTheme } from '@/design-system';
import { EventCard } from '@/features/events/components/EventCard';
import { toDateKey } from '@/features/events/domain/dates';
import { relativeDayLabel } from '@/features/events/domain/presentation';
import type { Occurrence } from '@/features/events/domain/types';

type Props = {
  occurrences: readonly Occurrence[];
  viewerId: string;
  partnerName: string | null;
  /** Mostra também dias vazios entre `from` e `to` (visão semanal). */
  days?: Date[];
};

/** Compromissos agrupados por dia, cada um com um cabeçalho em destaque para não se perder. */
export function DayGroupList({ occurrences, viewerId, partnerName, days }: Props) {
  const { spacing } = useTheme();
  const groups = days
    ? days.map((day) => ({
        day,
        items: occurrences.filter(
          (o) => isSameDay(o.start, day) || (o.start < day && o.end > day && !isSameDay(o.end, day)),
        ),
      }))
    : groupByDay(occurrences);

  return (
    <View style={{ gap: spacing.xl }}>
      {groups.map(({ day, items }) => (
        <View key={toDateKey(day)} style={{ gap: spacing.sm }}>
          <DayHeader day={day} count={items.length} />
          {items.length === 0 ? (
            <AppText variant="callout" color="textTertiary" style={{ paddingLeft: BADGE_WIDTH + spacing.md }}>
              Dia livre
            </AppText>
          ) : (
            items.map((o) => (
              <EventCard key={o.key} occurrence={o} viewerId={viewerId} partnerName={partnerName} day={day} />
            ))
          )}
        </View>
      ))}
    </View>
  );
}

const BADGE_WIDTH = 48;
const WEEKDAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

/**
 * "[DOM 18] Domingo · 18 de outubro": selo com o dia da semana e o número, nome do dia em
 * destaque e a data por extenso. Hoje ganha o selo cheio na cor do app.
 */
function DayHeader({ day, count }: { day: Date; count: number }) {
  const { colors, radius, spacing } = useTheme();
  const now = new Date();
  const isToday = isSameDay(day, now);
  const isPast = differenceInCalendarDays(day, now) < 0;
  const relative = relativeDayLabel(day, now);
  const isRelative = ['Hoje', 'Amanhã', 'Ontem'].includes(relative);
  const weekday = format(day, 'EEEE', { locale: ptBR });
  const title = isRelative ? relative : capitalize(weekday);
  const detail = isRelative
    ? `${weekday}, ${format(day, "d 'de' MMMM", { locale: ptBR })}`
    : format(day, day.getFullYear() === now.getFullYear() ? "d 'de' MMMM" : "d 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      });

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${title}, ${detail}. ${count === 0 ? 'Dia livre' : `${count} ${count === 1 ? 'compromisso' : 'compromissos'}`}`}
      style={[styles.header, { gap: spacing.md, opacity: isPast ? 0.7 : 1 }]}>
      <View
        style={[
          styles.badge,
          {
            borderRadius: radius.md,
            backgroundColor: isToday ? colors.primary : colors.primarySoft,
          },
        ]}>
        <AppText
          variant="label"
          compact
          style={[styles.badgeWeekday, { color: isToday ? colors.textOnPrimary : colors.onPrimarySoft }]}>
          {WEEKDAY_SHORT[day.getDay()]}
        </AppText>
        <AppText
          variant="title2"
          compact
          tabular
          style={[styles.badgeNumber, { color: isToday ? colors.textOnPrimary : colors.onPrimarySoft }]}>
          {day.getDate()}
        </AppText>
      </View>
      <View style={styles.headerText}>
        <AppText variant="title3" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {detail}
        </AppText>
      </View>
      {count > 0 ? (
        <View style={[styles.count, { backgroundColor: colors.surfaceMuted, borderRadius: radius.pill }]}>
          <AppText variant="caption" color="textSecondary" compact tabular>
            {count}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  badge: { width: BADGE_WIDTH, height: 52, alignItems: 'center', justifyContent: 'center' },
  badgeWeekday: { fontSize: 11, lineHeight: 13, letterSpacing: 0.6 },
  badgeNumber: { lineHeight: 24 },
  headerText: { flex: 1, gap: 1 },
  count: { minWidth: 28, height: 24, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
});

function groupByDay(occurrences: readonly Occurrence[]) {
  const map = new Map<string, { day: Date; items: Occurrence[] }>();
  for (const o of occurrences) {
    const day = new Date(o.start.getFullYear(), o.start.getMonth(), o.start.getDate());
    const key = toDateKey(day);
    const group = map.get(key) ?? { day, items: [] };
    group.items.push(o);
    map.set(key, group);
  }
  return [...map.values()];
}
