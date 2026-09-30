import { isSameDay } from 'date-fns';
import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { usePreferences } from '@/core/preferences/preferences-store';
import {
  AppText,
  Card,
  EmptyState,
  EventCardSkeleton,
  Screen,
  SectionHeader,
  useTheme,
} from '@/design-system';
import { CalendarHeart, Search } from '@/design-system/icons';
import { usePeople } from '@/features/couple/hooks';
import { EventCard } from '@/features/events/components/EventCard';
import {
  countdownLabel,
  greeting,
  longDateLabel,
  relativeDayLabel,
} from '@/features/events/domain/presentation';
import { useUpcoming } from '@/features/events/hooks';
import { ConnectPartnerCard } from '@/features/home/components/ConnectPartnerCard';
import { NextEventHero } from '@/features/home/components/NextEventHero';
import { QuickActions } from '@/features/home/components/QuickActions';
import { useNextCountdown } from '@/features/home/hooks';
import { SyncIndicator } from '@/features/sync/components/SyncIndicator';
import { useAgendaStatus } from '@/features/sync/agenda-runtime';
import { PersonAvatar } from '@/features/couple/components/PersonAvatar';

export default function HomeScreen() {
  const { spacing, colors } = useTheme();
  const { viewerId, me, partner, partnerName, space } = usePeople();
  const startChoiceDone = usePreferences((s) => !!s.startChoiceDone[viewerId]);
  const ready = useAgendaStatus((s) => s.ready);
  const { data: upcoming = [], isLoading, now: today } = useUpcoming(45);
  const { data: countdown } = useNextCountdown();

  const { next, todayList, later } = useMemo(() => {
    const nextTimed = upcoming.find(
      (o) => o.end.getTime() > today.getTime() && (!o.allDay || isSameDay(o.start, today)),
    );
    return {
      next: nextTimed ?? upcoming[0],
      todayList: upcoming.filter((o) => isSameDay(o.start, today) || (o.start < today && o.end > today)),
      later: upcoming.filter((o) => !isSameDay(o.start, today) && o.start > today).slice(0, 3),
    };
  }, [upcoming, today]);

  // Primeiro acesso: "Como você quer começar?" (só para quem ainda não tem parceiro).
  if (space && !partner && !startChoiceDone) return <Redirect href="/start" />;

  const firstName = me?.displayName.split(' ')[0] ?? '';
  const loading = !ready || isLoading;

  return (
    <Screen edges={['top']} contentStyle={{ paddingBottom: 120 }}>
      <View style={[styles.header, { marginBottom: spacing.xl }]}>
        <View style={styles.flex}>
          <AppText variant="title1" accessibilityRole="header" testID="home-greeting">
            {greeting()}, {firstName} ❤️
          </AppText>
          <AppText variant="body" color="textSecondary">
            {longDateLabel(today)}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buscar"
          onPress={() => router.push('/search')}
          hitSlop={8}
          style={[styles.iconButton, { backgroundColor: colors.surface }]}>
          <Search size={20} color={colors.textPrimary} />
        </Pressable>
        {me ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nosso espaço"
            onPress={() => router.push('/us')}>
            <PersonAvatar person={me} size={44} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: spacing.xl }}>
        <SyncIndicator />
        {me && !partner ? <ConnectPartnerCard me={me} /> : null}

        {loading ? (
          <EventCardSkeleton />
        ) : next ? (
          <NextEventHero occurrence={next} viewerId={viewerId} partnerName={partnerName} />
        ) : (
          <Card>
            <EmptyState
              compact
              icon={CalendarHeart}
              title="Nenhum compromisso por perto"
              message={partner ? 'Vocês ainda não têm nenhum compromisso.' : 'Sua agenda está livre.'}
              action={{ label: '+ Criar primeiro evento', onPress: () => router.push('/event/new') }}
            />
          </Card>
        )}

        {countdown ? (
          <Card
            onPress={() => router.push(countdown.href)}
            accessibilityLabel={`${countdownLabel(countdown.date)} para ${countdown.title}`}>
            <View style={[styles.row, { gap: spacing.md }]}>
              <AppText variant="title2">{countdown.emoji}</AppText>
              <View style={styles.flex}>
                <AppText variant="title3">{countdownLabel(countdown.date)} ❤️</AppText>
                <AppText variant="callout" color="textSecondary" numberOfLines={1}>
                  {countdown.title} · {relativeDayLabel(countdown.date)}
                </AppText>
              </View>
            </View>
          </Card>
        ) : null}

        <QuickActions />

        {!loading && todayList.length > 0 ? (
          <View>
            <SectionHeader title="Hoje" actionLabel="Ver agenda" onAction={() => router.push('/agenda')} />
            <View style={{ gap: spacing.md }}>
              {todayList.map((o) => (
                <EventCard
                  key={o.key}
                  occurrence={o}
                  viewerId={viewerId}
                  partnerName={partnerName}
                  day={today}
                />
              ))}
            </View>
          </View>
        ) : null}

        {!loading && later.length > 0 ? (
          <View>
            <SectionHeader title="Próximos" actionLabel="Ver todos" onAction={() => router.push('/agenda')} />
            <View style={{ gap: spacing.md }}>
              {later.map((o) => (
                <View key={o.key} style={{ gap: spacing.xs }}>
                  <AppText variant="caption" color="textSecondary">
                    {relativeDayLabel(o.start)}
                  </AppText>
                  <EventCard occurrence={o} viewerId={viewerId} partnerName={partnerName} />
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
