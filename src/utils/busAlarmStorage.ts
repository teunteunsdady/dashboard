import { STORAGE_PREFIX } from '../constants/brand'
import {
  DEFAULT_BUS_ALARM_SETTINGS,
  type BusAlarmDay,
  type BusAlarmSettings,
} from '../types/busAlarm'

const STORAGE_KEY = `${STORAGE_PREFIX}-bus-alarm`

function isBusAlarmDay(value: number): value is BusAlarmDay {
  return value >= 0 && value <= 6
}

export function loadBusAlarmSettings(): BusAlarmSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_BUS_ALARM_SETTINGS }

    const parsed = JSON.parse(raw) as Partial<BusAlarmSettings>
    const days = Array.isArray(parsed.days)
      ? parsed.days.filter(isBusAlarmDay)
      : DEFAULT_BUS_ALARM_SETTINGS.days

    return {
      ...DEFAULT_BUS_ALARM_SETTINGS,
      ...parsed,
      days: days.length > 0 ? days : DEFAULT_BUS_ALARM_SETTINGS.days,
      thresholdMinutes:
        typeof parsed.thresholdMinutes === 'number' &&
        parsed.thresholdMinutes >= 1 &&
        parsed.thresholdMinutes <= 30
          ? parsed.thresholdMinutes
          : DEFAULT_BUS_ALARM_SETTINGS.thresholdMinutes,
    }
  } catch {
    return { ...DEFAULT_BUS_ALARM_SETTINGS }
  }
}

export function saveBusAlarmSettings(settings: BusAlarmSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}
