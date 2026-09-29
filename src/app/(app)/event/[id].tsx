import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import {
  AppText,
  BottomSheet,
  Button,
  Card,
  ErrorState,
  EventCardSkeleton,
  Screen,
  ScreenHeader,
  Tag,
  useTheme,
} from '@/design-system';
import {
  Bell,
  CalendarDays,
  Clock,
  Flag,
  MapPin,
  NotebookPen,
  Pencil,
  Repeat,
  Trash,
  type Icon,
} from '@/design-system/icons';
import { usePeople } from '@/features/couple/hooks';
import { ResponsibilityTag } from '@/features/events/components/ResponsibilityTag';
import { fromDateKey } from '@/features/events/domain/dates';
import {
  categoryMeta,
  countdownLabel,
  formatOccurrenceTime,
  reminderLabel,
  responsibilityFor,
} from '@/features/events/domain/presentation';
import { describeRule, expandOccurrences } from '@/features/events/domain/recurrence';
import { deleteEventWithUndo, skipOccurrence, useEvent } from '@/features/events/hooks';
import { useNow } from '@/shared/hooks/use-now';
import { goBackOrHome } from '@/shared/navigation';

export default function EventDetailScreen() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const { spacing, colors } = useTheme();
  const { viewerId, partnerName, partner, me } = usePeople();
  const { data: event, isLoading } = useEvent(id);
  const [deleteSheet, setDeleteSheet] = useState(false);
  const now = useNow();

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader />
        <EventCardSkeleton />
      </Screen>
    );
  }
  if (!event || event.deletedAt) {
    return (
      <Screen>
        <ScreenHeader />
        <ErrorState title="Compromisso não encontrado" message="Talvez ele tenha sido excluído." />
      </Screen>
    );
  }

  // Ocorrência escolhida (em repetições) ou a primeira.
  const day = date ? fromDateKey(date) : null;
  const seriesStart = event.allDay
    ? fromDateKey(event.startDate as string)
    : new Date(event.startsAt as string);
  const occurrence =
    (day
      ? expandOccurrences(event, day, new Date(day.getTime() + 86_400_000)).find((o) => o.localDate === date)
      : null) ?? expandOccurrences(event, seriesStart, new Date(seriesStart.getTime() + 86_400_000))[0];
  const start = occurrence?.start ?? seriesStart;
  const responsibility = responsibilityFor(event, viewerId);
  const category = categoryMeta[event.category];
  const authorName =
    event.createdBy === viewerId ? 'você' : event.createdBy === partner?.id ? partner?.displayName : null;

  const remove = async () => {
    setDeleteSheet(false);
    goBackOrHome();
    await deleteEventWithUndo(event.id);
  };

  const openMap = () => {
    const query = encodeURIComponent(event.location ?? '');
    const url = Platform.OS === 'ios' ? `maps:0,0?q=${query}` : `geo:0,0?q=${query}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`),
    );
  };

  return (
    <Screen
      footer={
        <View style={[styles.row, { gap: spacing.sm }]}>
          <Button
            label="Excluir"
            icon={Trash}
            variant="danger"
            fullWidth={false}
            onPress={() => (event.recurrenceRule ? setDeleteSheet(true) : void remove())}
            testID="event-delete"
          />
          <Button
            label="Editar"
            icon={Pencil}
            onPress={() => router.push({ pathname: '/event/edit/[id]', params: { id: event.id } })}
            style={styles.flex}
            testID="event-edit"
          />
        </View>
      }>
      <ScreenHeader />
      <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
        <AppText variant="display" accessibilityRole="header">
          {category.emoji} {event.title}
        </AppText>
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          <ResponsibilityTag responsibility={responsibility} partnerName={partnerName} />
          <Tag label={category.label} tone="neutral" />
          {event.priority === 'high' ? <Tag label="Prioridade alta" icon={Flag} tone="warning" /> : null}
          {event.showCountdown && start.getTime() > now.getTime() ? (
            <Tag label={countdownLabel(start)} tone="primary" />
          ) : null}
        </View>
      </View>

      <Card>
        <View style={{ gap: spacing.lg }}>
          <InfoRow
            icon={CalendarDays}
            title={capitalize(format(start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }))}
            subtitle={occurrence ? formatOccurrenceTime(occurrence) : undefined}
          />
          {event.recurrenceRule ? (
            <InfoRow icon={Repeat} title={describeRule(event.recurrenceRule, start)} />
          ) : null}
          {event.location ? (
            <InfoRow
              icon={MapPin}
              title={event.location}
              subtitle="Toque para abrir no mapa"
              onPress={openMap}
            />
          ) : null}
          {event.reminderMinutes.length ? (
            <InfoRow icon={Bell} title={event.reminderMinutes.map(reminderLabel).join(' · ')} />
          ) : null}
          {event.description ? <InfoRow icon={NotebookPen} title={event.description} /> : null}
        </View>
      </Card>

      <View style={[styles.row, { gap: spacing.xs, marginTop: spacing.lg }]}>
        <Clock size={14} color={colors.textTertiary} />
        <AppText variant="caption" color="textSecondary">
          {authorName ? `Criado por ${authorName}` : 'Criado'} em{' '}
          {format(new Date(event.createdAt), "d 'de' MMM", { locale: ptBR })}
          {event.version === 0 ? ' · Será sincronizado quando houver internet' : ''}
          {me && event.updatedBy && event.updatedBy !== event.createdBy
            ? ` · editado por ${event.updatedBy === viewerId ? 'você' : (partnerName ?? 'parceiro')}`
            : ''}
        </AppText>
      </View>

      <BottomSheet
        visible={deleteSheet}
        onClose={() => setDeleteSheet(false)}
        title="Excluir compromisso que se repete">
        <View style={{ gap: spacing.sm }}>
          {occurrence ? (
            <Button
              label="Excluir só este dia"
              variant="secondary"
              onPress={() => {
                setDeleteSheet(false);
                goBackOrHome();
                void skipOccurrence(event, occurrence.localDate);
              }}
            />
          ) : null}
          <Button label="Excluir todas as repetições" variant="danger" onPress={remove} />
          <Button label="Cancelar" variant="ghost" onPress={() => setDeleteSheet(false)} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

function InfoRow({
  icon: IconComponent,
  title,
  subtitle,
  onPress,
}: {
  icon: Icon;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.md, alignItems: 'flex-start' }]}>
      <IconComponent size={20} color={colors.primary} style={{ marginTop: 2 }} />
      <View style={styles.flex}>
        <AppText variant="body" onPress={onPress} accessibilityRole={onPress ? 'link' : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  flex: { flex: 1 },
});
