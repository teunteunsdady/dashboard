import { supabase } from '../lib/supabase'
import {
  DEFAULT_BUS_ALARM_SETTINGS,
  type BusAlarmDay,
  type BusAlarmSettings,
} from '../types/busAlarm'

function isBusAlarmDay(value: number): value is BusAlarmDay {
  return value >= 0 && value <= 6
}

function rowToSettings(row: Record<string, unknown>): BusAlarmSettings {
  const days = Array.isArray(row.days)
    ? row.days.filter((d): d is BusAlarmDay => typeof d === 'number' && isBusAlarmDay(d))
    : DEFAULT_BUS_ALARM_SETTINGS.days

  return {
    enabled: Boolean(row.enabled),
    days: days.length > 0 ? days : DEFAULT_BUS_ALARM_SETTINGS.days,
    thresholdMinutes:
      typeof row.threshold_minutes === 'number'
        ? row.threshold_minutes
        : DEFAULT_BUS_ALARM_SETTINGS.thresholdMinutes,
    autoStop:
      typeof row.auto_stop === 'boolean'
        ? row.auto_stop
        : DEFAULT_BUS_ALARM_SETTINGS.autoStop,
    stopId:
      typeof row.stop_id === 'string'
        ? row.stop_id
        : DEFAULT_BUS_ALARM_SETTINGS.stopId,
    morningStart:
      typeof row.morning_start === 'number'
        ? row.morning_start
        : DEFAULT_BUS_ALARM_SETTINGS.morningStart,
    morningEnd:
      typeof row.morning_end === 'number'
        ? row.morning_end
        : DEFAULT_BUS_ALARM_SETTINGS.morningEnd,
    eveningStart:
      typeof row.evening_start === 'number'
        ? row.evening_start
        : DEFAULT_BUS_ALARM_SETTINGS.eveningStart,
    eveningEnd:
      typeof row.evening_end === 'number'
        ? row.evening_end
        : DEFAULT_BUS_ALARM_SETTINGS.eveningEnd,
  }
}

function settingsToRow(userId: string, settings: BusAlarmSettings) {
  return {
    user_id: userId,
    enabled: settings.enabled,
    days: settings.days,
    threshold_minutes: settings.thresholdMinutes,
    auto_stop: settings.autoStop,
    stop_id: settings.stopId,
    morning_start: settings.morningStart,
    morning_end: settings.morningEnd,
    evening_start: settings.eveningStart,
    evening_end: settings.eveningEnd,
    updated_at: new Date().toISOString(),
  }
}

/** 서버(Web Push)용 버스 알림 설정 조회 */
export async function fetchBusAlarmSettings(
  userId: string,
): Promise<BusAlarmSettings | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('bus_alarm_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return rowToSettings(data as Record<string, unknown>)
}

/** 서버(Web Push)용 버스 알림 설정 저장 */
export async function upsertBusAlarmSettings(
  userId: string,
  settings: BusAlarmSettings,
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase가 설정되지 않았습니다.')
  }

  const { error } = await supabase
    .from('bus_alarm_settings')
    .upsert(settingsToRow(userId, settings), { onConflict: 'user_id' })

  if (error) {
    if (error.message.includes('bus_alarm_settings')) {
      throw new Error(
        '버스 알림 테이블이 DB에 없습니다. supabase/migrations/20260706_bus_alarm_push.sql 을 실행해 주세요.',
      )
    }
    throw new Error(error.message || '버스 알림 설정을 저장하지 못했습니다.')
  }
}
