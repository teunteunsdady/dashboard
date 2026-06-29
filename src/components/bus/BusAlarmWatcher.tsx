import { useEffect, useRef } from 'react'
import { BUS_CLIENT_POLL_MS } from '../../constants/bus'
import { useAuth } from '../../contexts/AuthContext'
import { useWebPush } from '../../hooks/useWebPush'
import { fetchBusArrival } from '../../services/busService'
import { isArrivalWithinThreshold } from '../../utils/busArrivalParse'
import {
  isBusAlarmScheduleActive,
  resolveAlarmBusStopId,
} from '../../utils/busAlarmSchedule'
import { loadBusAlarmSettings } from '../../utils/busAlarmStorage'
import { showBusArrivalNotification } from '../../utils/busAlarmNotify'
import { getNotificationPermission } from '../../utils/eventNotifications'

/** 앱 전역 — Push 미구독 시 탭 열림 폴백 알림 */
export function BusAlarmWatcher() {
  const { user, isConfigured } = useAuth()
  const { isSubscribed } = useWebPush()
  const armedRef = useRef(true)
  const lastStopIdRef = useRef<string | null>(null)

  useEffect(() => {
    const tick = async () => {
      const settings = loadBusAlarmSettings()
      if (!settings.enabled) return
      if (getNotificationPermission() !== 'granted') return
      if (isConfigured && user && isSubscribed) return
      if (document.visibilityState !== 'visible') return
      if (!isBusAlarmScheduleActive(settings)) {
        armedRef.current = true
        return
      }

      const stopId = settings.autoStop
        ? resolveAlarmBusStopId(settings)
        : settings.stopId
      if (!stopId) return

      if (lastStopIdRef.current !== stopId) {
        lastStopIdRef.current = stopId
        armedRef.current = true
      }

      try {
        const data = await fetchBusArrival(stopId)
        const within = isArrivalWithinThreshold(
          data.stop.arrival1,
          settings.thresholdMinutes,
        )

        if (!within) {
          armedRef.current = true
          return
        }

        if (!armedRef.current) return

        showBusArrivalNotification(data.stop, data.stop.arrival1)
        armedRef.current = false
      } catch {
        // 다음 주기에 재시도
      }
    }

    void tick()
    const timer = window.setInterval(() => void tick(), BUS_CLIENT_POLL_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    const onSettings = () => {
      armedRef.current = true
      lastStopIdRef.current = null
      void tick()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('bus-alarm-settings', onSettings)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('bus-alarm-settings', onSettings)
    }
  }, [isConfigured, isSubscribed, user])

  return null
}
