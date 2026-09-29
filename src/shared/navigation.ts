import { router } from 'expo-router';

/** Volta para a tela anterior; sem histórico (ex.: aberto por link), vai para o Início. */
export function goBackOrHome(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
