import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { toAppError } from '@/core/errors/app-error';
import { logger } from '@/core/logging/logger';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      // Não repete erros de permissão/validação: só falhas transitórias.
      retry: (failureCount, error) => {
        const code = toAppError(error).code;
        return (code === 'network' || code === 'unknown') && failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      onError: (error) => logger.warn('Mutation failed', { code: toAppError(error).code }),
    },
  },
});

// "Foco" no mobile = app voltando ao primeiro plano.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
    return () => subscription.remove();
  });
}
