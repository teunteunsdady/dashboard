import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import { getEvents, getEventCategories } from '../services/mockDataService'
import {
  loadStoredEvents,
  saveStoredEvents,
} from '../services/eventStorageService'
import * as supabaseEvents from '../services/supabaseEventService'
import { applyEventDateChange, generateEventId } from '../utils/calendarUtils'
import type { CalendarEvent, EventCategory, EventCategoryMeta } from '../types/calendar'

function categoriesForUser(
  categories: EventCategoryMeta[],
  personalOnly: boolean,
): EventCategoryMeta[] {
  if (!personalOnly) return categories
  return categories.filter((category) => category.id === 'personal')
}

/** 일정 데이터 로드·필터링·CRUD (Supabase 또는 localStorage) */
export function useEvents() {
  const { user, dataOwnerId, canWrite, isReadOnlyPersonal } = useAuth()
  const useCloud = isSupabaseConfigured() && Boolean(user)
  const ownerId = dataOwnerId ?? user?.id ?? null

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [categories, setCategories] = useState<
    Awaited<ReturnType<typeof getEventCategories>>
  >([])
  const [activeFilters, setActiveFilters] = useState<Set<EventCategory>>(
    new Set(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 데이터 소스에 따라 일정 로드
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const categoriesRes = categoriesForUser(
          await getEventCategories(),
          isReadOnlyPersonal,
        )
        if (cancelled) return

        setCategories(categoriesRes)
        setActiveFilters(new Set(categoriesRes.map((c) => c.id)))

        if (useCloud && user && ownerId) {
          const cloudEvents = await supabaseEvents.fetchEvents(ownerId)
          if (!cancelled) setEvents(cloudEvents)
        } else if (!isSupabaseConfigured()) {
          const stored = loadStoredEvents()
          const mockEvents = await getEvents()
          if (!cancelled) setEvents(stored ?? mockEvents)
        } else {
          if (!cancelled) setEvents([])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '일정을 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [useCloud, user, ownerId, isReadOnlyPersonal])
  useEffect(() => {
    if (!loading && !isSupabaseConfigured()) {
      saveStoredEvents(events)
    }
  }, [events, loading])

  const filteredEvents = useMemo(
    () => events.filter((e) => activeFilters.has(e.category)),
    [events, activeFilters],
  )

  const toggleFilter = useCallback((categoryId: EventCategory) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }, [])

  const addEvent = useCallback(
    async (event: Omit<CalendarEvent, 'id'>) => {
      if (useCloud && user && ownerId) {
        if (!canWrite) throw new Error('읽기 전용 계정은 일정을 추가할 수 없습니다.')
        const optimisticId = generateEventId()
        const optimisticEvent: CalendarEvent = { ...event, id: optimisticId }
        setEvents((prev) => [...prev, optimisticEvent])

        try {
          const saved = await supabaseEvents.createEvent(event, ownerId)
          setEvents((prev) =>
            prev.map((e) => (e.id === optimisticId ? saved : e)),
          )
          return saved
        } catch (err) {
          setEvents((prev) => prev.filter((e) => e.id !== optimisticId))
          const message =
            err instanceof Error ? err.message : '일정 추가 실패'
          setError(message)
          throw err instanceof Error ? err : new Error(message)
        }
      }

      const newEvent: CalendarEvent = { ...event, id: generateEventId() }
      setEvents((prev) => [...prev, newEvent])
      return newEvent
    },
    [useCloud, user, ownerId, canWrite],
  )

  const updateEvent = useCallback(
    async (updated: CalendarEvent) => {
      const prev = events
      setEvents((list) => list.map((e) => (e.id === updated.id ? updated : e)))

      if (useCloud && user && ownerId) {
        if (!canWrite) throw new Error('읽기 전용 계정은 일정을 수정할 수 없습니다.')
        try {
          await supabaseEvents.updateEvent(updated, ownerId)
        } catch (err) {
          setEvents(prev)
          const message =
            err instanceof Error ? err.message : '일정 수정 실패'
          setError(message)
          throw err instanceof Error ? err : new Error(message)
        }
      }
    },
    [useCloud, user, ownerId, canWrite, events],
  )

  const deleteEvent = useCallback(
    async (id: string) => {
      const prev = events
      setEvents((list) => list.filter((e) => e.id !== id))

      if (useCloud && user && ownerId) {
        if (!canWrite) return
        try {
          await supabaseEvents.deleteEvent(id, ownerId)
        } catch (err) {
          setEvents(prev)
          setError(err instanceof Error ? err.message : '일정 삭제 실패')
        }
      }
    },
    [useCloud, user, ownerId, canWrite, events],
  )

  const moveEvent = useCallback(
    async (id: string, startStr: string, endStr?: string | null) => {
      if (!canWrite) return
      const target = events.find((e) => e.id === id)
      if (!target) return

      const updated = applyEventDateChange(target, startStr, endStr)
      await updateEvent(updated)
    },
    [events, updateEvent, canWrite],
  )

  const resetEvents = useCallback(async () => {
    if (useCloud && user && ownerId) {
      if (!canWrite) return
      await supabaseEvents.deleteAllEvents(ownerId)
      setEvents([])
    } else {
      const mockEvents = await getEvents()
      setEvents(mockEvents)
    }
  }, [useCloud, user, ownerId, canWrite])

  const importFromLocal = useCallback(async () => {
    const stored = loadStoredEvents()
    if (!stored?.length || !useCloud || !user || !ownerId || !canWrite) return 0

    await supabaseEvents.importEvents(stored, ownerId)
    const merged = await supabaseEvents.fetchEvents(ownerId)
    setEvents(merged)
    return stored.length
  }, [useCloud, user, ownerId, canWrite])

  return {
    events,
    filteredEvents,
    categories,
    activeFilters,
    loading,
    error,
    useCloud,
    toggleFilter,
    addEvent,
    updateEvent,
    deleteEvent,
    moveEvent,
    resetEvents,
    importFromLocal,
    clearError: () => setError(null),
    hideCategoryTags: isReadOnlyPersonal,
  }
}
