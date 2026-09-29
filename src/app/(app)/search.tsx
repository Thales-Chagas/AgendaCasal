import { addDays } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Card,
  EmptyState,
  ListRow,
  Screen,
  ScreenHeader,
  TextField,
  useTheme,
} from '@/design-system';
import { Lock, Search } from '@/design-system/icons';
import { useSession } from '@/features/auth/session-store';
import { usePeople } from '@/features/couple/hooks';
import { EventCard } from '@/features/events/components/EventCard';
import { relativeDayLabel } from '@/features/events/domain/presentation';
import { expandOccurrences } from '@/features/events/domain/recurrence';
import { useEventSearch, useOccurrences } from '@/features/events/hooks';
import { displayTitle, preview } from '@/features/notes/domain/types';
import { useNotes } from '@/features/notes/hooks';
import { parseDateQuery } from '@/features/search/parse-date-query';
import { kindMeta } from '@/features/special-dates/domain/presentation';
import { useSpecialDates } from '@/features/special-dates/hooks';
import { normalizeSearch } from '@/features/sync/entities';

/** Busca global. Tudo acontece no aparelho (inclusive nas notas privadas). */
export default function SearchScreen() {
  const { spacing } = useTheme();
  const userId = useSession((s) => s.userId);
  const { viewerId, partnerName } = usePeople();
  const [term, setTerm] = useState('');
  const trimmed = term.trim();
  const date = parseDateQuery(trimmed);
  const dateMs = date ? date.getTime() : 0;

  // O React Compiler memoriza automaticamente; a consulta usa os milissegundos como chave.
  const byDate = useOccurrences(new Date(dateMs), addDays(new Date(dateMs), 1));
  const events = useEventSearch(date ? '' : trimmed);
  const notes = useNotes(trimmed.length >= 2 && !date ? userId : null, { search: trimmed });
  const { data: specialDates = [] } = useSpecialDates();

  const query = normalizeSearch(trimmed);
  const special =
    query.length < 2
      ? []
      : specialDates.filter(
          ({ item }) =>
            normalizeSearch(item.title).includes(query) ||
            normalizeSearch(kindMeta[item.kind].label).includes(query),
        );

  // Para cada compromisso encontrado, mostra a próxima ocorrência (ou a última).
  const now = new Date();
  const eventOccurrences = (events.data ?? [])
    .map((event) => {
      const next = expandOccurrences(event, now, addDays(now, 400))[0];
      if (next) return next;
      const start = event.allDay
        ? new Date(`${event.startDate}T00:00:00`)
        : new Date(event.startsAt as string);
      return expandOccurrences(event, start, addDays(start, 1))[0];
    })
    .filter((o): o is NonNullable<typeof o> => !!o)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const dateResults = date ? (byDate.data ?? []) : [];
  const nothing =
    trimmed.length >= 2 &&
    eventOccurrences.length === 0 &&
    special.length === 0 &&
    (notes.data?.length ?? 0) === 0 &&
    dateResults.length === 0;

  return (
    <Screen>
      <ScreenHeader title="Buscar" />
      <TextField
        label="O que você procura?"
        icon={Search}
        placeholder="Palavra, lugar, categoria ou data (12/10)"
        value={term}
        onChangeText={setTerm}
        autoFocus
        returnKeyType="search"
        clearButtonMode="while-editing"
        testID="search-input"
      />

      <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
        {trimmed.length < 2 ? (
          <AppText variant="callout" color="textSecondary" align="center">
            Busque em compromissos, datas especiais e nas suas notas.
          </AppText>
        ) : null}

        {date ? (
          <Section title={relativeDayLabel(date)}>
            {dateResults.length === 0 ? (
              <AppText variant="callout" color="textSecondary">
                Nenhum compromisso neste dia.
              </AppText>
            ) : (
              dateResults.map((o) => (
                <EventCard
                  key={o.key}
                  occurrence={o}
                  viewerId={viewerId}
                  partnerName={partnerName}
                  day={date}
                />
              ))
            )}
          </Section>
        ) : null}

        {eventOccurrences.length ? (
          <Section title="Compromissos">
            {eventOccurrences.map((o) => (
              <View key={o.key} style={{ gap: spacing.xs }}>
                <AppText variant="caption" color="textSecondary">
                  {relativeDayLabel(o.start)}
                </AppText>
                <EventCard occurrence={o} viewerId={viewerId} partnerName={partnerName} />
              </View>
            ))}
          </Section>
        ) : null}

        {special.length ? (
          <Section title="Datas especiais">
            <Card padded={false}>
              <View style={{ paddingHorizontal: spacing.lg }}>
                {special.map(({ item, key, occurrence }) => (
                  <ListRow
                    key={key}
                    title={`${kindMeta[item.kind].emoji} ${item.title}`}
                    subtitle={relativeDayLabel(occurrence)}
                    onPress={() => router.push({ pathname: '/special-date/[id]', params: { id: item.id } })}
                  />
                ))}
              </View>
            </Card>
          </Section>
        ) : null}

        {notes.data?.length ? (
          <Section title="🔒 Suas notas (só neste celular)">
            <Card padded={false}>
              <View style={{ paddingHorizontal: spacing.lg }}>
                {notes.data.map((note) => (
                  <ListRow
                    key={note.id}
                    icon={Lock}
                    iconTone="private"
                    title={displayTitle(note)}
                    subtitle={preview(note, 60) || undefined}
                    onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
                  />
                ))}
              </View>
            </Card>
          </Section>
        ) : null}

        {nothing ? (
          <EmptyState
            compact
            icon={Search}
            tone="info"
            title="Nada encontrado"
            message="Tente outra palavra ou uma data como 12/10."
          />
        ) : null}
      </View>
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
