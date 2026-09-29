import { useQuery } from '@tanstack/react-query';

import type { ListOptions } from './data/notes-repository';
import { notesKeys, openNotes } from './notes-service';

/** Lista local de notas (busca, arquivadas e ordenação). */
export function useNotes(userId: string | null, options: ListOptions) {
  return useQuery({
    queryKey: [...notesKeys.all, userId, 'list', options],
    enabled: !!userId,
    staleTime: Infinity,
    placeholderData: (previous) => previous,
    queryFn: async () => (await openNotes(userId as string)).list(options),
  });
}

export function useNote(userId: string | null, id: string | undefined) {
  return useQuery({
    queryKey: [...notesKeys.all, userId, 'one', id],
    enabled: !!userId && !!id && id !== 'new',
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () => (await openNotes(userId as string)).get(id as string),
  });
}

export function useNotesCount(userId: string | null) {
  return useQuery({
    queryKey: [...notesKeys.all, userId, 'count'],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: async () => (await openNotes(userId as string)).count(),
  });
}
