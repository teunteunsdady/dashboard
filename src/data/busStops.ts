/** 클라이언트용 정류장 목록 (표시·선택 전용) */
export interface BusStopOption {
  id: string
  routeNumber: string
  name: string
  /** 출퇴근 방향 (쩐 / 집 등) */
  travelDirection: string
  accent: string
  accentText: string
}

export const routeColors: Record<
  string,
  { accent: string; accentText: string }
> = {
  '1131': { accent: '#84CC16', accentText: '#14532D' },
  '147': { accent: '#3B82F6', accentText: '#FFFFFF' },
}

export const busStopOptions: BusStopOption[] = [
  {
    id: '1131-wolgye',
    routeNumber: '1131',
    name: '월계삼호4차 아파트',
    travelDirection: '쩐',
    accent: routeColors['1131'].accent,
    accentText: routeColors['1131'].accentText,
  },
  {
    id: '1131-hagye',
    routeNumber: '1131',
    name: '노원구민의 전당',
    travelDirection: '집',
    accent: routeColors['1131'].accent,
    accentText: routeColors['1131'].accentText,
  },
  {
    id: '147-deer',
    routeNumber: '147',
    name: '월계보건지소',
    travelDirection: '집',
    accent: routeColors['147'].accent,
    accentText: routeColors['147'].accentText,
  },
]

export const DEFAULT_BUS_STOP_ID = busStopOptions[0].id

export function getBusStopOption(id: string) {
  return busStopOptions.find((stop) => stop.id === id)
}

export function formatStopDisplayName(name: string): string {
  return name.replace(/\s+/g, '')
}

export function stopDisplayName(option: BusStopOption) {
  return formatStopDisplayName(option.name)
}

export function stopOptionLabel(option: BusStopOption) {
  return `${option.routeNumber} - ${stopDisplayName(option)}`
}
