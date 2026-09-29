import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { logger } from '@/core/logging/logger';
import {
  AppText,
  IconButton,
  PrivateBadge,
  Screen,
  ScreenHeader,
  Skeleton,
  toast,
  useTheme,
} from '@/design-system';
import { Archive, ArchiveRestore, Check, Pin, PinOff, Trash } from '@/design-system/icons';
import { useSession } from '@/features/auth/session-store';
import { isEmptyNote } from '@/features/notes/domain/types';
import { useNote } from '@/features/notes/hooks';
import { invalidateNotes, openNotes } from '@/features/notes/notes-service';
import { goBackOrHome } from '@/shared/navigation';

const AUTOSAVE_MS = 500;

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useSession((s) => s.userId);
  const { colors, spacing, typography } = useTheme();
  const isNew = id === 'new';
  const { data: existing, isLoading } = useNote(userId, isNew ? undefined : id);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const loaded = useRef(isNew);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  // Valores mais recentes para o salvamento automático (atualizados nos eventos, não no render).
  const latest = useRef<{ noteId: string | null; title: string; body: string }>({
    noteId: isNew ? null : id,
    title: '',
    body: '',
  });

  useEffect(() => {
    if (existing && !loaded.current) {
      loaded.current = true;
      latest.current = { noteId: existing.id, title: existing.title, body: existing.body };
      setTitle(existing.title);
      setBody(existing.body);
      setPinned(existing.pinned);
      setArchived(existing.archived);
    }
  }, [existing]);

  const save = useCallback(async () => {
    if (!userId) return;
    const { noteId: currentId, title: t, body: b } = latest.current;
    const repo = await openNotes(userId);
    if (!currentId) {
      if (isEmptyNote({ title: t, body: b })) return;
      const created = await repo.create({ title: t, body: b });
      latest.current.noteId = created.id;
    } else {
      await repo.update(currentId, { title: t, body: b });
    }
    invalidateNotes();
    setStatus('saved');
  }, [userId]);

  const scheduleSave = () => {
    setStatus('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      inflight.current = save().catch((error) => {
        logger.error('Note autosave failed', { error });
        setStatus('idle');
        toast.error('Não conseguimos salvar a nota. Tente de novo.');
      });
    }, AUTOSAVE_MS);
  };

  // Ao sair: salva o que falta; nota vazia é descartada.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (!userId || !loaded.current) return;
      const pending = inflight.current ?? Promise.resolve();
      void pending.then(async () => {
        const { noteId: currentId, title: t, body: b } = latest.current;
        const repo = await openNotes(userId);
        if (isEmptyNote({ title: t, body: b })) {
          if (currentId) await repo.remove(currentId);
        } else if (currentId) {
          await repo.update(currentId, { title: t, body: b });
        } else {
          await repo.create({ title: t, body: b });
        }
        invalidateNotes();
      });
    },
    [userId],
  );

  const withRepo = async (fn: (repo: Awaited<ReturnType<typeof openNotes>>, id: string) => Promise<void>) => {
    if (!userId) return;
    if (!latest.current.noteId) await save();
    const currentId = latest.current.noteId;
    if (!currentId) return;
    await fn(await openNotes(userId), currentId);
    invalidateNotes();
  };

  const togglePin = () =>
    withRepo(async (repo, noteId) => {
      await repo.setPinned(noteId, !pinned);
      setPinned(!pinned);
      toast.success(pinned ? 'Nota desafixada' : 'Nota fixada no topo');
    });

  const toggleArchive = () =>
    withRepo(async (repo, noteId) => {
      await repo.setArchived(noteId, !archived);
      setArchived(!archived);
      toast.success(archived ? 'Nota de volta às notas' : 'Nota arquivada');
      if (!archived) goBackOrHome();
    });

  const remove = () =>
    withRepo(async (repo, noteId) => {
      if (timer.current) clearTimeout(timer.current);
      const removed = await repo.remove(noteId);
      loaded.current = false; // evita salvar de novo ao sair
      goBackOrHome();
      toast.success('Nota excluída', {
        label: 'Desfazer',
        onPress: () => {
          if (removed) void repo.restore(removed).then(invalidateNotes);
        },
      });
    });

  if (!isNew && isLoading) {
    return (
      <Screen>
        <ScreenHeader />
        <Skeleton height={32} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        trailing={
          <>
            <AppText
              variant="caption"
              color="textTertiary"
              style={{ marginRight: spacing.sm }}
              accessibilityLiveRegion="polite">
              {status === 'saving' ? 'Salvando…' : status === 'saved' ? 'Nota salva' : ''}
            </AppText>
            {status === 'saved' ? <Check size={16} color={colors.success} /> : null}
            <IconButton
              icon={pinned ? PinOff : Pin}
              label={pinned ? 'Desafixar' : 'Fixar no topo'}
              onPress={() => void togglePin()}
            />
            <IconButton
              icon={archived ? ArchiveRestore : Archive}
              label={archived ? 'Desarquivar' : 'Arquivar'}
              onPress={() => void toggleArchive()}
            />
            <IconButton icon={Trash} label="Excluir nota" color="danger" onPress={() => void remove()} />
          </>
        }
      />
      <PrivateBadge />
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <TextInput
          value={title}
          onChangeText={(text) => {
            latest.current.title = text;
            setTitle(text);
            scheduleSave();
          }}
          placeholder="Título"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Título da nota"
          maxLength={200}
          style={[typography.title1, styles.input, { color: colors.textPrimary }]}
          testID="note-title"
        />
        <TextInput
          value={body}
          onChangeText={(text) => {
            latest.current.body = text;
            setBody(text);
            scheduleSave();
          }}
          placeholder="Escreva aqui… só você vai ver."
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Texto da nota"
          multiline
          autoFocus={isNew}
          textAlignVertical="top"
          style={[typography.body, styles.input, styles.body, { color: colors.textPrimary }]}
          testID="note-body"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { minHeight: 320 },
  // Na web (pré-visualização), remove o contorno de foco do navegador.
  input: Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {},
});
