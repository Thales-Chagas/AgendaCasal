import { isSameDay } from 'date-fns';
import { View } from 'react-native';

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

/** Compromissos agrupados por dia ("Hoje", "Amanhã", "sábado, 4 de out"). */
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
          <AppText variant="label" color="textSecondary" accessibilityRole="header">
            {relativeDayLabel(day).toUpperCase()}
          </AppText>
          {items.length === 0 ? (
            <AppText variant="callout" color="textTertiary">
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
