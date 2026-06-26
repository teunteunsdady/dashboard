import { useEffect, useId, useRef, useState } from 'react'
import { FieldLabelWithHint } from './FieldLabelWithHint'
import { inferEndTime24h, parseTimeInput } from '../../utils/calendarUtils'

interface TimePickerProps {
  label: string
  name?: string
  value: string
  onChange: (value: string) => void
  /** 종료 시간 등 — 시작 시간보다 이른 1~11시 입력을 13~23시로 보정 */
  referenceStartTime?: string
  required?: boolean
  allowEmpty?: boolean
  placeholder?: string
  hint?: string
}

const HOURS = Array.from({ length: 24 }, (_, index) => pad(index))
const MINUTES = Array.from({ length: 12 }, (_, index) => pad(index * 5))

const fieldClass =
  'min-w-0 flex-1 rounded-xl border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-main focus:ring-2 focus:ring-main/20'

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function splitTime(value: string): [string, string] {
  const matched = value.match(/^(\d{2}):(\d{2})$/)
  if (!matched) return ['09', '00']
  return [matched[1], matched[2]]
}

function snapMinute(minute: string) {
  const num = Number(minute)
  if (Number.isNaN(num)) return '00'
  const snapped = Math.min(55, Math.round(num / 5) * 5)
  return pad(snapped)
}

function formatDisplay(hour: string, minute: string) {
  const hourNum = Number(hour)
  const period = hourNum < 12 ? '오전' : '오후'
  const hour12 = hourNum % 12 === 0 ? 12 : hourNum % 12
  return `${period} ${hour12}:${minute}`
}

/** 커스텀 시간 선택기 — 직접 입력 + 시·분 선택 */
export function TimePicker({
  label,
  name,
  value,
  onChange,
  referenceStartTime,
  allowEmpty = false,
  placeholder = '09:00',
  hint = '24시간 형식(13:00)으로 저장됩니다. 오후 1:00도 입력 가능해요.',
}: TimePickerProps) {
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const hourListRef = useRef<HTMLDivElement>(null)
  const minuteListRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)
  const [pickerHour, setPickerHour] = useState('09')
  const [pickerMinute, setPickerMinute] = useState('00')

  useEffect(() => {
    if (focused) return
    setDraft(value)
  }, [value, focused])

  useEffect(() => {
    if (!open) return

    const [hour, minute] = splitTime(value)
    setPickerHour(hour)
    setPickerMinute(snapMinute(minute))

    const timer = window.setTimeout(() => {
      hourListRef.current
        ?.querySelector('[data-selected="true"]')
        ?.scrollIntoView({ block: 'center' })
      minuteListRef.current
        ?.querySelector('[data-selected="true"]')
        ?.scrollIntoView({ block: 'center' })
    }, 0)

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [open, value])

  const emitTime = (hour: string, minute: string) => {
    let next = `${hour}:${minute}`
    if (referenceStartTime) {
      next = inferEndTime24h(referenceStartTime, next)
    }
    onChange(next)
    setDraft(next)
    setPickerHour(next.slice(0, 2))
    setPickerMinute(next.slice(3, 5))
  }

  const applyTime = (hour: string, minute: string) => {
    emitTime(hour, minute)
  }

  const commitParsed = (parsed: string) => {
    const next = referenceStartTime
      ? inferEndTime24h(referenceStartTime, parsed)
      : parsed
    onChange(next)
    setDraft(next)
  }

  const commitDraft = () => {
    setFocused(false)
    const trimmed = draft.trim()

    if (!trimmed) {
      if (allowEmpty) {
        onChange('')
        setDraft('')
      } else {
        setDraft(value)
      }
      return
    }

    const parsed = parseTimeInput(trimmed)
    if (parsed === null) {
      setDraft(value)
      return
    }

    commitParsed(parsed)
  }

  const handleDraftChange = (next: string) => {
    setDraft(next)
    const parsed = parseTimeInput(next)
    if (parsed !== null && parsed !== '') {
      commitParsed(parsed)
    }
  }

  const openPicker = () => {
    const [hour, minute] = splitTime(value || draft)
    setPickerHour(hour)
    setPickerMinute(snapMinute(minute))
    setOpen(true)
  }

  const confirmPicker = () => {
    applyTime(pickerHour, pickerMinute)
    setOpen(false)
  }

  const clearTime = () => {
    if (!allowEmpty) return
    onChange('')
    setDraft('')
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <FieldLabelWithHint label={label} hint={hint} htmlFor={inputId} />
      <div className="flex gap-2">
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => handleDraftChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitDraft()
            }
          }}
          className={[
            fieldClass,
            open ? 'border-main ring-2 ring-main/20' : 'border-border',
          ].join(' ')}
          aria-label={label}
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (open ? setOpen(false) : openPicker())}
          className={[
            'flex shrink-0 items-center justify-center rounded-xl border bg-surface px-3 py-2 transition-colors',
            open
              ? 'border-main text-main ring-2 ring-main/20'
              : 'border-border text-main hover:border-main/40',
          ].join(' ')}
          aria-label="시간 선택 열기"
          aria-expanded={open}
        >
          <ClockIcon />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 rounded-2xl border border-border bg-surface-card p-4 shadow-card-hover">
          <p className="mb-3 text-center text-sm font-semibold text-text-primary">
            {formatDisplay(pickerHour, pickerMinute)}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-center text-xs font-medium text-text-secondary">
                시
              </p>
              <div
                ref={hourListRef}
                className="picker-scroll max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border/70 bg-surface p-1"
              >
                {HOURS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    data-selected={item === pickerHour}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setPickerHour(item)}
                    className={[
                      'w-full rounded-lg px-2 py-1.5 text-sm transition-colors',
                      item === pickerHour
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
              <div
                ref={minuteListRef}
                className="picker-scroll max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border/70 bg-surface p-1"
              >
                {MINUTES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    data-selected={item === pickerMinute}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setPickerMinute(item)}
                    className={[
                      'w-full rounded-lg px-2 py-1.5 text-sm transition-colors',
                      item === pickerMinute
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

          <div className="mt-3 flex items-center justify-between gap-2">
            {allowEmpty ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={clearTime}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface"
              >
                비우기
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={confirmPicker}
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
      className="h-4 w-4"
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
