import { useEffect, useRef } from 'react'
import type { CalendarEvent } from '../types/calendar'
import { useWebPush } from './useWebPush'
import {
  fireDueNotifications,
  getEventNotificationTime,
  getNotificationPermission,
  markEventNotified,
  showEventNotification,
  wasEventNotified,
} from '../utils/eventNotifications'

const CHECK_INTERVAL_MS = 30_000
const MAX_SCHEDULE_AHEAD_MS = 30 * 24 * 60 * 60 * 1000

/** 일정 목록 기준 브라우저 알림 스케줄 (탭이 열려 있을 때, Web Push 미사용 시) */
export function useEventNotifications(events: CalendarEvent[]) {
  const { isSubscribed } = useWebPush()
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const clearTimers = () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
    }

    const schedule = () => {
      clearTimers()
      if (isSubscribed) return
      if (getNotificationPermission() !== 'granted') return

      const now = Date.now()
      const horizon = now + MAX_SCHEDULE_AHEAD_MS

      for (const event of events) {
        const at = getEventNotificationTime(event)
        if (!at) continue

        const atMs = at.getTime()
        if (atMs <= now || atMs > horizon) continue
        if (wasEventNotified(event.id, atMs)) continue

        const key = `${event.id}:${atMs}`
        const delay = atMs - now
        const timer = setTimeout(() => {
          if (wasEventNotified(event.id, atMs)) return
          showEventNotification(event, at)
          markEventNotified(event.id, atMs)
          timersRef.current.delete(key)
        }, delay)

        timersRef.current.set(key, timer)
      }
    }

    if (!isSubscribed) {
      fireDueNotifications(events)
    }
    schedule()

    const interval = window.setInterval(() => {
      if (!isSubscribed) {
        fireDueNotifications(events)
      }
      schedule()
    }, CHECK_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
      clearTimers()
    }
  }, [events, isSubscribed])
}
