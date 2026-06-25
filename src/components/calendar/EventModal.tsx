import { useEffect, useState } from 'react'
import type { CalendarEvent, EventCategory, EventCategoryMeta } from '../../types/calendar'
import {
  buildEventDateTime,
  isAllDayEvent,
  toDatetimeLocal,
} from '../../utils/calendarUtils'
import { Modal } from '../ui/Modal'

export type EventModalMode = 'create' | 'edit'

interface EventModalProps {
  isOpen: boolean
  mode: EventModalMode
  event: CalendarEvent | null
  categories: EventCategoryMeta[]
  onClose: () => void
  onSave: (event: CalendarEvent) => void
  onDelete?: (id: string) => void
}

interface EventForm {
  title: string
  allDay: boolean
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  category: EventCategory
  description: string
}

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm = (defaultStart?: string): EventForm => {
  const isTimed = defaultStart?.includes('T')
  const startDate = defaultStart?.slice(0, 10) ?? today()
  const startTime = isTimed
    ? toDatetimeLocal(defaultStart!).slice(11, 16)
    : '09:00'

  return {
    title: '',
    allDay: !isTimed,
    startDate,
    startTime,
    endDate: '',
    endTime: '',
    category: 'personal',
    description: '',
  }
}

/** 일정 추가/수정/삭제 모달 — 종일·시간 지정 지원 */
export function EventModal({
  isOpen,
  mode,
  event,
  categories,
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const [form, setForm] = useState<EventForm>(emptyForm())

  useEffect(() => {
    if (!isOpen) return

    if (mode === 'edit' && event) {
      const allDay = isAllDayEvent(event)
      setForm({
        title: event.title,
        allDay,
        startDate: event.start.slice(0, 10),
        startTime: allDay ? '09:00' : toDatetimeLocal(event.start).slice(11, 16),
        endDate: event.end?.slice(0, 10) ?? '',
        endTime: allDay
          ? ''
          : event.end
            ? toDatetimeLocal(event.end).slice(11, 16)
            : '',
        category: event.category,
        description: event.description ?? '',
      })
    } else {
      setForm(emptyForm(event?.start))
    }
  }, [isOpen, mode, event])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return

    const start = buildEventDateTime(
      form.startDate,
      form.startTime,
      form.allDay,
    )

    let end: string | undefined
    if (form.allDay) {
      end = form.endDate || undefined
    } else if (form.endDate && form.endTime) {
      end = buildEventDateTime(form.endDate, form.endTime, false)
    }

    const payload: CalendarEvent = {
      id: mode === 'edit' && event ? event.id : '',
      title: form.title.trim(),
      start,
      end,
      category: form.category,
      description: form.description.trim() || undefined,
      allDay: form.allDay,
    }
    onSave(payload)
    onClose()
  }

  const handleDelete = () => {
    if (mode === 'edit' && event && onDelete) {
      onDelete(event.id)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? '일정 추가' : '일정 수정'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            제목
          </label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-main focus:ring-2 focus:ring-main/20"
            placeholder="일정 제목을 입력하세요"
          />
        </div>

        {/* 종일 일정 토글 */}
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={form.allDay}
            onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
            className="h-4 w-4 rounded border-border text-main focus:ring-main/20"
          />
          <span className="text-sm font-medium text-text-primary">종일 일정</span>
        </label>

        {form.allDay ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                시작일
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-main focus:ring-2 focus:ring-main/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                종료일
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-main focus:ring-2 focus:ring-main/20"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  시작일
                </label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-main focus:ring-2 focus:ring-main/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  시작 시간
                </label>
                <input
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-main focus:ring-2 focus:ring-main/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  종료일
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-main focus:ring-2 focus:ring-main/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  종료 시간
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-main focus:ring-2 focus:ring-main/20"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            카테고리
          </label>
          <select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as EventCategory })
            }
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-main focus:ring-2 focus:ring-main/20"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            메모
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-main focus:ring-2 focus:ring-main/20"
            placeholder="선택 사항"
          />
        </div>

        <div className="sticky bottom-0 -mx-1 mt-2 flex items-center justify-between border-t border-border/70 bg-surface-card/95 px-1 pt-4 backdrop-blur-sm">
          {mode === 'edit' && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="text-sm font-medium text-red-500 hover:text-red-600"
            >
              삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white hover:bg-main-dark"
            >
              {mode === 'create' ? '추가' : '저장'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
