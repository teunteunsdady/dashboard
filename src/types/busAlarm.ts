/** 버스 도착 알림 설정 */

export type BusAlarmDay = 0 | 1 | 2 | 3 | 4 | 5 | 6 // Sun=0 … Sat=6

export interface BusAlarmSettings {
  enabled: boolean
  /** 알림 요일 (기본: 수·일) */
  days: BusAlarmDay[]
  /** N분 이내 도착 시 알림 */
  thresholdMinutes: number
  /** 자동 정류장 (출근 7–10 쩐 / 퇴근 17–21 집) */
  autoStop: boolean
  /** autoStop=false 일 때 사용할 정류장 */
  stopId: string
  morningStart: number
  morningEnd: number
  eveningStart: number
  eveningEnd: number
}

export const DEFAULT_BUS_ALARM_SETTINGS: BusAlarmSettings = {
  enabled: false,
  days: [0, 3],
  thresholdMinutes: 5,
  autoStop: true,
  stopId: '1131-wolgye',
  morningStart: 7,
  morningEnd: 10,
  eveningStart: 17,
  eveningEnd: 21,
}

export const BUS_ALARM_DAY_LABELS: Record<BusAlarmDay, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
}
