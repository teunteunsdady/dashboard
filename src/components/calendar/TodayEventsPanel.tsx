import { useMemo } from 'react'
import type { CalendarEvent, EventCategoryMeta } from '../../types/calendar'
import { getCategoryTextColor, isEventEnded } from '../../utils/calendarUtils'
import {
  formatEventTimeLabel,
  formatTodayHeading,
  getTodayEvents,
  isEventInProgress,
} from '../../utils/todayEvents'
import { Card } from '../ui/Card'

interface TodayEventsPanelProps {
  events: CalendarEvent[]
  categories: EventCategoryMeta[]
  onEventClick: (event: CalendarEvent) => void
  onAddClick: () => void
  readOnly?: boolean
  hideCategoryTags?: boolean
}

/** Dashboard 상단 — 오늘 일정 요약 */
export function TodayEventsPanel({
  events,
  categories,
  onEventClick,
  onAddClick,
  readOnly = false,
  hideCategoryTags = false,
}: TodayEventsPanelProps) {
  const todayEvents = useMemo(() => getTodayEvents(events), [events])
  const heading = formatTodayHeading()

  return (
    <Card className="mb-4 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            오늘
          </p>
          <h2 className="text-lg font-semibold text-text-primary">{heading}</h2>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={onAddClick}
            className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:border-main/30 hover:text-main"
          >
            + 일정
          </button>
        )}
      </div>

      {todayEvents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/50 px-4 py-6 text-center text-sm text-text-secondary">
          오늘 등록된 일정이 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {todayEvents.map((event) => {
            const category = categories.find((c) => c.id === event.category)
            const color = category?.color ?? '#BFDBFE'
            const ended = isEventEnded(event)
            const inProgress = isEventInProgress(event)

            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onEventClick(event)}
                  className={[
                    'flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-main/25 hover:bg-main/5',
                    ended ? 'opacity-55' : '',
                  ].join(' ')}
                >
                  <span
                    className="w-1 shrink-0 self-stretch rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span className="min-w-[4.5rem] shrink-0 text-sm font-medium tabular-nums text-text-secondary">
                    {formatEventTimeLabel(event)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                    {event.title}
                  </span>
                  {category && !hideCategoryTags && (
                    <span
                      className="hidden shrink-0 rounded-md px-2 py-0.5 text-xs font-medium sm:inline"
                      style={{
                        backgroundColor: color,
                        color: getCategoryTextColor(color),
                      }}
                    >
                      {category.label}
                    </span>
                  )}
                  {inProgress && (
                    <span className="shrink-0 rounded-md bg-main/10 px-2 py-0.5 text-xs font-medium text-main">
                      진행 중
                    </span>
                  )}
                  {event.notify && (
                    <span
                      className="shrink-0 text-main"
                      title="알림 켜짐"
                      aria-label="알림 켜짐"
                    >
                      !
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
