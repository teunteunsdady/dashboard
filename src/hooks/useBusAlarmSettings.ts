import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWebPush } from './useWebPush'
import type { BusAlarmSettings } from '../types/busAlarm'
import {
  fetchBusAlarmSettings,
  upsertBusAlarmSettings,
} from '../services/supabaseBusAlarmService'
import {
  loadBusAlarmSettings,
  saveBusAlarmSettings,
} from '../utils/busAlarmStorage'
import {
  getNotificationPermission,
  requestNotificationPermissionFromUserGesture,
} from '../utils/eventNotifications'
import {
  formatBusAlarmWindow,
  isBusAlarmScheduleActive,
  resolveAlarmBusStopId,
} from '../utils/busAlarmSchedule'

/** 버스 도착 알림 설정 UI용 */
export function useBusAlarmSettings() {
  const { user, isConfigured } = useAuth()
  const { supported: pushSupported, isSubscribed, enable: enablePush } =
    useWebPush()
  const [settings, setSettings] = useState<BusAlarmSettings>(() =>
    loadBusAlarmSettings(),
  )
  const [permission, setPermission] = useState(getNotificationPermission())
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setSettings(loadBusAlarmSettings())
    window.addEventListener('storage', sync)
    window.addEventListener('bus-alarm-settings', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('bus-alarm-settings', sync)
    }
  }, [])

  useEffect(() => {
    if (!user || !isConfigured) return

    void (async () => {
      try {
        const remote = await fetchBusAlarmSettings(user.id)
        if (!remote) return
        setSettings(remote)
        saveBusAlarmSettings(remote)
      } catch {
        // 로컬 설정 유지
      }
    })()
  }, [user, isConfigured])

  const persistLocal = useCallback((next: BusAlarmSettings) => {
    setSettings(next)
    saveBusAlarmSettings(next)
    window.dispatchEvent(new Event('bus-alarm-settings'))
  }, [])

  const persistRemote = useCallback(
    async (next: BusAlarmSettings) => {
      if (!user) return
      await upsertBusAlarmSettings(user.id, next)
    },
    [user],
  )

  const persist = useCallback(
    (next: BusAlarmSettings) => {
      persistLocal(next)
      void persistRemote(next).catch((err) => {
        setSyncError(
          err instanceof Error ? err.message : '서버에 설정을 저장하지 못했습니다.',
        )
      })
    },
    [persistLocal, persistRemote],
  )

  const updateSettings = useCallback(
    (patch: Partial<BusAlarmSettings>) => {
      setSyncError(null)
      persist({ ...loadBusAlarmSettings(), ...patch })
    },
    [persist],
  )

  const enableWithPermission = useCallback(async () => {
    setSyncError(null)
    const granted = await requestNotificationPermissionFromUserGesture()
    setPermission(getNotificationPermission())
    if (!granted) return false

    if (pushSupported && !isSubscribed) {
      const pushOk = await enablePush()
      if (!pushOk) {
        setSyncError(
          '백그라운드 알림을 위해 Web Push 구독이 필요합니다. 일정 알림과 동일한 Push를 켜 주세요.',
        )
        return false
      }
    }

    persist({ ...loadBusAlarmSettings(), enabled: true })
    return true
  }, [enablePush, isSubscribed, persist, pushSupported])

  const disable = useCallback(() => {
    setSyncError(null)
    persist({ ...loadBusAlarmSettings(), enabled: false })
  }, [persist])

  return {
    settings,
    permission,
    syncError,
    pushSubscribed: isSubscribed,
    scheduleActive: isBusAlarmScheduleActive(settings),
    activeStopId: resolveAlarmBusStopId(settings),
    scheduleLabel: formatBusAlarmWindow(settings),
    updateSettings,
    enableWithPermission,
    disable,
    clearSyncError: () => setSyncError(null),
  }
}
