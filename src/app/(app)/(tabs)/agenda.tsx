import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  EventCardSkeleton,
  IconButton,
  Screen,
  SegmentedControl,
  useTheme,
} from '@/design-system';
import { CalendarHeart, ChevronLeft, ChevronRight, Plus, Search } from '@/design-system/icons';
import { DayGroupList } from '@/features/agenda/components/DayGroupList';
import { MonthGrid } from '@/features/agenda/components/MonthGrid';
import { usePeople } from '@/features/couple/hooks';
import { EventCard } from '@/features/events/components/EventCard';
import { toDateKey } from '@/features/events/domain/dates';
import { relativeDayLabel, responsibilityFor } from '@/features/events/domain/presentation';
import type { Responsibility } from '@/features/events/domain/types';
import { useOccurrences } from '@/features/events/hooks';
import { SyncIndicator } from '@/features/sync/components/SyncIndicator';

type View_ = 'day' | 'week' | 'month' | 'upcoming';

const SEGMENTS = [
  { value: 'day', label: 'Hoje' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'upcoming', label: 'Próximos' },
] as const;

const WEEK = { weekStartsOn: 0 as const };

function rangeFor(view: View_, anchor: Date): { from: Date; to: Date } {
  switch (view) {
    case 'day':
      return { from: startOfDay(anchor), to: addDays(startOfDay(anchor), 1) };
    case 'week':
      return { from: startOfWeek(anchor, WEEK), to: addDays(startOfWeek(anchor, WEEK), 7) };
    case 'month':
      return {
        from: startOfWeek(startOfMonth(anchor), WEEK),
        to: addDays(endOfWeek(endOfMonth(anchor), WEEK), 1),
      };
    case 'upcoming': {
      const now = startOfDay(new Date());
      return { from: now, to: addDays(now, 90) };
    }
  }
}

export default function AgendaScreen() {
  const { spacing } = useTheme();
  const { viewerId, partnerName } = usePeople();
  const [view, setView] = useState<View_>('day');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const { from, to } = useMemo(() => rangeFor(view, anchor), [view, anchor]);
  const { data: occurrences = [], isLoading } = useOccurrences(from, to);

  const move = (direction: 1 | -1) => {
    setAnchor((current) =>
      view === 'day'
        ? addDays(current, direction)
        : view === 'week'
          ? addWeeks(current, direction)
          : addMonths(current, direction),
    );
  };

  const title =
    view === 'day'
      ? relativeDayLabel(anchor)
      : view === 'week'
        ? `${format(from, "d 'de' MMM", { locale: ptBR })} – ${format(addDays(to, -1), "d 'de' MMM", { locale: ptBR })}`
        : capitalize(format(anchor, "MMMM 'de' yyyy", { locale: ptBR }));

  const marks = useMemo(() => {
    if (view !== 'month') return {};
    const result: Record<string, Responsibility[]> = {};
    for (const o of occurrences) {
      for (let day = startOfDay(o.start); day < o.end || isSameDay(day, o.start); day = addDays(day, 1)) {
        const key = toDateKey(day);
        (result[key] ??= []).push(responsibilityFor(o.event, viewerId));
        if (day > to) break;
      }
    }
    return result;
  }, [occurrences, view, viewerId, to]);

  const selectedDayList = useMemo(
    () =>
      view === 'month'
        ? occurrences.filter(
            (o) => isSameDay(o.start, anchor) || (o.start < anchor && o.end > addDays(anchor, 0)),
          )
        : [],
    [occurrences, view, anchor],
  );

  const isAtToday = isSameDay(anchor, new Date());

  return (
    <Screen edges={['top']} contentStyle={{ paddingBottom: 120 }}>
      <View style={[styles.header, { marginBottom: spacing.lg }]}>
        <AppText variant="title1" accessibilityRole="header" style={styles.flex}>
          Agenda
        </AppText>
        <IconButton icon={Search} label="Buscar" onPress={() => router.push('/search')} />
        <IconButton
          icon={Plus}
          label="Novo compromisso"
          tone="primary"
          onPress={() => router.push({ pathname: '/event/new', params: { date: toDateKey(anchor) } })}
        />
      </View>

      <SegmentedControl
        accessibilityLabel="Visualização da agenda"
        segments={SEGMENTS}
        value={view}
        onChange={(next) => {
          setView(next);
          if (next === 'day' || next === 'upcoming') setAnchor(startOfDay(new Date()));
        }}
      />

      <View style={{ marginTop: spacing.md, gap: spacing.md }}>
        <SyncIndicator />
        {view !== 'upcoming' ? (
          <View style={styles.navigator}>
            <IconButton icon={ChevronLeft} label="Anterior" onPress={() => move(-1)} />
            <AppText variant="title3" align="center" style={styles.flex} accessibilityLiveRegion="polite">
              {title}
            </AppText>
            <IconButton icon={ChevronRight} label="Próximo" onPress={() => move(1)} />
          </View>
        ) : null}
        {!isAtToday && view !== 'upcoming' ? (
          <Button
            label="Voltar para hoje"
            variant="ghost"
            size="sm"
            fullWidth={false}
            style={styles.center}
            onPress={() => setAnchor(startOfDay(new Date()))}
          />
        ) : null}
      </View>

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {isLoading ? (
          <>
            <EventCardSkeleton />
            <EventCardSkeleton />
          </>
        ) : view === 'month' ? (
          <>
            <Card>
              <MonthGrid
                month={anchor}
                selected={anchor}
                onSelect={(day) => setAnchor(startOfDay(day))}
                marks={marks}
              />
            </Card>
            <AppText
              variant="label"
              color="textSecondary"
              accessibilityRole="header"
              style={{ marginTop: spacing.sm }}>
              {relativeDayLabel(anchor).toUpperCase()}
            </AppText>
            {selectedDayList.length === 0 ? (
              <DayEmpty dayKey={toDateKey(anchor)} />
            ) : (
              selectedDayList.map((o) => (
                <EventCard
                  key={o.key}
                  occurrence={o}
                  viewerId={viewerId}
                  partnerName={partnerName}
                  day={anchor}
                />
              ))
            )}
          </>
        ) : view === 'week' ? (
          <DayGroupList
            occurrences={occurrences}
            viewerId={viewerId}
            partnerName={partnerName}
            days={Array.from({ length: 7 }, (_, i) => addDays(from, i))}
          />
        ) : occurrences.length === 0 ? (
          view === 'day' ? (
            <DayEmpty dayKey={toDateKey(anchor)} />
          ) : (
            <EmptyState
              icon={CalendarHeart}
              title="Vocês ainda não têm nenhum compromisso."
              message="Crie o primeiro e ele aparece aqui para vocês dois."
              action={{ label: '+ Criar primeiro evento', onPress: () => router.push('/event/new') }}
            />
          )
        ) : view === 'day' ? (
          occurrences.map((o) => (
            <EventCard
              key={o.key}
              occurrence={o}
              viewerId={viewerId}
              partnerName={partnerName}
              day={anchor}
            />
          ))
        ) : (
          <DayGroupList occurrences={occurrences} viewerId={viewerId} partnerName={partnerName} />
        )}
      </View>
    </Screen>
  );
}

function DayEmpty({ dayKey }: { dayKey: string }) {
  return (
    <EmptyState
      compact
      icon={CalendarHeart}
      title="Dia livre"
      message="Nenhum compromisso neste dia."
      action={{
        label: '+ Adicionar',
        onPress: () => router.push({ pathname: '/event/new', params: { date: dayKey } }),
      }}
    />
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navigator: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
});
