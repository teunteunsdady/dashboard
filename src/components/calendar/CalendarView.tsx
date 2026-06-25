import { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import koLocale from '@fullcalendar/core/locales/ko'
import type {
  EventClickArg,
  EventDropArg,
  EventMountArg,
} from '@fullcalendar/core'
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction'
import type { CalendarEvent, EventCategory, EventCategoryMeta } from '../../types/calendar'
import { toFullCalendarEvent } from '../../utils/calendarUtils'
import { CategoryFilter } from './CategoryFilter'
import { Card } from '../ui/Card'

type CalendarViewType = 'dayGridMonth' | 'timeGridWeek'

interface TooltipState {
  visible: boolean
  title: string
  categoryLabel: string
  categoryColor: string
  dateText: string
  timeRange?: string
  description?: string
  x: number
  y: number
}

interface CalendarViewProps {
  events: CalendarEvent[]
  categories: EventCategoryMeta[]
  activeFilters: Set<EventCategory>
  onToggleFilter: (categoryId: EventCategory) => void
  onEventClick: (event: CalendarEvent) => void
  onDateClick: (start: string, allDay: boolean) => void
  onEventMove: (id: string, startStr: string, endStr?: string | null) => void
  onAddClick: () => void
}

/** FullCalendar 기반 월간/주간 뷰 + 카테고리 필터 + 드래그 이동 */
export function CalendarView({
  events,
  categories,
  activeFilters,
  onToggleFilter,
  onEventClick,
  onDateClick,
  onEventMove,
  onAddClick,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null)
  const [currentView, setCurrentView] = useState<CalendarViewType>('dayGridMonth')
  const [isMobile, setIsMobile] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    title: '',
    categoryLabel: '',
    categoryColor: '#007AFF',
    dateText: '',
    x: 0,
    y: 0,
  })

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth < 768)
    updateMobile()
    window.addEventListener('resize', updateMobile)
    return () => window.removeEventListener('resize', updateMobile)
  }, [])

  const fcEvents = useMemo(
    () => events.map((e) => toFullCalendarEvent(e, categories)),
    [events, categories],
  )

  const switchView = (view: CalendarViewType) => {
    setCurrentView(view)
    calendarRef.current?.getApi().changeView(view)
  }

  const handleEventClick = (info: EventClickArg) => {
    const matched = events.find((e) => e.id === info.event.id)
    if (matched) onEventClick(matched)
  }

  /** 날짜/시간 슬롯 클릭 → 일정 추가 모달 (주간 뷰는 시간 포함) */
  const handleDateClick = (info: DateClickArg) => {
    const isWeekView = currentView === 'timeGridWeek'
    if (isWeekView && info.dateStr.includes('T')) {
      onDateClick(info.dateStr, false)
    } else {
      onDateClick(info.dateStr.slice(0, 10), true)
    }
  }

  /** 드래그 앤 드롭으로 일정 이동 */
  const handleEventDrop = (info: EventDropArg) => {
    onEventMove(info.event.id, info.event.startStr, info.event.endStr)
  }

  /** 리사이즈로 일정 기간 조정 */
  const handleEventResize = (info: EventResizeDoneArg) => {
    onEventMove(info.event.id, info.event.startStr, info.event.endStr)
  }

  const calcTooltipPosition = (clientX: number, clientY: number) => {
    const width = 300
    const height = 132
    const gap = 12
    let x = clientX + gap
    let y = clientY + gap

    if (x + width > window.innerWidth - 8) {
      x = clientX - width - gap
    }
    if (x < 8) x = 8

    if (y + height > window.innerHeight - 8) {
      y = clientY - height - gap
    }
    if (y < 8) y = 8

    return { x, y }
  }

  /** 이벤트 hover 툴팁 주입 (뷰포트 기준 위치 보정) */
  const handleEventDidMount = (info: EventMountArg) => {
    const categoryId = String(info.event.extendedProps.category ?? '')
    const categoryMeta =
      categories.find((c) => c.id === categoryId) ??
      ({
        id: 'personal',
        label: '기타',
        color: '#007AFF',
      } as EventCategoryMeta)
    const categoryLabel = categoryMeta.label
    const isAllDay = Boolean(info.event.allDay)
    const dateText = info.event.start
      ? info.event.start.toLocaleDateString('ko-KR')
      : '-'
    const formatTime = (date: Date) =>
      `${String(date.getHours()).padStart(2, '0')}:${String(
        date.getMinutes(),
      ).padStart(2, '0')}`
    const startTime = info.event.start ? formatTime(info.event.start) : ''
    const endTime = info.event.end ? formatTime(info.event.end) : undefined
    const description = String(info.event.extendedProps.description ?? '')

    const timeRange =
      !isAllDay && startTime
        ? endTime
          ? `${startTime} - ${endTime}`
          : startTime
        : undefined

    const showTooltip = (ev: MouseEvent) => {
      const pos = calcTooltipPosition(ev.clientX, ev.clientY)
      setTooltip({
        visible: true,
        title: info.event.title,
        categoryLabel,
        categoryColor: categoryMeta.color,
        dateText,
        timeRange,
        description: description || undefined,
        x: pos.x,
        y: pos.y,
      })
    }

    const moveTooltip = (ev: MouseEvent) => {
      const pos = calcTooltipPosition(ev.clientX, ev.clientY)
      setTooltip((prev) => ({
        ...prev,
        x: pos.x,
        y: pos.y,
      }))
    }

    const hideTooltip = () => {
      setTooltip((prev) => ({ ...prev, visible: false }))
    }

    info.el.addEventListener('mouseenter', showTooltip)
    info.el.addEventListener('mousemove', moveTooltip)
    info.el.addEventListener('mouseleave', hideTooltip)

    ;(
      info.el as HTMLElement & {
        __tooltipHandlers?: {
          show: (ev: MouseEvent) => void
          move: (ev: MouseEvent) => void
          hide: () => void
        }
      }
    ).__tooltipHandlers = {
      show: showTooltip,
      move: moveTooltip,
      hide: hideTooltip,
    }
  }

  const handleEventWillUnmount = (info: EventMountArg) => {
    const el = info.el as HTMLElement & {
      __tooltipHandlers?: {
        show: (ev: MouseEvent) => void
        move: (ev: MouseEvent) => void
        hide: () => void
      }
    }

    if (!el.__tooltipHandlers) return
    el.removeEventListener('mouseenter', el.__tooltipHandlers.show)
    el.removeEventListener('mousemove', el.__tooltipHandlers.move)
    el.removeEventListener('mouseleave', el.__tooltipHandlers.hide)
    delete el.__tooltipHandlers
  }

  return (
    <Card className="border-main/10">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            드래그로 일정을 이동하고, 주간 뷰에서 시간대별 일정을 확인하세요.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => switchView('dayGridMonth')}
              className={[
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                currentView === 'dayGridMonth'
                  ? 'bg-main text-white'
                  : 'text-text-secondary hover:text-main',
              ].join(' ')}
            >
              월간
            </button>
            <button
              type="button"
              onClick={() => switchView('timeGridWeek')}
              className={[
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                currentView === 'timeGridWeek'
                  ? 'bg-main text-white'
                  : 'text-text-secondary hover:text-main',
              ].join(' ')}
            >
              주간
            </button>
          </div>
          <button
            type="button"
            onClick={onAddClick}
            className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-main-dark"
          >
            + 일정 추가
          </button>
        </div>
      </div>

      <div className="mb-6">
        <CategoryFilter
          categories={categories}
          activeFilters={activeFilters}
          onToggle={onToggleFilter}
        />
      </div>

      <div className="calendar-wrapper rounded-xl border border-main/15 bg-surface p-2 shadow-inner md:p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={koLocale}
          headerToolbar={{
            left: isMobile ? 'prev,next' : 'prev,next today',
            center: 'title',
            right: '',
          }}
          events={fcEvents}
          eventClick={handleEventClick}
          eventDidMount={handleEventDidMount}
          eventWillUnmount={handleEventWillUnmount}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          height="auto"
          dayMaxEvents={isMobile ? 2 : 3}
          fixedWeekCount={false}
          weekends
          editable
          eventDurationEditable
          eventStartEditable
          selectable
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          snapDuration="00:15:00"
          eventMinHeight={14}
          eventShortHeight={20}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot
          nowIndicator
          displayEventEnd
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
        />
      </div>

      {tooltip.visible && (
        <div
          className="pointer-events-none fixed z-[9999] max-w-[300px] rounded-xl border border-main/20 bg-white/95 px-3 py-2 text-xs font-medium leading-5 text-slate-700 shadow-[0_12px_28px_-12px_rgba(14,98,247,0.35)] backdrop-blur-sm"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-semibold">{tooltip.title}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: tooltip.categoryColor }}
            />
            <p>{tooltip.categoryLabel}</p>
          </div>
          <p className="mt-1 text-slate-600">
            날짜: {tooltip.dateText}
          </p>
          {tooltip.timeRange && (
            <p className="text-slate-600">
              시간: {tooltip.timeRange}
            </p>
          )}
          {tooltip.description && (
            <p className="mt-1 text-slate-600">
              메모: {tooltip.description}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
