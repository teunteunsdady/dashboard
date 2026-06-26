import { useEffect, useMemo, useRef, useState } from 'react'

interface DatePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

const SUNDAY_COLOR = '#EF4444'
const SATURDAY_COLOR = '#3B82F6'

function getWeekdayColor(dayIndex: number) {
  if (dayIndex === 0) return SUNDAY_COLOR
  if (dayIndex === 6) return SATURDAY_COLOR
  return undefined
}

function getDateWeekday(date: string) {
  return new Date(`${date}T00:00:00`).getDay()
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return { year, month, day }
}

function formatDisplay(value: string) {
  if (!value) return ''
  const { year, month, day } = parseDate(value)
  return `${year}년 ${month}월 ${day}일`
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate()

  const cells: Array<{
    date: string
    day: number
    inMonth: boolean
  }> = []

  for (let i = firstDay - 1; i >= 0; i -= 1) {
    const day = daysInPrevMonth - i
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    cells.push({
      date: toDateString(prevYear, prevMonth, day),
      day,
      inMonth: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: toDateString(year, month, day),
      day,
      inMonth: true,
    })
  }

  let nextDay = 1
  while (cells.length % 7 !== 0) {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    cells.push({
      date: toDateString(nextYear, nextMonth, nextDay),
      day: nextDay,
      inMonth: false,
    })
    nextDay += 1
  }

  return cells
}

/** 홈페이지 디자인에 맞춘 커스텀 날짜 선택기 */
export function DatePicker({
  label,
  value,
  onChange,
  required,
  placeholder = '날짜 선택',
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const initial = value ? parseDate(value) : parseDate(today)
  const [viewYear, setViewYear] = useState(initial.year)
  const [viewMonth, setViewMonth] = useState(initial.month)

  useEffect(() => {
    if (!value) return
    const parsed = parseDate(value)
    setViewYear(parsed.year)
    setViewMonth(parsed.month)
  }, [value])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const cells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  )

  const moveMonth = (delta: number) => {
    const date = new Date(viewYear, viewMonth - 1 + delta, 1)
    setViewYear(date.getFullYear())
    setViewMonth(date.getMonth() + 1)
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={[
          'flex w-full items-center justify-between rounded-xl border bg-surface px-3 py-2 text-sm outline-none transition-colors',
          open
            ? 'border-main ring-2 ring-main/20'
            : 'border-border hover:border-main/40',
        ].join(' ')}
      >
        <span className={value ? 'text-text-primary' : 'text-text-secondary'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon />
      </button>
      <input type="hidden" value={value} required={required} readOnly />

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-border bg-surface-card p-4 shadow-card-hover">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="rounded-lg px-2 py-1 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-main"
              aria-label="이전 달"
            >
              ‹
            </button>
            <p className="text-sm font-semibold text-text-primary">
              {viewYear}년 {viewMonth}월
            </p>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="rounded-lg px-2 py-1 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-main"
              aria-label="다음 달"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day, index) => (
              <div
                key={day}
                className="py-1 text-center text-xs font-medium text-text-secondary"
                style={
                  getWeekdayColor(index)
                    ? { color: getWeekdayColor(index) }
                    : undefined
                }
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const isSelected = cell.date === value
              const isToday = cell.date === today
              const weekday = getDateWeekday(cell.date)
              const weekendColor = getWeekdayColor(weekday)

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => {
                    onChange(cell.date)
                    setOpen(false)
                  }}
                  className={[
                    'aspect-square rounded-lg text-sm transition-colors',
                    isSelected
                      ? 'bg-main font-semibold text-white shadow-sm'
                      : cell.inMonth
                        ? weekendColor
                          ? ''
                          : 'text-text-primary hover:bg-main/10'
                        : 'opacity-50 hover:bg-surface',
                    !isSelected && cell.inMonth && weekendColor
                      ? 'hover:bg-main/10'
                      : '',
                    isToday && !isSelected ? 'ring-1 ring-main/40' : '',
                  ].join(' ')}
                  style={
                    !isSelected && weekendColor ? { color: weekendColor } : undefined
                  }
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                onChange(today)
                setOpen(false)
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-main hover:bg-main/10"
            >
              오늘
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg
      className="h-4 w-4 text-main"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  )
}
