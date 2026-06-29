import type { CalendarEvent } from '../../types/calendar'
import { useWebPush } from '../../hooks/useWebPush'
import { isSupabaseConfigured } from '../../lib/supabase'
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from '../../utils/eventNotifications'
import { isWebPushConfigured, isWebPushSupported } from '../../utils/webPush'

interface EventNotificationBannerProps {
  events: CalendarEvent[]
}

/** 알림 일정이 있을 때 브라우저·Web Push 권한 안내 */
export function EventNotificationBanner({ events }: EventNotificationBannerProps) {
  const needsNotify = events.some((event) => event.notify)
  const permission = getNotificationPermission()

  const canUseWebPush =
    isSupabaseConfigured() && isWebPushSupported() && isWebPushConfigured()

  const { supported, status, error, isSubscribed, enable, disable, clearError } =
    useWebPush()

  if (!needsNotify || !isNotificationSupported()) {
    return null
  }

  if (canUseWebPush && supported) {
    if (isSubscribed) {
      return (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 sm:flex-row sm:items-center sm:justify-between">
          <p>백그라운드 알림이 켜져 있습니다. 탭을 닫아도 일정 알림을 받을 수 있습니다.</p>
          <button
            type="button"
            onClick={() => void disable()}
            disabled={status === 'loading'}
            className="shrink-0 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 disabled:opacity-60"
          >
            {status === 'loading' ? '처리 중…' : '백그라운드 알림 끄기'}
          </button>
        </div>
      )
    }

    const denied = permission === 'denied'

    return (
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-main/20 bg-main/5 px-4 py-3 text-sm text-text-secondary">
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="font-medium">
              닫기
            </button>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {denied
              ? '브라우저 알림이 차단되어 있습니다. 주소창 옆 자물쇠에서 알림을 허용한 뒤 다시 시도해 주세요.'
              : '알림이 켜진 일정이 있습니다. 백그라운드 알림을 켜면 탭을 닫아도 OS 알림을 받을 수 있습니다.'}
          </p>
          {!denied && (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={status === 'loading'}
              className="shrink-0 rounded-lg bg-main px-3 py-1.5 text-sm font-medium text-white hover:bg-main-dark disabled:opacity-60"
            >
              {status === 'loading' ? '등록 중…' : '백그라운드 알림 켜기'}
            </button>
          )}
        </div>
        <p className="text-xs text-text-secondary/70">
          모바일에서는 홈 화면에 추가하면 더 안정적으로 알림을 받을 수 있습니다.
        </p>
      </div>
    )
  }

  if (permission === 'granted') {
    return (
      <div className="mb-4 rounded-xl border border-sub/30 bg-sub/10 px-4 py-3 text-sm text-text-secondary">
        탭이 열려 있을 때만 알림이 옵니다. 탭을 닫아도 받으려면{' '}
        <code className="text-xs">VITE_VAPID_PUBLIC_KEY</code> 설정 후 Supabase Push 마이그레이션을
        실행해 주세요.
      </div>
    )
  }

  const denied = permission === 'denied'

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-main/20 bg-main/5 px-4 py-3 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
      <p>
        {denied
          ? '브라우저 알림이 차단되어 있습니다. 주소창 옆 자물쇠에서 알림을 허용해 주세요.'
          : '알림이 켜진 일정이 있습니다. 브라우저 알림 권한을 허용해 주세요.'}
      </p>
      {!denied && (
        <button
          type="button"
          onClick={async () => {
            await requestNotificationPermission()
          }}
          className="shrink-0 rounded-lg bg-main px-3 py-1.5 text-sm font-medium text-white hover:bg-main-dark"
        >
          알림 허용
        </button>
      )}
    </div>
  )
}
