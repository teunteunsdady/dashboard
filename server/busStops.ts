/** 고정 버스 정류장 설정 (서울시 ARS ID) */
export interface BusStopConfig {
  id: string
  arsId: string
  name: string
  routeNumber: string
  /** 출퇴근 방향 (쩐 / 집 등) */
  travelDirection: string
  /** 화면에 보여줄 방면 (사용자 기준) */
  directionLabel: string
  /** API adirection 필드와 매칭할 종점명 */
  apiDirection: string
}

export const busStops: BusStopConfig[] = [
  {
    id: '1131-wolgye',
    arsId: '11323',
    name: '월계삼호4차 아파트',
    routeNumber: '1131',
    travelDirection: '쩐',
    directionLabel: '월계역',
    apiDirection: '중계본동',
  },
  {
    id: '1131-hagye',
    arsId: '11367',
    name: '노원구민의 전당',
    routeNumber: '1131',
    travelDirection: '집',
    directionLabel: '하계역',
    apiDirection: '석계역',
  },
  {
    id: '147-deer',
    arsId: '11339',
    name: '월계보건지소',
    routeNumber: '147',
    travelDirection: '집',
    directionLabel: '월계사슴아파트2단지',
    apiDirection: '월계동',
  },
]
