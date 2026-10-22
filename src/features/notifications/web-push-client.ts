/**
 * Web Push existe só no app pelo navegador (web-push-client.web.ts). No celular os lembretes são
 * agendados no aparelho e os avisos chegam pelo Expo; aqui ficam as mesmas funções, sem efeito.
 */
export type WebPushSubscriptionJSON = { endpoint: string; p256dh: string; auth: string };
export type WebPushHint = null | 'install-required' | 'unsupported';

export const webPushHint = (): WebPushHint => null;
export const webPermissionState = (): 'granted' | 'denied' | 'undetermined' => 'denied';
export const requestWebPermission = async (): Promise<'granted' | 'denied' | 'undetermined'> => 'denied';
export const getWebPushSubscription = async (): Promise<WebPushSubscriptionJSON | null> => null;
export const unsubscribeWebPush = async (): Promise<string | null> => null;
export const onNotificationNavigate = (_handler: (href: string) => void) => undefined;
