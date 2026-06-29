import type { CalendarEvent } from '../types/calendar'
import {
  isAllDayEvent,
  isEventEnded,
  localToday,
  normalizeDateTime,
  toLocalDateTimeMs,
} from './calendarUtils'

/** 특정 날짜(YYYY-MM-DD)에 걸치는 일정인지 */
export function eventOccursOnDate(
  event: Pick<CalendarEvent, 'start' | 'end' | 'allDay'>,
  date: string,
): boolean {
  if (isAllDayEvent(event)) {
    const startDate = event.start.slice(0, 10)
    const endDate = (event.end ?? event.start).slice(0, 10)
    return date >= startDate && date <= endDate
  }

  const dayStart = toLocalDateTimeMs(`${date}T00:00`)
  const dayEnd = toLocalDateTimeMs(`${date}T23:59`)
  const eventStart = toLocalDateTimeMs(normalizeDateTime(event.start))
  const eventEnd = event.end
    ? toLocalDateTimeMs(normalizeDateTime(event.end))
    : eventStart

  return eventStart <= dayEnd && eventEnd >= dayStart
}

/** 오늘 일정 — 종일 먼저, 이후 시작 시각 순 */
export function getTodayEvents(
  events: CalendarEvent[],
  date: string = localToday(),
): CalendarEvent[] {
  return events
    .filter((event) => eventOccursOnDate(event, date))
    .sort(compareTodayEvents)
}

function compareTodayEvents(a: CalendarEvent, b: CalendarEvent): number {
  const aAllDay = isAllDayEvent(a)
  const bAllDay = isAllDayEvent(b)

  if (aAllDay !== bAllDay) {
    return aAllDay ? -1 : 1
  }

  if (aAllDay) {
    return a.title.localeCompare(b.title, 'ko')
  }

  const aStart = toLocalDateTimeMs(normalizeDateTime(a.start))
  const bStart = toLocalDateTimeMs(normalizeDateTime(b.start))
  if (aStart !== bStart) return aStart - bStart

  return a.title.localeCompare(b.title, 'ko')
}

/** 패널 헤더용 — 예: 6월 29일 일요일 */
export function formatTodayHeading(date: string = localToday()): string {
  const [year, month, day] = date.split('-').map(Number)
  const dt = new Date(year, month - 1, day)
  return dt.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

/** 패널 시간 라벨 — 종일 / 14:00 / 14:00–15:30 */
export function formatEventTimeLabel(event: CalendarEvent): string {
  if (isAllDayEvent(event)) return '종일'

  const start = normalizeDateTime(event.start)
  const startTime = (start.split('T')[1] ?? '00:00').slice(0, 5)

  if (!event.end) return startTime

  const end = normalizeDateTime(event.end)
  const endTime = (end.split('T')[1] ?? '').slice(0, 5)

  if (end.slice(0, 10) === start.slice(0, 10) && endTime) {
    return `${startTime}–${endTime}`
  }

  return startTime
}

/** 오늘 시간 일정이 현재 진행 중인지 */
export function isEventInProgress(
  event: Pick<CalendarEvent, 'start' | 'end' | 'allDay'>,
  nowMs: number = Date.now(),
): boolean {
  if (isAllDayEvent(event)) return false
  if (isEventEnded(event, nowMs)) return false

  const startMs = toLocalDateTimeMs(normalizeDateTime(event.start))
  return nowMs >= startMs
}
