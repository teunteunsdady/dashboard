import { useEffect, useRef, useState } from 'react'

interface TimePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}

const HOURS = Array.from({ length: 24 }, (_, index) => pad(index))
const MINUTES = Array.from({ length: 60 }, (_, index) => pad(index))

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDisplay(value: string) {
  if (!value) return ''
  const [hour, minute] = value.split(':')
  const hourNum = Number(hour)
  const period = hourNum < 12 ? '오전' : '오후'
  const hour12 = hourNum % 12 === 0 ? 12 : hourNum % 12
  return `${period} ${hour12}:${minute}`
}

function splitTime(value: string): [string, string] {
  if (!value) return ['09', '00']
  const [hour, minute] = value.split(':')
  return [hour, minute]
}

/** 홈페이지 디자인에 맞춘 커스텀 시간 선택기 */
export function TimePicker({
  label,
  value,
  onChange,
  required,
  placeholder = '시간 선택',
}: TimePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [hour, minute] = splitTime(value)

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

  const selectHour = (nextHour: string) => {
    onChange(`${nextHour}:${minute || '00'}`)
  }

  const selectMinute = (nextMinute: string) => {
    onChange(`${hour || '09'}:${nextMinute}`)
  }

  const displayTime = value || `${hour}:${minute}`

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
        <ClockIcon />
      </button>
      <input type="hidden" value={value} required={required} readOnly />

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-border bg-surface-card p-4 shadow-card-hover">
          <p className="mb-3 text-center text-sm font-semibold text-text-primary">
            {formatDisplay(displayTime)}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-center text-xs font-medium text-text-secondary">
                시
              </p>
              <div className="picker-scroll max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border/70 bg-surface p-1">
                {HOURS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => selectHour(item)}
                    className={[
                      'w-full rounded-lg px-2 py-1.5 text-sm transition-colors',
                      item === hour
                        ? 'bg-main font-semibold text-white'
                        : 'text-text-primary hover:bg-main/10',
                    ].join(' ')}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-center text-xs font-medium text-text-secondary">
                분
              </p>
              <div className="picker-scroll max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border/70 bg-surface p-1">
                {MINUTES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => selectMinute(item)}
                    className={[
                      'w-full rounded-lg px-2 py-1.5 text-sm transition-colors',
                      item === minute
                        ? 'bg-main font-semibold text-white'
                        : 'text-text-primary hover:bg-main/10',
                    ].join(' ')}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-main px-3 py-1.5 text-xs font-medium text-white hover:bg-main-dark"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ClockIcon() {
  return (
    <svg
      className="h-4 w-4 text-main"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4l3 2" />
    </svg>
  )
}
