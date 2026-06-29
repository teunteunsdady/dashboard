import { useEffect } from 'react'
import {
  BUS_ALARM_DAY_LABELS,
  type BusAlarmDay,
} from '../../types/busAlarm'
import { getBusStopOption } from '../../data/busStops'
import { useBusAlarmSettings } from '../../hooks/useBusAlarmSettings'
import { Toggle } from '../ui/Toggle'

const THRESHOLD_OPTIONS = [3, 5, 7, 10] as const

const ALL_DAYS: BusAlarmDay[] = [0, 1, 2, 3, 4, 5, 6]

interface BusAlarmPanelProps {
  selectedStopId: string
}

/** 버스 도착 알림 설정 (요일·임박 분) */
export function BusAlarmPanel({ selectedStopId }: BusAlarmPanelProps) {
  const {
    settings,
    permission,
    syncError,
    pushSubscribed,
    scheduleActive,
    activeStopId,
    scheduleLabel,
    updateSettings,
    enableWithPermission,
    disable,
    clearSyncError,
  } = useBusAlarmSettings()

  useEffect(() => {
    if (!settings.autoStop && settings.stopId !== selectedStopId) {
      updateSettings({ stopId: selectedStopId })
    }
  }, [selectedStopId, settings.autoStop, settings.stopId, updateSettings])

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      void enableWithPermission()
    } else {
      disable()
    }
  }

  const handleAutoStopOff = () => {
    updateSettings({ autoStop: false, stopId: selectedStopId })
  }

  const handleAutoStopOn = () => {
    updateSettings({ autoStop: true })
  }

  const toggleDay = (day: BusAlarmDay) => {
    const has = settings.days.includes(day)
    const days = has
      ? settings.days.filter((d) => d !== day)
      : [...settings.days, day].sort((a, b) => a - b)
    updateSettings({ days: days.length > 0 ? days : settings.days })
  }

  const activeStop = activeStopId ? getBusStopOption(activeStopId) : null

  return (
    <div className="rounded-2xl border border-border/80 bg-surface-card p-4">
      <Toggle
        checked={settings.enabled}
        onChange={handleToggle}
        label="도착 알림"
        description={
          settings.enabled
            ? `수·일 등 선택한 요일, ${scheduleLabel}에 탭이 꺼져 있어도 알려드려요.`
            : '버스가 곧 도착하면 Web Push로 알림을 받습니다.'
        }
      />

      {settings.enabled && (
        <div className="mt-4 space-y-4 border-t border-border/70 pt-4">
          {permission === 'denied' && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              알림이 차단되어 있습니다. 브라우저·사이트 설정에서 허용해 주세요.
            </p>
          )}

          {syncError && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {syncError}
              <button
                type="button"
                onClick={clearSyncError}
                className="ml-2 underline"
              >
                닫기
              </button>
            </p>
          )}

          {settings.enabled && !pushSubscribed && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              백그라운드 알림을 위해 대시보드에서 Web Push를 켜 주세요.
            </p>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-text-secondary">
              알림 요일
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_DAYS.map((day) => {
                const on = settings.days.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={[
                      'min-w-[2.25rem] rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors',
                      on
                        ? 'border-main bg-main/10 text-main'
                        : 'border-border bg-surface text-text-secondary hover:border-main/25',
                    ].join(' ')}
                  >
                    {BUS_ALARM_DAY_LABELS[day]}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-text-secondary">
              몇 분 전에 알릴까요?
            </p>
            <div className="flex flex-wrap gap-1.5">
              {THRESHOLD_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => updateSettings({ thresholdMinutes: minutes })}
                  className={[
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    settings.thresholdMinutes === minutes
                      ? 'border-main bg-main/10 text-main'
                      : 'border-border bg-surface text-text-secondary hover:border-main/25',
                  ].join(' ')}
                >
                  {minutes}분
                </button>
              ))}
            </div>
          </div>

          <Toggle
            checked={settings.autoStop}
            onChange={(autoStop) => {
              if (autoStop) handleAutoStopOn()
              else handleAutoStopOff()
            }}
            label="출근·퇴근 정류장 자동"
            description={
              settings.autoStop
                ? '아침 쩐(월계삼호) / 저녁 집(노원구민의전당)을 시간대에 맞춰 봅니다.'
                : `선택한 정류장(${getBusStopOption(selectedStopId)?.name ?? selectedStopId})만 봅니다.`
            }
          />

          {!settings.autoStop && (
            <p className="text-xs text-text-secondary">
              위 정류장 선택기에서 고른 정류장 기준으로 알림합니다.
            </p>
          )}

          {scheduleActive && activeStop && (
            <p className="rounded-xl bg-main/5 px-3 py-2 text-xs text-main">
              지금 감시 중: {activeStop.routeNumber}번 · {activeStop.travelDirection}{' '}
              ({activeStop.name})
            </p>
          )}

          {settings.enabled && !scheduleActive && (
            <p className="text-xs text-text-secondary">
              오늘은 알림 요일·시간대가 아닙니다. ({scheduleLabel})
            </p>
          )}

          <p className="text-[11px] leading-relaxed text-text-secondary">
            Web Push로 백그라운드 알림을 보냅니다(약 5분마다 확인). Push가 꺼져
            있으면 탭이 열려 있을 때만 브라우저 알림으로 대체됩니다. iOS는 홈
            화면에 추가한 뒤 실행하면 더 안정적입니다.
          </p>
        </div>
      )}
    </div>
  )
}
