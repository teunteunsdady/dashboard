import type { EventInput } from '@fullcalendar/core'
import type { CalendarEvent, EventCategoryMeta } from '../types/calendar'
import { eventDebugLog } from './eventDebugLog'

function parseHexColor(hex: string): [number, number, number] | null {
  const normalized = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ]
}

function getRelativeLuminance(hex: string): number {
  const rgb = parseHexColor(hex)
  if (!rgb) return 0

  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** 활성 칩·달력 일정 위 텍스트 색 — 파스텔 배경은 진한 글자 */
export function getCategoryTextColor(color: string): string {
  return getRelativeLuminance(color) > 0.62 ? '#334155' : '#FFFFFF'
}

/** 활성 칩 앞 동그라미 색 */
export function getCategoryDotColor(color: string, active: boolean): string {
  if (!active) return color
  const textColor = getCategoryTextColor(color)
  return textColor === '#FFFFFF' ? color : textColor
}

/** 종일 일정 여부 판별 */
export function isAllDayEvent(event: Pick<CalendarEvent, 'start' | 'allDay'>): boolean {
  if (event.allDay !== undefined) return event.allDay
  return !event.start.includes('T')
}

/** 종료된 일정 여부 (로컬 기준) */
export function isEventEnded(
  event: Pick<CalendarEvent, 'start' | 'end' | 'allDay'>,
  nowMs: number = Date.now(),
): boolean {
  const allDay = isAllDayEvent(event)

  if (allDay) {
    const lastDay = (event.end ?? event.start).slice(0, 10)
    const today = localToday()
    return today > lastDay
  }

  const endMs = event.end
    ? toLocalDateTimeMs(normalizeDateTime(event.end))
    : toLocalDateTimeMs(normalizeDateTime(event.start))

  return nowMs > endMs
}

/** ISO/폼 문자열 → 로컬 YYYY-MM-DDTHH:mm (타임존 재해석 없이) */
export function normalizeDateTime(value: string): string {
  if (!value.includes('T')) return value

  const localMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/,
  )
  if (localMatch) {
    return `${localMatch[1]}-${localMatch[2]}-${localMatch[3]}T${localMatch[4]}:${localMatch[5]}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** FullCalendar용 로컬 Date */
export function toFcLocalDate(dateTime: string): Date {
  return new Date(toLocalDateTimeMs(normalizeDateTime(dateTime)))
}

/** FullCalendar용 로컬 ISO(+오프셋) — T14:00 UTC 오해석 방지 */
export function toFcLocalIso(dateTime: string): string {
  const date = toFcLocalDate(dateTime)
  const pad = (n: number) => String(n).padStart(2, '0')
  const offsetMin = -date.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

/** CalendarEvent → FullCalendar EventInput 변환 */
export function toFullCalendarEvent(
  event: CalendarEvent,
  categories: EventCategoryMeta[],
): EventInput {
  const color =
    categories.find((c) => c.id === event.category)?.color ?? '#BFDBFE'
  const allDay = isAllDayEvent(event)
  const ended = isEventEnded(event)
  const classNames = ended ? ['fc-event-ended'] : undefined

  if (allDay) {
    return {
      id: event.id,
      title: event.title,
      start: event.start.slice(0, 10),
      end: event.end?.slice(0, 10),
      allDay: true,
      classNames,
      backgroundColor: color,
      borderColor: color,
      textColor: getCategoryTextColor(color),
      extendedProps: {
        category: event.category,
        description: event.description ?? '',
        allDay: true,
      },
    }
  }

  const start = toFcLocalIso(event.start)
  let end: string | undefined
  if (event.end) {
    const endMs = toLocalDateTimeMs(normalizeDateTime(event.end))
    if (endMs > toLocalDateTimeMs(normalizeDateTime(event.start))) {
      end = toFcLocalIso(event.end)
    }
  }

  return {
    id: event.id,
    title: event.title,
    start,
    end,
    allDay: false,
    classNames,
    backgroundColor: color,
    borderColor: color,
    textColor: getCategoryTextColor(color),
    extendedProps: {
      category: event.category,
      description: event.description ?? '',
      allDay: false,
    },
  }
}

/** FullCalendar 드롭/리사이즈 결과 → CalendarEvent 날짜 필드 갱신 */
export function applyEventDateChange(
  event: CalendarEvent,
  startStr: string,
  endStr?: string | null,
): CalendarEvent {
  const allDay = !startStr.includes('T')

  if (allDay) {
    return {
      ...event,
      start: startStr.slice(0, 10),
      end: endStr ? endStr.slice(0, 10) : undefined,
      allDay: true,
    }
  }

  return {
    ...event,
    start: normalizeDateTime(startStr),
    end: endStr ? normalizeDateTime(endStr) : undefined,
    allDay: false,
  }
}

/** datetime-local input용 값 변환 */
export function toDatetimeLocal(value: string): string {
  if (!value.includes('T')) return `${value}T09:00`
  return normalizeDateTime(value)
}

/** datetime 문자열을 로컬 날짜·시간으로 분리 */
export function splitLocalDateTime(value: string): { date: string; time: string } {
  if (!value.includes('T')) {
    return { date: value.slice(0, 10), time: '09:00' }
  }
  const normalized = normalizeDateTime(value)
  return {
    date: normalized.slice(0, 10),
    time: normalized.slice(11, 16),
  }
}

/** 오늘 날짜 (로컬) */
export function localToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** 폼 입력값 → CalendarEvent start/end 문자열 조합 */
export function buildEventDateTime(
  date: string,
  time: string,
  allDay: boolean,
): string {
  return allDay ? date : `${date}T${time}`
}

/** 로컬 기준 일시 → ms (타임존 파싱 오차 방지) */
export function toLocalDateTimeMs(dateTime: string): number {
  const [datePart, timePart = '00:00'] = dateTime.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime()
}

/** 폼 시간 필드를 24시간 HH:mm으로 통일 (종료는 같은 날이면 오후로 보정) */
export function normalizeTimedForm<
  T extends {
    startDate: string
    startTime: string
    endDate: string
    endTime: string
  },
>(form: T): T {
  const startDate = form.startDate.trim()
  const startTime = parseTimeInput(form.startTime) || form.startTime.trim()

  let endTime = form.endTime.trim()
  if (endTime) {
    const parsedEnd = parseTimeInput(endTime) || endTime
    const endDate = form.endDate.trim() || startDate
    const before = endTime
    endTime =
      startTime && endDate === startDate
        ? inferEndTime24h(startTime, parsedEnd)
        : parsedEnd
    if (before !== endTime) {
      eventDebugLog('normalizeTimedForm: endTime 보정', {
        startTime,
        before,
        after: endTime,
        endDate,
        startDate,
      })
    }
  }

  const result = { ...form, startTime, endTime }
  eventDebugLog('normalizeTimedForm', { in: form, out: result })
  return result
}

/** 시간 일정 종료 일시 (종료일 비어 있으면 시작일 사용) */
export function resolveTimedEventEnd(form: {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
}): string | undefined {
  const normalized = normalizeTimedForm(form)
  const endTime = normalized.endTime.trim()
  if (!endTime) return undefined

  const startDate = normalized.startDate.trim()
  if (!startDate) return undefined

  let endDate = normalized.endDate.trim() || startDate
  if (endDate < startDate) {
    endDate = startDate
  }

  const result = buildEventDateTime(endDate, endTime, false)
  eventDebugLog('resolveTimedEventEnd', { form, normalized, endDate, endTime, result })
  return result
}

/** 시간 일정 시작·종료 문자열 생성 */
export function buildTimedEventRange(form: {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
}): { start: string; end?: string } {
  const normalized = normalizeTimedForm(form)
  const start = buildEventDateTime(
    normalized.startDate,
    normalized.startTime,
    false,
  )
  const end = resolveTimedEventEnd(normalized)
  const range = { start, end }
  eventDebugLog('buildTimedEventRange', {
    form,
    normalized,
    startMs: toLocalDateTimeMs(start),
    endMs: end ? toLocalDateTimeMs(end) : null,
    range,
  })
  return range
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function readFormInput(formEl: HTMLFormElement, name: string): string {
  const el = formEl.elements.namedItem(name)
  return el instanceof HTMLInputElement ? el.value : ''
}

/** submit 직전 DOM 입력값으로 폼 상태 동기화 (blur 전 저장 클릭 대응) */
export function syncEventFormFromDom<
  T extends {
    allDay: boolean
    startDate: string
    startTime: string
    endDate: string
    endTime: string
  },
>(form: T, formEl: HTMLFormElement): T {
  const rawStartDate = readFormInput(formEl, 'startDate')
  const rawEndDate = readFormInput(formEl, 'endDate')
  const rawStartTime = readFormInput(formEl, 'startTime')
  const rawEndTime = readFormInput(formEl, 'endTime')

  const parsedStartDate = parseDateInput(rawStartDate)
  const parsedEndDate = parseDateInput(rawEndDate)
  const parsedStartTime = parseTimeInput(rawStartTime)
  const parsedEndTime = parseTimeInput(rawEndTime)
  const startDate =
    parsedStartDate !== null && parsedStartDate !== ''
      ? parsedStartDate
      : form.startDate
  const startTime =
    parsedStartTime !== null && parsedStartTime !== ''
      ? parsedStartTime
      : rawStartTime.trim() === ''
        ? ''
        : form.startTime
  let endTime =
    parsedEndTime !== null
      ? parsedEndTime
      : rawEndTime.trim() === ''
        ? ''
        : form.endTime

  const endDate =
    parsedEndDate !== null ? parsedEndDate : form.endDate

  eventDebugLog('syncEventFormFromDom: raw DOM', {
    rawStartDate,
    rawEndDate,
    rawStartTime,
    rawEndTime,
    parsedStartTime,
    parsedEndTime,
  })

  return normalizeTimedForm({
    ...form,
    startDate,
    endDate,
    startTime,
    endTime,
  })
}

export interface EventFormRawInputs {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
}

export interface EventFormValidationResult {
  error: string | null
  field?: 'title' | 'startDate' | 'startTime' | 'endDate' | 'endTime'
  snapshot?: string
}

function formatTimeLabel(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time
  const period = hour < 12 ? '오전' : '오후'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${period} ${hour12}:${String(minute).padStart(2, '0')}`
}

function formatDateLabel(date: string) {
  const matched = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return date
  return `${matched[1]}년 ${Number(matched[2])}월 ${Number(matched[3])}일`
}

function formatRawDateField(label: string, raw: string, parsed: string | null) {
  const trimmed = raw.trim()
  if (!trimmed) return `${label}: (비어 있음)`
  if (parsed === null) return `${label}: "${trimmed}" (날짜 형식 오류)`
  return `${label}: ${formatDateLabel(parsed)}`
}

function formatRawTimeField(label: string, raw: string, parsed: string | null) {
  const trimmed = raw.trim()
  if (!trimmed) return `${label}: (비어 있음)`
  if (parsed === null) return `${label}: "${trimmed}" (시간 형식 오류)`
  return `${label}: ${formatTimeLabel(parsed)} (${parsed})`
}

/** 폼에 입력된 값 요약 (오류 안내용) */
export function formatEventFormSnapshot(
  form: {
    title?: string
    allDay: boolean
    startDate: string
    startTime: string
    endDate: string
    endTime: string
  },
  raw?: EventFormRawInputs,
): string {
  const lines: string[] = []

  if (form.title !== undefined) {
    lines.push(`제목: ${form.title.trim() ? `"${form.title.trim()}"` : '(비어 있음)'}`)
  }

  if (form.allDay) {
    const startRaw = raw?.startDate ?? form.startDate
    const endRaw = raw?.endDate ?? form.endDate
    lines.push(
      formatRawDateField('시작일', startRaw, parseDateInput(startRaw) ?? (form.startDate ? form.startDate : null)),
    )
    lines.push(
      endRaw.trim() || form.endDate
        ? formatRawDateField('종료일', endRaw, parseDateInput(endRaw) ?? (form.endDate ? form.endDate : null))
        : '종료일: (비어 있음 — 하루 일정)',
    )
    return lines.join('\n')
  }

  const startDateRaw = raw?.startDate ?? form.startDate
  const startTimeRaw = raw?.startTime ?? form.startTime
  const endDateRaw = raw?.endDate ?? form.endDate
  const endTimeRaw = raw?.endTime ?? form.endTime

  lines.push(
    formatRawDateField(
      '시작일',
      startDateRaw,
      parseDateInput(startDateRaw) ?? (form.startDate ? form.startDate : null),
    ),
  )
  lines.push(
    formatRawTimeField(
      '시작 시간',
      startTimeRaw,
      parseTimeInput(startTimeRaw) ?? (form.startTime ? form.startTime : null),
    ),
  )
  lines.push(
    endDateRaw.trim() || form.endDate
      ? formatRawDateField(
          '종료일',
          endDateRaw,
          parseDateInput(endDateRaw) ?? (form.endDate ? form.endDate : null),
        )
      : '종료일: (비어 있음 — 시작일과 동일하게 처리)',
  )
  lines.push(
    endTimeRaw.trim() || form.endTime
      ? formatRawTimeField(
          '종료 시간',
          endTimeRaw,
          parseTimeInput(endTimeRaw) ?? (form.endTime ? form.endTime : null),
        )
      : '종료 시간: (비어 있음)',
  )

  const { start, end } = buildTimedEventRange(form)
  if (start) {
    lines.push(`→ 해석된 시작: ${formatDateLabel(start.slice(0, 10))} ${formatTimeLabel(start.slice(11, 16))}`)
  }
  if (end) {
    lines.push(`→ 해석된 종료: ${formatDateLabel(end.slice(0, 10))} ${formatTimeLabel(end.slice(11, 16))}`)
  }

  return lines.join('\n')
}

export function readEventFormRawInputs(formEl: HTMLFormElement): EventFormRawInputs {
  return {
    startDate: readFormInput(formEl, 'startDate'),
    startTime: readFormInput(formEl, 'startTime'),
    endDate: readFormInput(formEl, 'endDate'),
    endTime: readFormInput(formEl, 'endTime'),
  }
}

function isValidDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

/** YYYY-MM-DD, YYYY.M.D, YYYY/M/D 등 파싱 */
export function parseDateInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const matched = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (!matched) return null

  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])
  if (!isValidDate(year, month, day)) return null

  return `${year}-${pad(month)}-${pad(day)}`
}

function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

/**
 * 같은 날 종료 시간 해석 — 1:00을 11:40 시작 뒤면 13:00(오후 1시)로 처리
 * (12시간제 숫자만 입력한 경우)
 */
export function inferEndTime24h(startTime: string, endTime: string): string {
  const start = parseTimeInput(startTime)
  const end = parseTimeInput(endTime)
  if (!start || !end) return endTime

  if (timeToMinutes(end) > timeToMinutes(start)) {
    eventDebugLog('inferEndTime24h: 변경 없음 (이미 시작 이후)', { start, end })
    return end
  }

  const [endHour, endMinute] = end.split(':').map(Number)
  if (endHour >= 1 && endHour <= 11) {
    const pmTime = `${pad(endHour + 12)}:${pad(endMinute)}`
    if (timeToMinutes(pmTime) > timeToMinutes(start)) {
      eventDebugLog('inferEndTime24h: 오후로 보정', {
        start,
        endBefore: end,
        endAfter: pmTime,
      })
      return pmTime
    }
  }

  eventDebugLog('inferEndTime24h: 보정 실패', { start, end })
  return end
}

/** HH:mm 파싱 — 24시간·오전/오후·am/pm 지원 */
export function parseTimeInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const korean = trimmed.match(/^(오전|오후)\s*(\d{1,2}):(\d{1,2})$/i)
  if (korean) {
    const period = korean[1]
    let hour = Number(korean[2])
    const minute = Number(korean[3])
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null
    if (period === '오후' && hour < 12) hour += 12
    if (period === '오전' && hour === 12) hour = 0
    return `${pad(hour)}:${pad(minute)}`
  }

  const english = trimmed.match(/^(\d{1,2}):(\d{1,2})\s*(am|pm)$/i)
  if (english) {
    let hour = Number(english[1])
    const minute = Number(english[2])
    const period = english[3].toLowerCase()
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null
    if (period === 'pm' && hour < 12) hour += 12
    if (period === 'am' && hour === 12) hour = 0
    return `${pad(hour)}:${pad(minute)}`
  }

  const matched = trimmed.match(/^(\d{1,2}):(\d{1,2})$/)
  if (!matched) return null

  const hour = Number(matched[1])
  const minute = Number(matched[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

  return `${pad(hour)}:${pad(minute)}`
}

/** 일정 폼 날짜·시간 유효성 검사 */
export function validateEventForm(
  form: {
    title?: string
    allDay: boolean
    startDate: string
    startTime: string
    endDate: string
    endTime: string
  },
  raw?: EventFormRawInputs,
): EventFormValidationResult {
  eventDebugLog('validateEventForm: 시작', { form, raw })

  const withSnapshot = (
    result: Omit<EventFormValidationResult, 'snapshot'>,
    source?: string,
  ): EventFormValidationResult => {
    const out: EventFormValidationResult = {
      ...result,
      snapshot: formatEventFormSnapshot(
        form.allDay ? form : normalizeTimedForm(form),
        raw,
      ),
    }
    if (result.error && source) {
      eventDebugLog(`validateEventForm: 실패 [${source}]`, {
        field: result.field,
        error: result.error,
        snapshot: out.snapshot,
      })
    }
    return out
  }

  if (!form.title?.trim()) {
    return withSnapshot({ error: '제목을 입력해 주세요.', field: 'title' }, 'title')
  }

  if (!form.startDate.trim()) {
    return withSnapshot(
      { error: '시작일을 선택해 주세요.', field: 'startDate' },
      'startDate',
    )
  }

  if (form.allDay) {
    if (form.endDate && form.endDate < form.startDate) {
      return withSnapshot(
        {
          error: '종료일은 시작일과 같거나 이후여야 합니다.',
          field: 'endDate',
        },
        'allDay-endDate',
      )
    }
    eventDebugLog('validateEventForm: 통과 [allDay]')
    return { error: null }
  }

  const normalized = normalizeTimedForm(form)
  const rawStartTime = (raw?.startTime ?? normalized.startTime).trim()
  if (!rawStartTime) {
    return withSnapshot(
      { error: '시작 시간을 입력해 주세요.', field: 'startTime' },
      'startTime-empty',
    )
  }
  if (parseTimeInput(rawStartTime) === null) {
    return withSnapshot(
      {
        error: `시작 시간 형식이 올바르지 않습니다. 입력값: "${rawStartTime}" (예: 11:40)`,
        field: 'startTime',
      },
      'startTime-format',
    )
  }

  const rawEndTime = (raw?.endTime ?? normalized.endTime).trim()
  if (rawEndTime && parseTimeInput(rawEndTime) === null) {
    return withSnapshot(
      {
        error: `종료 시간 형식이 올바르지 않습니다. 입력값: "${rawEndTime}" (예: 13:00 또는 오후 1:00)`,
        field: 'endTime',
      },
      'endTime-format',
    )
  }

  const { start, end } = buildTimedEventRange(normalized)
  const startMs = toLocalDateTimeMs(start)
  const endMs = end ? toLocalDateTimeMs(end) : null

  if (Number.isNaN(startMs)) {
    return withSnapshot(
      { error: '시작 일시 형식이 올바르지 않습니다.', field: 'startDate' },
      'start-datetime',
    )
  }

  if (end) {
    if (Number.isNaN(endMs!)) {
      return withSnapshot(
        { error: '종료 일시 형식이 올바르지 않습니다.', field: 'endDate' },
        'end-datetime',
      )
    }
    if (endMs! <= startMs) {
      const endParts = splitLocalDateTime(end)
      const startParts = splitLocalDateTime(start)
      const sameDay = endParts.date === startParts.date

      eventDebugLog('validateEventForm: 시간 비교 실패 [CLIENT]', {
        start,
        end,
        startMs,
        endMs,
        sameDay,
        startParts,
        endParts,
      })

      if (sameDay) {
        return withSnapshot(
          {
            error: `종료 시간(${formatTimeLabel(endParts.time)})은 시작 시간(${formatTimeLabel(startParts.time)})보다 늦어야 합니다.`,
            field: 'endTime',
          },
          'CLIENT-sameDay-timeOrder',
        )
      }

      return withSnapshot(
        {
          error: `종료일(${endParts.date})이 시작일(${startParts.date})보다 이르거나, 같은 날이라면 종료 시간이 더 늦어야 합니다.`,
          field: 'endDate',
        },
        'CLIENT-crossDay-order',
      )
    }
  }

  eventDebugLog('validateEventForm: 통과 [CLIENT]', { start, end, startMs, endMs })
  return { error: null }
}

/** 고유 일정 ID 생성 */
export function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
