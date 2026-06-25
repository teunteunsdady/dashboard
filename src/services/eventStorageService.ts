import type { CalendarEvent } from '../types/calendar'
import { STORAGE_PREFIX } from '../constants/brand'

const STORAGE_KEY = `${STORAGE_PREFIX}-events`

/** localStorage에서 저장된 일정 목록 로드 */
export function loadStoredEvents(): CalendarEvent[] | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem('devcyan-roh-events') ??
      localStorage.getItem('personal-dashboard-events')
    if (!raw) return null
    const parsed = JSON.parse(raw) as CalendarEvent[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** 일정 목록을 localStorage에 저장 */
export function saveStoredEvents(events: CalendarEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // 저장 공간 부족 등 — 조용히 무시
  }
}

/** localStorage 일정 데이터 초기화 (Mock 데이터로 복원 시 사용) */
export function clearStoredEvents(): void {
  localStorage.removeItem(STORAGE_KEY)
}
