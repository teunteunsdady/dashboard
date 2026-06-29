import { useState } from 'react'
import type { CalendarEvent } from '../../types/calendar'
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from '../../utils/eventNotifications'

interface EventNotificationBannerProps {
  events: CalendarEvent[]
}

/** 알림 일정이 있는데 브라우저 권한이 없을 때 안내 */
export function EventNotificationBanner({ events }: EventNotificationBannerProps) {
  const [permission, setPermission] = useState(getNotificationPermission())
  const needsNotify = events.some((event) => event.notify)

  if (!needsNotify || !isNotificationSupported() || permission === 'granted') {
    return null
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
            setPermission(getNotificationPermission())
          }}
          className="shrink-0 rounded-lg bg-main px-3 py-1.5 text-sm font-medium text-white hover:bg-main-dark"
        >
          알림 허용
        </button>
      )}
    </div>
  )
}
