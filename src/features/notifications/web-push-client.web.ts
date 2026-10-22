/**
 * Avisos no app pelo navegador (Web Push). No iPhone só funciona com o DuoDay adicionado à Tela
 * de Início (iOS 16.4 ou mais novo); no Android, no Chrome normalmente.
 */
export type WebPushSubscriptionJSON = { endpoint: string; p256dh: string; auth: string };
export type WebPushHint = null | 'install-required' | 'unsupported';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const supported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID_PUBLIC_KEY;

/** Por que não dá para ativar avisos aqui (para a tela explicar o que fazer). */
export function webPushHint(): WebPushHint {
  if (supported()) return null;
  if (isIOS() && !isStandalone()) return 'install-required';
  return 'unsupported';
}

export function webPermissionState(): 'granted' | 'denied' | 'undetermined' {
  if (!supported()) return 'denied';
  return Notification.permission === 'default' ? 'undetermined' : Notification.permission;
}

/** Precisa ser chamado a partir de um toque (exigência do Safari). */
export async function requestWebPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!supported()) return 'denied';
  const result = await Notification.requestPermission();
  return result === 'default' ? 'undetermined' : result;
}

const b64url = (buffer: ArrayBuffer | null) =>
  buffer
    ? btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    : '';

function keyBytes(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)).buffer as ArrayBuffer;
}

/** Inscrição deste navegador (cria se ainda não existir). Só com permissão concedida. */
export async function getWebPushSubscription(): Promise<WebPushSubscriptionJSON | null> {
  if (webPermissionState() !== 'granted') return null;
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
    }));
  return {
    endpoint: subscription.endpoint,
    p256dh: b64url(subscription.getKey('p256dh')),
    auth: b64url(subscription.getKey('auth')),
  };
}

/** Cancela a inscrição deste navegador; devolve o endpoint para apagar no servidor. */
export async function unsubscribeWebPush(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return null;
  await subscription.unsubscribe().catch(() => false);
  return subscription.endpoint;
}

/** Toque no aviso com o app aberto: o service worker pede para abrir a tela certa. */
export function onNotificationNavigate(handler: (href: string) => void): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { type?: string; href?: unknown } | null;
    if (data?.type === 'navigate' && typeof data.href === 'string' && data.href.startsWith('/'))
      handler(data.href);
  });
}
