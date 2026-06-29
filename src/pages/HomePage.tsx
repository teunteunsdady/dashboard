import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReadOnlyBanner } from '../components/auth/ReadOnlyBanner'
import { useAuth } from '../contexts/AuthContext'
import { EventModal, type EventModalMode } from '../components/calendar/EventModal'
import { TodayEventsPanel } from '../components/calendar/TodayEventsPanel'
import { OverviewBusCard } from '../components/home/OverviewBusCard'
import { OverviewLedgerCard } from '../components/home/OverviewLedgerCard'
import { useBusArrivals } from '../hooks/useBusArrivals'
import { useEvents } from '../hooks/useEvents'
import { useLedger } from '../hooks/useLedger'
import type { CalendarEvent } from '../types/calendar'
import { localToday } from '../utils/calendarUtils'
import {
  getOverviewBusStopLabel,
  resolveOverviewBusStopId,
  suggestCommuteBusStopId,
} from '../utils/commuteBus'
import { formatTodayHeading } from '../utils/todayEvents'

interface ModalState {
  isOpen: boolean
  mode: EventModalMode
  event: CalendarEvent | null
}

const closedModal: ModalState = { isOpen: false, mode: 'create', event: null }

/** 홈 — 일정·가계부·버스 한눈에 */
export function HomePage() {
  const { canWrite, canAccessLedger, canAccessBus, isReadOnlyPersonal } =
    useAuth()
  const busStopId = useMemo(() => resolveOverviewBusStopId(), [])
  const commuteHint = useMemo(() => suggestCommuteBusStopId(), [])

  const {
    events,
    filteredEvents,
    categories,
    loading: eventsLoading,
    error: eventsError,
    addEvent,
    updateEvent,
    deleteEvent,
    clearError: clearEventsError,
  } = useEvents()

  const {
    month,
    incomeTotal,
    expenseTotal,
    balance,
    overBudget,
    loading: ledgerLoading,
    error: ledgerError,
  } = useLedger()

  const {
    stop,
    updatedAt,
    loading: busLoading,
    refreshing,
    error: busError,
    quota: busQuota,
    quotaExhausted: busQuotaExhausted,
    refresh,
  } = useBusArrivals(busStopId)

  const [modal, setModal] = useState<ModalState>(closedModal)

  const openCreate = () => {
    if (!canWrite) return
    setModal({
      isOpen: true,
      mode: 'create',
      event: { id: '', title: '', start: localToday(), category: 'personal', allDay: true },
    })
  }

  const openEdit = (event: CalendarEvent) => {
    setModal({ isOpen: true, mode: 'edit', event })
  }

  const closeModal = () => setModal(closedModal)

  const handleSave = async (event: CalendarEvent) => {
    if (modal.mode === 'create') {
      await addEvent({
        title: event.title,
        start: event.start,
        end: event.end,
        category: event.category,
        description: event.description,
        allDay: event.allDay,
        notify: event.notify,
      })
    } else {
      await updateEvent(event)
    }
  }

  const pageLoading = eventsLoading && events.length === 0

  if (pageLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-main/20 border-t-main" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <header className="mb-6">
        <p className="text-sm font-medium text-text-secondary">홈</p>
        <h1 className="mt-1 text-2xl font-bold text-text-primary md:text-3xl">
          {formatTodayHeading()}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {isReadOnlyPersonal
            ? '오늘 개인 일정을 확인하세요.'
            : '오늘 일정, 이번 달 가계부, 버스 도착을 한곳에서 확인하세요.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link
            to="/dashboard"
            className="rounded-full border border-border bg-surface px-3 py-1.5 font-medium text-text-secondary hover:border-main/25 hover:text-main"
          >
            Dashboard
          </Link>
          {canAccessLedger && (
            <Link
              to="/ledger"
              className="rounded-full border border-border bg-surface px-3 py-1.5 font-medium text-text-secondary hover:border-main/25 hover:text-main"
            >
              Ledger
            </Link>
          )}
          {canAccessBus && (
            <Link
              to="/bus"
              className="rounded-full border border-border bg-surface px-3 py-1.5 font-medium text-text-secondary hover:border-main/25 hover:text-main"
            >
              Bus
            </Link>
          )}
        </div>
      </header>

      {eventsError && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span>{eventsError}</span>
          <button type="button" onClick={clearEventsError} className="font-medium">
            닫기
          </button>
        </div>
      )}

      {!canWrite && <ReadOnlyBanner />}

      <div className="space-y-4">
        <TodayEventsPanel
          events={filteredEvents}
          categories={categories}
          onEventClick={openEdit}
          onAddClick={openCreate}
          readOnly={!canWrite}
        />

        {(canAccessLedger || canAccessBus) && (
          <div className="grid gap-4 md:grid-cols-2">
            {canAccessLedger && (
              <OverviewLedgerCard
                month={month}
                income={incomeTotal}
                expense={expenseTotal}
                balance={balance}
                loading={ledgerLoading}
                error={ledgerError}
                overBudget={overBudget}
              />
            )}

            {canAccessBus && (
              <div className="space-y-2">
                {commuteHint && (
                  <p className="text-xs text-text-secondary">
                    출퇴근 시간대 — {getOverviewBusStopLabel(commuteHint)} 정류장 자동 선택
                  </p>
                )}
                <OverviewBusCard
                  stopId={busStopId}
                  stop={stop}
                  loading={busLoading}
                  error={busError}
                  updatedAt={updatedAt}
                  quota={busQuota}
                  quotaExhausted={busQuotaExhausted}
                  onRefresh={refresh}
                  refreshing={refreshing}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <EventModal
        isOpen={modal.isOpen}
        mode={modal.mode}
        event={modal.event}
        categories={categories}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={deleteEvent}
        readOnly={!canWrite}
      />
    </div>
  )
}
