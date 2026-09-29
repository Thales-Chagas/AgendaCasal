import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * "Agora" como estado: atualiza a cada intervalo e quando o app volta ao primeiro plano.
 * Mantém a renderização pura (sem `Date.now()` durante o render).
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [intervalMs]);

  return now;
}
