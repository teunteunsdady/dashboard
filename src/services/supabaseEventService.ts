import { supabase } from '../lib/supabase'
import type { CalendarEvent } from '../types/calendar'

/** DB row 타입 */
interface EventRow {
  id: string
  user_id: string
  title: string
  start_date: string
  end_date: string | null
  category: string
  description: string | null
  all_day: boolean
}

function rowToEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    start: row.start_date,
    end: row.end_date ?? undefined,
    category: row.category as CalendarEvent['category'],
    description: row.description ?? undefined,
    allDay: row.all_day,
  }
}

function eventToRow(event: CalendarEvent, userId: string): EventRow {
  return {
    id: event.id,
    user_id: userId,
    title: event.title,
    start_date: event.start,
    end_date: event.end ?? null,
    category: event.category,
    description: event.description ?? null,
    all_day: event.allDay ?? !event.start.includes('T'),
  }
}

/** Supabase에서 로그인한 사용자의 일정 목록 조회 */
export async function fetchEvents(userId: string): Promise<CalendarEvent[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: true })

  if (error) throw error
  return (data as EventRow[]).map(rowToEvent)
}

/** Supabase에 일정 생성 */
export async function createEvent(
  event: CalendarEvent,
  userId: string,
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase.from('events').insert(eventToRow(event, userId))
  if (error) throw error
}

/** Supabase 일정 수정 */
export async function updateEvent(
  event: CalendarEvent,
  userId: string,
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('events')
    .update(eventToRow(event, userId))
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

  const rows = events.map((e) => eventToRow(e, userId))
  const { error } = await supabase.from('events').upsert(rows)
  if (error) throw error
}
