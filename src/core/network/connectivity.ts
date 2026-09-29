import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { create } from 'zustand';

type ConnectivityState = { online: boolean };

/** Estado de conexão observável (para indicadores discretos na interface). */
export const useConnectivity = create<ConnectivityState>(() => ({ online: true }));

let started = false;

/** Liga o NetInfo ao TanStack Query e ao store de conectividade. Idempotente. */
export function startConnectivityMonitoring(onReconnect?: () => void): void {
  if (started) return;
  started = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      const wasOnline = useConnectivity.getState().online;
      useConnectivity.setState({ online });
      setOnline(online);
      if (online && !wasOnline) onReconnect?.();
    }),
  );
}

export function isOnline(): boolean {
  return useConnectivity.getState().online;
}
