export interface BusArrivalItem {
  id: string
  arsId: string
  stopName: string
  routeNumber: string
  directionLabel: string
  routeDirection: string
  travelDirection: string
  arrival1: string
  arrival2: string
}

export interface BusArrivalsResponse {
  updatedAt: string
  stop: BusArrivalItem
  stopId: string
  cached: boolean
  nextRefreshAt: string
  refreshIntervalSec: number
  quota: {
    used: number
    limit: number
    remaining: number
  }
}

/** 선택한 정류장 도착 정보 조회 */
export async function fetchBusArrival(
  stopId: string,
): Promise<BusArrivalsResponse> {
  const response = await fetch(
    `/api/bus/arrivals?stopId=${encodeURIComponent(stopId)}`,
  )

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? '버스 도착 정보를 불러오지 못했습니다.')
  }

  return response.json() as Promise<BusArrivalsResponse>
}
