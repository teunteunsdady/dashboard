import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  countPushSubscriptions,
  deletePushSubscription,
  upsertPushSubscription,
} from '../services/supabasePushService'
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '../utils/eventNotifications'
import {
  getPushSubscription,
  isWebPushConfigured,
  isWebPushSupported,
  serializePushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '../utils/webPush'

export type WebPushStatus = 'idle' | 'loading' | 'subscribed' | 'unsubscribed' | 'unsupported'

/** Web Push 구독 상태 및 등록/해제 */
export function useWebPush() {
  const { user, isConfigured } = useAuth()
  const [status, setStatus] = useState<WebPushStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const supported = isWebPushSupported() && isWebPushConfigured() && isConfigured

  const refresh = useCallback(async () => {
    if (!supported || !user) {
      setStatus(isWebPushSupported() && isWebPushConfigured() ? 'unsubscribed' : 'unsupported')
      return
    }

    const subscription = await getPushSubscription()
    if (subscription) {
      setStatus('subscribed')
      return
    }

    const savedCount = await countPushSubscriptions(user.id)
    setStatus(savedCount > 0 ? 'unsubscribed' : 'unsubscribed')
  }, [supported, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const enable = useCallback(async (): Promise<boolean> => {
    if (!supported || !user) return false

    setError(null)
    setStatus('loading')

    try {
      if (getNotificationPermission() !== 'granted') {
        const granted = await requestNotificationPermission()
        if (!granted) {
          setStatus('unsubscribed')
          setError('브라우저 알림 권한이 필요합니다.')
          return false
        }
      }

      const subscription = await subscribeToPush()
      if (!subscription) {
        setStatus('unsubscribed')
        setError('Push 구독에 실패했습니다.')
        return false
      }

      const payload = serializePushSubscription(subscription)
      if (!payload) {
        setStatus('unsubscribed')
        setError('Push 구독 정보를 읽지 못했습니다.')
        return false
      }

      await upsertPushSubscription(user.id, payload)
      setStatus('subscribed')
      return true
    } catch (err) {
      setStatus('unsubscribed')
      setError(err instanceof Error ? err.message : 'Push 구독에 실패했습니다.')
      return false
    }
  }, [supported, user])

  const disable = useCallback(async (): Promise<void> => {
    if (!user) return

    setError(null)
    setStatus('loading')

    try {
      const subscription = await getPushSubscription()
      if (subscription) {
        await deletePushSubscription(user.id, subscription.endpoint)
        await unsubscribeFromPush()
      }
      setStatus('unsubscribed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push 해제에 실패했습니다.')
      await refresh()
    }
  }, [user, refresh])

  return {
    supported,
    status,
    error,
    isSubscribed: status === 'subscribed',
    enable,
    disable,
    clearError: () => setError(null),
  }
}
