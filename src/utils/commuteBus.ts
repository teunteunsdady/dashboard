import {
  busStopOptions,
  DEFAULT_BUS_STOP_ID,
  getBusStopOption,
} from '../data/busStops'

const BUS_STORAGE_KEY = 'bus-selected-stop'

function isValidStopId(id: string): boolean {
  return busStopOptions.some((stop) => stop.id === id)
}

/** 출퇴근 시간대 기본 정류장 (평일만) */
export function suggestCommuteBusStopId(now: Date = new Date()): string | null {
  const hour = now.getHours()
  const day = now.getDay()
  const isWeekday = day >= 1 && day <= 5

  if (!isWeekday) return null
  if (hour >= 7 && hour < 10) return '1131-wolgye'
  if (hour >= 17 && hour < 21) return '1131-hagye'

  return null
}

/** Overview·Bus 공통 — 저장값 우선, 출퇴근 시간이면 추천 정류장 */
export function resolveOverviewBusStopId(now: Date = new Date()): string {
  const commute = suggestCommuteBusStopId(now)
  if (commute) return commute

  try {
    const stored = localStorage.getItem(BUS_STORAGE_KEY)
    if (stored && isValidStopId(stored)) return stored
  } catch {
    // ignore
  }

  return DEFAULT_BUS_STOP_ID
}

export function getOverviewBusStopLabel(stopId: string): string {
  const option = getBusStopOption(stopId)
  if (!option) return '정류장'
  return `${option.routeNumber} · ${option.travelDirection}`
}
