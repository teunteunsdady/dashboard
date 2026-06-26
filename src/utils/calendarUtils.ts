import type { EventInput } from '@fullcalendar/core'
import type { CalendarEvent, EventCategoryMeta } from '../types/calendar'

/** 활성 칩 위 텍스트·동그라미 색 (모든 카테고리 흰색 통일) */
export function getCategoryTextColor(_color: string): string {
  return '#FFFFFF'
}

/** 활성 칩 앞 동그라미 색 — 배경과 대비되도록 텍스트 색과 통일 */
export function getCategoryDotColor(color: string, active: boolean): string {
  if (!active) return color
  return getCategoryTextColor(color)
}

/** 종일 일정 여부 판별 */
export function isAllDayEvent(event: Pick<CalendarEvent, 'start' | 'allDay'>): boolean {
  if (event.allDay !== undefined) return event.allDay
  return !event.start.includes('T')
}

/** CalendarEvent → FullCalendar EventInput 변환 */
export function toFullCalendarEvent(
  event: CalendarEvent,
  categories: EventCategoryMeta[],
): EventInput {
  const color =
    categories.find((c) => c.id === event.category)?.color ?? '#0E62F7'
  const allDay = isAllDayEvent(event)

  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay,
    backgroundColor: color,
    borderColor: color,
    textColor: getCategoryTextColor(color),
    extendedProps: {
      category: event.category,
      description: event.description ?? '',
      allDay,
    },
  }
}

/** FullCalendar 드롭/리사이즈 결과 → CalendarEvent 날짜 필드 갱신 */
export function applyEventDateChange(
  event: CalendarEvent,
  startStr: string,
  endStr?: string | null,
): CalendarEvent {
  const allDay = !startStr.includes('T')

  if (allDay) {
    return {
      ...event,
      start: startStr.slice(0, 10),
      end: endStr ? endStr.slice(0, 10) : undefined,
      allDay: true,
    }
  }

  return {
    ...event,
    start: normalizeDateTime(startStr),
    end: endStr ? normalizeDateTime(endStr) : undefined,
    allDay: false,
  }
}

/** ISO 문자열을 YYYY-MM-DDTHH:mm 형식으로 정규화 */
export function normalizeDateTime(value: string): string {
  if (!value.includes('T')) return value
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** datetime-local input용 값 변환 */
export function toDatetimeLocal(value: string): string {
  if (!value.includes('T')) return `${value}T09:00`
  return normalizeDateTime(value)
}

/** 폼 입력값 → CalendarEvent start/end 문자열 조합 */
export function buildEventDateTime(
  date: string,
  time: string,
  allDay: boolean,
): string {
  return allDay ? date : `${date}T${time}`
}

/** 고유 일정 ID 생성 */
export function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
