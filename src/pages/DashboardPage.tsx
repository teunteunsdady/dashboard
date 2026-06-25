import { useState } from 'react'
import { CalendarView } from '../components/calendar/CalendarView'
import { EventModal, type EventModalMode } from '../components/calendar/EventModal'
import { SectionTitle } from '../components/ui/SectionTitle'
import { useEvents } from '../hooks/useEvents'
import { clearStoredEvents, loadStoredEvents } from '../services/eventStorageService'
import { isSupabaseConfigured } from '../lib/supabase'
import type { CalendarEvent } from '../types/calendar'

interface ModalState {
  isOpen: boolean
  mode: EventModalMode
  event: CalendarEvent | null
}

const closedModal: ModalState = { isOpen: false, mode: 'create', event: null }

/** Dashboard 페이지 — FullCalendar 일정 관리 */
export function DashboardPage() {
  const {
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
    clearError,
  } = useEvents()

  const [modal, setModal] = useState<ModalState>(closedModal)

  const openCreate = (start?: string, allDay = true) => {
    setModal({
      isOpen: true,
      mode: 'create',
      event: start
        ? { id: '', title: '', start, category: 'personal', allDay }
        : null,
    })
  }

  const openEdit = (event: CalendarEvent) => {
    setModal({ isOpen: true, mode: 'edit', event })
  }

  const closeModal = () => setModal(closedModal)

  const handleSave = (event: CalendarEvent) => {
    if (modal.mode === 'create') {
      addEvent({
        title: event.title,
        start: event.start,
        end: event.end,
        category: event.category,
        description: event.description,
        allDay: event.allDay,
      })
    } else {
      updateEvent(event)
    }
  }

  const handleReset = async () => {
    const label = useCloud
      ? '클라우드의 모든 일정을 삭제할까요?'
      : '저장된 일정을 모두 삭제하고 초기 데이터로 복원할까요?'

    if (!window.confirm(label)) return

    await resetEvents()
    if (!useCloud) clearStoredEvents()
  }

  const handleImport = async () => {
    const stored = loadStoredEvents()
    if (!stored?.length) {
      alert('가져올 localStorage 일정이 없습니다.')
      return
    }
    const count = await importFromLocal()
    if (count > 0) {
      clearStoredEvents()
      alert(`${count}개 일정을 Supabase로 가져왔습니다.`)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-main/20 border-t-main" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle
          title="Dashboard"
          subtitle={
            useCloud
              ? 'Supabase에 저장됩니다 — 어디서든 같은 일정을 볼 수 있어요'
              : '자산·구독·프로젝트 일정을 한곳에서 관리'
          }
        />
        <div className="flex shrink-0 flex-wrap gap-3 text-xs">
          {useCloud && loadStoredEvents()?.length ? (
            <button
              type="button"
              onClick={handleImport}
              className="text-main underline-offset-2 hover:underline"
            >
              localStorage 가져오기
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleReset}
            className="text-text-secondary underline-offset-2 hover:text-main hover:underline"
          >
            초기화
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span>{error}</span>
          <button type="button" onClick={clearError} className="font-medium">
            닫기
          </button>
        </div>
      )}

      {!isSupabaseConfigured() && (
        <p className="mb-4 rounded-xl border border-sub/30 bg-sub/10 px-4 py-3 text-sm text-text-secondary">
          Supabase 미연동 — 일정은 이 브라우저에만 저장됩니다.{' '}
          <code className="text-xs">.env</code> 설정 후 클라우드 동기화를 사용하세요.
        </p>
      )}

      <CalendarView
        events={filteredEvents}
        categories={categories}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        onEventClick={openEdit}
        onDateClick={openCreate}
        onEventMove={moveEvent}
        onAddClick={() => openCreate()}
      />

      <EventModal
        isOpen={modal.isOpen}
        mode={modal.mode}
        event={modal.event}
        categories={categories}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={deleteEvent}
      />
    </div>
  )
}
