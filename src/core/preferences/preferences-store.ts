import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { preferencesStorage } from '@/core/storage/preferences-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

type PreferencesState = {
  theme: ThemePreference;
  hasSeenOnboarding: boolean;
  /** Pede biometria ao abrir as notas privadas. */
  lockNotes: boolean;
  /** Usuários (IDs) que já passaram pela tela "Como você quer começar?". */
  startChoiceDone: Record<string, true>;
  setTheme: (theme: ThemePreference) => void;
  completeOnboarding: () => void;
  setLockNotes: (value: boolean) => void;
  markStartChoiceDone: (userId: string) => void;
};

/** Preferências locais do aparelho (não sensíveis, não sincronizadas). */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      hasSeenOnboarding: false,
      lockNotes: false,
      startChoiceDone: {},
      setTheme: (theme) => set({ theme }),
      completeOnboarding: () => set({ hasSeenOnboarding: true }),
      setLockNotes: (lockNotes) => set({ lockNotes }),
      markStartChoiceDone: (userId) =>
        set((s) => ({ startChoiceDone: { ...s.startChoiceDone, [userId]: true } })),
    }),
    {
      name: 'preferences',
      version: 1,
      storage: createJSONStorage(() => preferencesStorage),
      partialize: ({ theme, hasSeenOnboarding, lockNotes, startChoiceDone }) => ({
        theme,
        hasSeenOnboarding,
        lockNotes,
        startChoiceDone,
      }),
    },
  ),
);
