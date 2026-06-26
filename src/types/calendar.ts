/** 캘린더 일정 관련 타입 정의 */

export type EventCategory =
  | 'personal'
  | 'finance'
  | 'subscription'
  | 'career'
  | 'family'
  | 'church'

export interface CalendarEvent {
  id: string
  title: string
  /** 종일: YYYY-MM-DD / 시간 지정: YYYY-MM-DDTHH:mm */
  start: string
  end?: string
  category: EventCategory
  description?: string
  allDay?: boolean
}

export interface EventCategoryMeta {
  id: EventCategory
  label: string
  color: string
}
