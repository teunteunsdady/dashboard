import type { BusAlarmDay, BusAlarmSettings } from '../types/busAlarm'

/** 알림 요일·시간대인지 (KST 로컬 시각) */
export function isBusAlarmScheduleActive(
  settings: BusAlarmSettings,
  now: Date = new Date(),
): boolean {
  if (!settings.enabled) return false

  const day = now.getDay() as BusAlarmDay
  if (!settings.days.includes(day)) return false

  const hour = now.getHours()
  const inMorning =
    hour >= settings.morningStart && hour < settings.morningEnd
  const inEvening =
    hour >= settings.eveningStart && hour < settings.eveningEnd

  return inMorning || inEvening
}

/** 출근(쩐) / 퇴근(집) 시간대에 맞는 정류장 */
export function resolveAlarmBusStopId(
  settings: BusAlarmSettings,
  now: Date = new Date(),
): string | null {
  if (!isBusAlarmScheduleActive(settings, now)) return null

  if (!settings.autoStop) return settings.stopId

  const hour = now.getHours()
  if (hour >= settings.morningStart && hour < settings.morningEnd) {
    return '1131-wolgye'
  }
  if (hour >= settings.eveningStart && hour < settings.eveningEnd) {
    return '1131-hagye'
  }

  return null
}

export function formatBusAlarmWindow(settings: BusAlarmSettings): string {
  return `${settings.morningStart}:00–${settings.morningEnd}:00, ${settings.eveningStart}:00–${settings.eveningEnd}:00`
}
