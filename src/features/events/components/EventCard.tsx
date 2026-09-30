import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, useTheme } from '@/design-system';
import { CloudOff, MapPin, Repeat } from '@/design-system/icons';

import { categoryMeta, formatOccurrenceTime, responsibilityFor } from '../domain/presentation';
import type { Occurrence } from '../domain/types';
import { useResponsibilityTones } from '../tones';
import { ResponsibilityTag } from './ResponsibilityTag';

export type EventCardProps = {
  occurrence: Occurrence;
  viewerId: string;
  partnerName?: string | null;
  /** Dia sendo exibido (para "Até 10:00" em eventos que atravessam a meia-noite). */
  day?: Date;
};

/** Card de compromisso: horário, título, de quem é, categoria e lugar. */
export const EventCard = memo(function EventCard({ occurrence, viewerId, partnerName, day }: EventCardProps) {
  const { colors, spacing, radius } = useTheme();
  const { event } = occurrence;
  const responsibility = responsibilityFor(event, viewerId);
  const category = categoryMeta[event.category];
  const time = formatOccurrenceTime(occurrence, day);
  const tone = useResponsibilityTones()[responsibility];
  const pendingSync = event.version === 0;

  return (
    <Card
      padded={false}
      style={{ backgroundColor: tone.soft }}
      testID={`event-card-${event.id}`}
      onPress={() =>
        router.push({ pathname: '/event/[id]', params: { id: event.id, date: occurrence.localDate } })
      }
      accessibilityLabel={`${event.title}, ${time}, ${responsibilityText(responsibility, partnerName)}${
        event.location ? `, em ${event.location}` : ''
      }`}
      accessibilityHint="Abre os detalhes do compromisso">
      <View style={[styles.row, { padding: spacing.lg, gap: spacing.md }]}>
        <View style={[styles.accent, { backgroundColor: tone.strong, borderRadius: radius.pill }]} />
        <View style={[styles.body, { gap: spacing.xs }]}>
          <View style={[styles.line, { gap: spacing.sm }]}>
            <AppText variant="caption" color="textSecondary" tabular>
              {time}
            </AppText>
            {event.recurrenceRule ? <Repeat size={13} color={colors.textTertiary} /> : null}
            {pendingSync ? <CloudOff size={13} color={colors.textTertiary} /> : null}
          </View>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {category.emoji} {event.title}
          </AppText>
          {event.location ? (
            <View style={[styles.line, { gap: spacing.xs }]}>
              <MapPin size={13} color={colors.textTertiary} />
              <AppText variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
                {event.location}
              </AppText>
            </View>
          ) : null}
          <View style={{ marginTop: spacing.xs }}>
            <ResponsibilityTag responsibility={responsibility} partnerName={partnerName} onTinted />
          </View>
        </View>
      </View>
    </Card>
  );
});

function responsibilityText(
  responsibility: ReturnType<typeof responsibilityFor>,
  partnerName?: string | null,
) {
  if (responsibility === 'mine') return 'meu compromisso';
  if (responsibility === 'partner')
    return partnerName ? `compromisso de ${partnerName}` : 'compromisso do parceiro';
  return 'nosso compromisso';
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  accent: { width: 4 },
  body: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
