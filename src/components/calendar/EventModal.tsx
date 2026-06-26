import { useEffect, useState } from 'react'
import type { CalendarEvent, EventCategory, EventCategoryMeta } from '../../types/calendar'
import {
  buildEventDateTime,
  getCategoryDotColor,
  getCategoryTextColor,
  isAllDayEvent,
  toDatetimeLocal,
} from '../../utils/calendarUtils'
import { DatePicker } from '../ui/DatePicker'
import { Modal } from '../ui/Modal'
import { TimePicker } from '../ui/TimePicker'

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

const fieldClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-main focus:ring-2 focus:ring-main/20'

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
            className={fieldClass}
            placeholder="일정 제목을 입력하세요"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
          <input
            type="checkbox"
            checked={form.allDay}
            onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
            className="h-4 w-4 rounded border-border text-main focus:ring-main/20"
          />
          <span className="text-sm font-medium text-text-primary">종일 일정</span>
        </label>

        {form.allDay ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DatePicker
              label="시작일"
              value={form.startDate}
              onChange={(startDate) => setForm({ ...form, startDate })}
              required
            />
            <DatePicker
              label="종료일"
              value={form.endDate}
              onChange={(endDate) => setForm({ ...form, endDate })}
              placeholder="선택 안 함"
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DatePicker
                label="시작일"
                value={form.startDate}
                onChange={(startDate) => setForm({ ...form, startDate })}
                required
              />
              <TimePicker
                label="시작 시간"
                value={form.startTime}
                onChange={(startTime) => setForm({ ...form, startTime })}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DatePicker
                label="종료일"
                value={form.endDate}
                onChange={(endDate) => setForm({ ...form, endDate })}
                placeholder="선택 안 함"
              />
              <TimePicker
                label="종료 시간"
                value={form.endTime}
                onChange={(endTime) => setForm({ ...form, endTime })}
                placeholder="선택 안 함"
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            카테고리
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((cat) => {
              const selected = form.category === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.id })}
                  className={[
                    'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                    selected
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-border bg-surface text-text-secondary hover:border-main/30',
                  ].join(' ')}
                  style={
                    selected
                      ? {
                          backgroundColor: cat.color,
                          color: getCategoryTextColor(cat.color),
                        }
                      : undefined
                  }
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: getCategoryDotColor(cat.color, selected),
                    }}
                  />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            메모
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className={`${fieldClass} resize-none`}
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
