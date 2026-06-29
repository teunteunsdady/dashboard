const SW_URL = '/sw.js'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getVapidPublicKey(): string | null {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : null
}

export function isWebPushConfigured(): boolean {
  return Boolean(getVapidPublicKey())
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebPushSupported()) return null

  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: '/' })
  } catch {
    return null
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null

  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const vapidKey = getVapidPublicKey()
  if (!vapidKey || !isWebPushSupported()) return null

  const registration = await registerServiceWorker()
  if (!registration) return null

  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  })
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getPushSubscription()
  if (!subscription) return true

  try {
    return await subscription.unsubscribe()
  } catch {
    return false
  }
}

export interface PushSubscriptionPayload {
  endpoint: string
  p256dh: string
  authKey: string
}

export function serializePushSubscription(
  subscription: PushSubscription,
): PushSubscriptionPayload | null {
  const json = subscription.toJSON()
  const keys = json.keys
  if (!json.endpoint || !keys?.p256dh || !keys?.auth) return null

  return {
    endpoint: json.endpoint,
    p256dh: keys.p256dh,
    authKey: keys.auth,
  }
}
