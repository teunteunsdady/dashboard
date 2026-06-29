import { useState } from "react";
import {
  CalendarView,
  type CalendarViewType,
} from "../components/calendar/CalendarView";
import {
  EventModal,
  type EventModalMode,
} from "../components/calendar/EventModal";
import { EventNotificationBanner } from "../components/calendar/EventNotificationBanner";
import { TodayEventsPanel } from "../components/calendar/TodayEventsPanel";
import { ReadOnlyBanner } from "../components/auth/ReadOnlyBanner";
import { useAuth } from "../contexts/AuthContext";
import { useEvents } from "../hooks/useEvents";
import { useEventNotifications } from "../hooks/useEventNotifications";
import { isSupabaseConfigured } from "../lib/supabase";
import type { CalendarEvent } from "../types/calendar";
import { localToday } from "../utils/calendarUtils";

interface ModalState {
  isOpen: boolean;
  mode: EventModalMode;
  event: CalendarEvent | null;
}

const closedModal: ModalState = { isOpen: false, mode: "create", event: null };

/** Dashboard 페이지 — FullCalendar 일정 관리 */
export function DashboardPage() {
  const { canWrite } = useAuth();
  const {
    events,
    filteredEvents,
    categories,
    activeFilters,
    loading,
    error,
    toggleFilter,
    addEvent,
    updateEvent,
    deleteEvent,
    moveEvent,
    clearError,
  } = useEvents();

  useEventNotifications(canWrite ? events : []);

  const [modal, setModal] = useState<ModalState>(closedModal);
  const [calendarView, setCalendarView] =
    useState<CalendarViewType>("dayGridMonth");

  const openCreate = (start?: string, allDay = true) => {
    if (!canWrite) return;
    setModal({
      isOpen: true,
      mode: "create",
      event: start
        ? { id: "", title: "", start, category: "personal", allDay }
        : null,
    });
  };

  const openEdit = (event: CalendarEvent) => {
    setModal({ isOpen: true, mode: "edit", event });
  };

  const closeModal = () => setModal(closedModal);

  const handleSave = async (event: CalendarEvent) => {
    if (modal.mode === "create") {
      await addEvent({
        title: event.title,
        start: event.start,
        end: event.end,
        category: event.category,
        description: event.description,
        allDay: event.allDay,
        notify: event.notify,
      });
    } else {
      await updateEvent(event);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-main/20 border-t-main" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
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
          Supabase 미연동 — 일정은 이 브라우저에만 저장됩니다.{" "}
          <code className="text-xs">.env</code> 설정 후 클라우드 동기화를
          사용하세요.
        </p>
      )}

      {!canWrite && <ReadOnlyBanner />}

      {canWrite && <EventNotificationBanner events={events} />}

      <TodayEventsPanel
        events={filteredEvents}
        categories={categories}
        onEventClick={openEdit}
        onAddClick={() => openCreate(localToday(), true)}
        readOnly={!canWrite}
      />

      <CalendarView
        events={filteredEvents}
        categories={categories}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        onEventClick={openEdit}
        onDateClick={openCreate}
        onEventMove={moveEvent}
        onAddClick={() => openCreate()}
        currentView={calendarView}
        onViewChange={setCalendarView}
        readOnly={!canWrite}
      />

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
  );
}
