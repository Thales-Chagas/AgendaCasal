import { format } from 'date-fns/format';
import { isToday } from 'date-fns/isToday';
import { ptBR } from 'date-fns/locale/pt-BR';
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, useTheme } from '@/design-system';
import { Pin } from '@/design-system/icons';

import { displayTitle, preview, type Note } from '../domain/types';

export const NoteCard = memo(function NoteCard({ note }: { note: Note }) {
  const { colors, spacing } = useTheme();
  const updated = new Date(note.updatedAt);
  const when = isToday(updated) ? format(updated, 'HH:mm') : format(updated, "d 'de' MMM", { locale: ptBR });
  const text = preview(note);

  return (
    <Card
      testID={`note-${note.id}`}
      onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
      accessibilityLabel={`${note.pinned ? 'Fixada. ' : ''}${displayTitle(note)}. ${text}`}>
      <View style={{ gap: spacing.xs }}>
        <View style={[styles.row, { gap: spacing.sm }]}>
          {note.pinned ? <Pin size={14} color={colors.private} fill={colors.private} /> : null}
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {displayTitle(note)}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {when}
          </AppText>
        </View>
        {text ? (
          <AppText variant="callout" color="textSecondary" numberOfLines={2}>
            {text}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
