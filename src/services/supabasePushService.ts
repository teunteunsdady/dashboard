import { supabase } from '../lib/supabase'
import type { PushSubscriptionPayload } from '../utils/webPush'

/** Push 구독을 Supabase에 저장 (동일 endpoint는 갱신) */
export async function upsertPushSubscription(
  userId: string,
  payload: PushSubscriptionPayload,
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase가 설정되지 않았습니다.')
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: payload.endpoint,
      p256dh: payload.p256dh,
      auth_key: payload.authKey,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) {
    if (error.message.includes('push_subscriptions')) {
      throw new Error(
        'Push 구독 테이블이 DB에 없습니다. Supabase SQL Editor에서 supabase/migrations/20260701_web_push.sql 을 실행해 주세요.',
      )
    }
    throw new Error(error.message || 'Push 구독을 저장하지 못했습니다.')
  }
}

/** Push 구독 해제 */
export async function deletePushSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)

  if (error) throw error
}

/** 사용자의 저장된 구독 수 (0이면 서버 발송 불가) */
export async function countPushSubscriptions(userId: string): Promise<number> {
  if (!supabase) return 0

  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) return 0
  return count ?? 0
}
