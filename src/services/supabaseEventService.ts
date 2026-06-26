import { supabase } from '../lib/supabase'
import type { CalendarEvent } from '../types/calendar'

/** DB row 타입 */
interface EventRow {
  id: string
  user_id: string
  title: string
  starts_at: string
  ends_at: string | null
  category: string
  description: string | null
  all_day: boolean
}

function formatEventDate(iso: string, allDay: boolean): string {
  if (allDay) return iso.slice(0, 10)
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseEventDate(value: string, allDay: boolean): string {
  if (allDay) return `${value.slice(0, 10)}T00:00:00.000Z`
  return new Date(value).toISOString()
}

function rowToEvent(row: EventRow): CalendarEvent {
  const allDay = row.all_day
  return {
    id: row.id,
    title: row.title,
    start: formatEventDate(row.starts_at, allDay),
    end: row.ends_at ? formatEventDate(row.ends_at, allDay) : undefined,
    category: row.category as CalendarEvent['category'],
    description: row.description ?? undefined,
    allDay,
  }
}

function eventToInsertRow(
  event: Omit<CalendarEvent, 'id'> | CalendarEvent,
  userId: string,
): Omit<EventRow, 'id'> {
  const allDay = event.allDay ?? !event.start.includes('T')
  return {
    user_id: userId,
    title: event.title,
    starts_at: parseEventDate(event.start, allDay),
    ends_at: event.end ? parseEventDate(event.end, allDay) : null,
    category: event.category,
    description: event.description ?? null,
    all_day: allDay,
  }
}

/** Supabase에서 로그인한 사용자의 일정 목록 조회 */
export async function fetchEvents(userId: string): Promise<CalendarEvent[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('starts_at', { ascending: true })

  if (error) throw error
  return (data as EventRow[]).map(rowToEvent)
}

/** Supabase에 일정 생성 (DB가 id 발급) */
export async function createEvent(
  event: Omit<CalendarEvent, 'id'>,
  userId: string,
): Promise<CalendarEvent> {
  if (!supabase) {
    throw new Error('Supabase가 설정되지 않았습니다.')
  }

  const { data, error } = await supabase
    .from('events')
    .insert(eventToInsertRow(event, userId))
    .select('*')
    .single()

  if (error) throw error
  return rowToEvent(data as EventRow)
}

/** Supabase 일정 수정 */
export async function updateEvent(
  event: CalendarEvent,
  userId: string,
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('events')
    .update(eventToInsertRow(event, userId))
    .eq('id', event.id)
    .eq('user_id', userId)

  if (error) throw error
}

/** Supabase 일정 삭제 */
export async function deleteEvent(id: string, userId: string): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

/** Supabase 사용자 일정 전체 삭제 */
export async function deleteAllEvents(userId: string): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('user_id', userId)

  if (error) throw error
}

/** localStorage 일정을 Supabase로 일괄 이전 */
export async function importEvents(
  events: CalendarEvent[],
  userId: string,
): Promise<void> {
  if (!supabase || events.length === 0) return

  const rows = events.map((event) => eventToInsertRow(event, userId))
  const { error } = await supabase.from('events').insert(rows)
  if (error) throw error
}
