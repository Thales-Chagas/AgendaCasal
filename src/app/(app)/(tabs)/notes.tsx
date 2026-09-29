import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { usePreferences } from '@/core/preferences/preferences-store';
import { shareJsonFile } from '@/core/sharing/share-file';
import {
  AppText,
  BottomSheet,
  Button,
  Chip,
  EmptyState,
  IconButton,
  ListRow,
  PrivateBadge,
  Screen,
  Skeleton,
  TextField,
  toast,
  useTheme,
} from '@/design-system';
import {
  Archive,
  ArrowUpDown,
  Check,
  Download,
  Lock,
  NotebookPen,
  Plus,
  Search,
} from '@/design-system/icons';
import { useSession } from '@/features/auth/session-store';
import { NoteCard } from '@/features/notes/components/NoteCard';
import { NOTE_SORT_LABELS, type NoteSort } from '@/features/notes/domain/types';
import { useNotes, useNotesCount } from '@/features/notes/hooks';
import { unlockNotes, useNotesLock } from '@/features/notes/lock';
import { openNotes } from '@/features/notes/notes-service';

export default function NotesScreen() {
  const { spacing, colors } = useTheme();
  const userId = useSession((s) => s.userId);
  const lockEnabled = usePreferences((s) => s.lockNotes);
  const unlocked = useNotesLock((s) => s.unlocked);
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const [sort, setSort] = useState<NoteSort>('updated');
  const [sortOpen, setSortOpen] = useState(false);
  const locked = lockEnabled && !unlocked;

  const { data: notes, isLoading } = useNotes(locked ? null : userId, {
    archived,
    sort,
    search: search.trim() || undefined,
  });
  const { data: count } = useNotesCount(locked ? null : userId);

  useEffect(() => {
    if (locked) void unlockNotes();
  }, [locked]);

  const exportNotes = async () => {
    if (!userId) return;
    try {
      const all = await (await openNotes(userId)).exportAll();
      await shareJsonFile(`minhas-notas-${new Date().toISOString().slice(0, 10)}.json`, {
        exported_at: new Date(),
        notes: all,
      });
    } catch {
      toast.error('Não conseguimos exportar as notas.');
    }
  };

  if (locked) {
    return (
      <Screen edges={['top']}>
        <EmptyState
          icon={Lock}
          tone="private"
          title="Notas protegidas"
          message="Desbloqueie para ver suas notas privadas."
          action={{ label: 'Desbloquear', onPress: () => void unlockNotes() }}
        />
      </Screen>
    );
  }

  const empty = !isLoading && (notes?.length ?? 0) === 0;
  const totalActive = count?.active ?? 0;

  return (
    <Screen edges={['top']} contentStyle={{ paddingBottom: 120 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <AppText variant="title1" accessibilityRole="header" style={{ flex: 1 }}>
          Minhas notas
        </AppText>
        <IconButton icon={ArrowUpDown} label="Ordenar" onPress={() => setSortOpen(true)} />
        <IconButton
          icon={Plus}
          label="Nova nota"
          tone="primary"
          onPress={() => router.push('/note/new')}
          testID="notes-new"
        />
      </View>

      <PrivateBadge detailed />

      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        {totalActive > 0 || search ? (
          <TextField
            label="Buscar nas notas"
            icon={Search}
            placeholder="Palavra ou frase"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        ) : null}
        {count && count.archived > 0 ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Chip label="Notas" selected={!archived} onPress={() => setArchived(false)} />
            <Chip
              label={`Arquivadas (${count.archived})`}
              icon={Archive}
              selected={archived}
              onPress={() => setArchived(true)}
            />
          </View>
        ) : null}

        {isLoading ? (
          <>
            <Skeleton height={72} radius={24} />
            <Skeleton height={72} radius={24} />
          </>
        ) : empty ? (
          search ? (
            <EmptyState
              compact
              icon={Search}
              tone="private"
              title="Nada encontrado"
              message="Tente outra palavra."
            />
          ) : archived ? (
            <EmptyState compact icon={Archive} tone="private" title="Nenhuma nota arquivada" />
          ) : (
            <EmptyState
              icon={NotebookPen}
              tone="private"
              title="Seu espaço está vazio."
              message="Crie uma anotação para começar. Só você vê o que escrever aqui."
              action={{ label: '+ Nova nota', onPress: () => router.push('/note/new') }}
            />
          )
        ) : (
          notes?.map((note) => <NoteCard key={note.id} note={note} />)
        )}
      </View>

      {totalActive > 0 ? (
        <Button
          label="Exportar minhas notas"
          icon={Download}
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={exportNotes}
          style={{ alignSelf: 'center', marginTop: spacing.xl }}
        />
      ) : null}

      <BottomSheet visible={sortOpen} onClose={() => setSortOpen(false)} title="Ordenar notas">
        {(Object.keys(NOTE_SORT_LABELS) as NoteSort[]).map((option) => (
          <ListRow
            key={option}
            title={NOTE_SORT_LABELS[option]}
            onPress={() => {
              setSort(option);
              setSortOpen(false);
            }}
            right={sort === option ? <Check size={20} color={colors.primary} /> : null}
          />
        ))}
      </BottomSheet>
    </Screen>
  );
}
