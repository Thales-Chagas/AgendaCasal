import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

export type ToastMessage = {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onPress: () => void };
  durationMs: number;
};

type ToastState = {
  current: ToastMessage | null;
  show: (toast: Omit<ToastMessage, 'id' | 'durationMs'> & { durationMs?: number }) => void;
  dismiss: (id?: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  current: null,
  show: (toast) => {
    set({
      current: {
        id: nextId++,
        durationMs: toast.durationMs ?? (toast.action ? 5000 : 2800),
        ...toast,
      },
    });
  },
  dismiss: (id) => {
    const current = get().current;
    if (!current || (id !== undefined && current.id !== id)) return;
    set({ current: null });
  },
}));

/** API simples para qualquer camada disparar feedback visual. */
export const toast = {
  success: (message: string, action?: ToastMessage['action']) =>
    useToastStore.getState().show({ message, tone: 'success', action }),
  error: (message: string) => useToastStore.getState().show({ message, tone: 'error' }),
  info: (message: string, action?: ToastMessage['action']) =>
    useToastStore.getState().show({ message, tone: 'info', action }),
};
