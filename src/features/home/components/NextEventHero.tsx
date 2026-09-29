import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, useTheme } from '@/design-system';
import { MapPin } from '@/design-system/icons';
import { ResponsibilityTag } from '@/features/events/components/ResponsibilityTag';
import {
  categoryMeta,
  formatOccurrenceTime,
  relativeDayLabel,
  responsibilityFor,
} from '@/features/events/domain/presentation';
import type { Occurrence } from '@/features/events/domain/types';
import { useNow } from '@/shared/hooks/use-now';

type Props = { occurrence: Occurrence; viewerId: string; partnerName: string | null };

/** Destaque do próximo compromisso: grande, claro e tocável. */
export function NextEventHero({ occurrence, viewerId, partnerName }: Props) {
  const { spacing, colors } = useTheme();
  const { event } = occurrence;
  const now = useNow();
  const happeningNow = occurrence.start.getTime() <= now.getTime() && !occurrence.allDay;
  const when = happeningNow
    ? 'Acontecendo agora'
    : occurrence.allDay
      ? relativeDayLabel(occurrence.start)
      : `${relativeDayLabel(occurrence.start)} · em ${formatDistanceToNowStrict(occurrence.start, { locale: ptBR })}`;

  return (
    <Card
      tone="primarySoft"
      testID="next-event"
      onPress={() =>
        router.push({ pathname: '/event/[id]', params: { id: event.id, date: occurrence.localDate } })
      }
      accessibilityLabel={`Próximo compromisso: ${event.title}, ${when}, ${formatOccurrenceTime(occurrence)}`}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="label" color="onPrimarySoft">
          PRÓXIMO COMPROMISSO
        </AppText>
        <AppText variant="title2" numberOfLines={2}>
          {categoryMeta[event.category].emoji} {event.title}
        </AppText>
        <View style={[styles.row, { gap: spacing.sm }]}>
          <AppText variant="display" tabular style={styles.time}>
            {occurrence.allDay ? 'Dia inteiro' : formatOccurrenceTime(occurrence).split(' – ')[0]}
          </AppText>
        </View>
        <AppText variant="callout" color="textSecondary">
          {when}
        </AppText>
        {event.location ? (
          <View style={[styles.row, { gap: spacing.xs }]}>
            <MapPin size={14} color={colors.textSecondary} />
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {event.location}
            </AppText>
          </View>
        ) : null}
        <ResponsibilityTag responsibility={responsibilityFor(event, viewerId)} partnerName={partnerName} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  time: { fontSize: 34, lineHeight: 42 },
});
