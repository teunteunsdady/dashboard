import { busStops, type BusStopConfig } from './busStops.js'

const SEOUL_BUS_BASE = 'http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid'

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

interface SeoulRouteItem {
  rtNm?: string
  busRouteAbrv?: string
  adirection?: string
  arrmsg1?: string
  arrmsg2?: string
}

function normalizeItemList(body: Record<string, unknown>): SeoulRouteItem[] {
  const itemList = (body.msgBody as { itemList?: SeoulRouteItem | SeoulRouteItem[] })
    ?.itemList

  if (!itemList) return []
  return Array.isArray(itemList) ? itemList : [itemList]
}

function matchesRoute(item: SeoulRouteItem, routeNumber: string) {
  const routeText = `${item.rtNm ?? ''} ${item.busRouteAbrv ?? ''}`
  return routeText.includes(routeNumber)
}

function matchesDirection(item: SeoulRouteItem, apiDirection: string) {
  return (item.adirection ?? '').includes(apiDirection)
}

function pickRouteItem(items: SeoulRouteItem[], stop: BusStopConfig) {
  const routeItems = items.filter((item) => matchesRoute(item, stop.routeNumber))
  if (routeItems.length === 0) return undefined
  if (routeItems.length === 1) return routeItems[0]

  return routeItems.find((item) => matchesDirection(item, stop.apiDirection))
}

function toArrivalItem(
  stop: BusStopConfig,
  matched: SeoulRouteItem | undefined,
): BusArrivalItem {
  return {
    id: stop.id,
    arsId: stop.arsId,
    stopName: stop.name,
    routeNumber: stop.routeNumber,
    directionLabel: `${stop.routeNumber} · ${stop.directionLabel}방면`,
    routeDirection: matched?.adirection ?? stop.directionLabel,
    travelDirection: stop.travelDirection,
    arrival1: matched?.arrmsg1?.trim() || '도착 정보 없음',
    arrival2: matched?.arrmsg2?.trim() || '-',
  }
}

export function getBusStopConfig(stopId: string): BusStopConfig {
  const stop = busStops.find((item) => item.id === stopId)
  if (!stop) {
    throw new Error('유효하지 않은 정류장입니다.')
  }
  return stop
}

async function fetchStationItems(arsId: string, serviceKey: string) {
  const url = new URL(SEOUL_BUS_BASE)
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('arsId', arsId)
  url.searchParams.set('resultType', 'json')

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`서울시 버스 API 오류 (${response.status})`)
  }

  const data = (await response.json()) as Record<string, unknown>
  const header = data.msgHeader as { headerCd?: string; headerMsg?: string } | undefined

  if (header?.headerCd && header.headerCd !== '0') {
    throw new Error(header.headerMsg ?? '버스 정보를 가져오지 못했습니다.')
  }

  return normalizeItemList(data)
}

/** 선택한 정류장 1곳만 API 호출 후 해당 노선 도착 정보만 반환 */
export async function fetchBusArrival(
  stopId: string,
  serviceKey: string,
): Promise<BusArrivalItem> {
  const stop = getBusStopConfig(stopId)
  const items = await fetchStationItems(stop.arsId, serviceKey)
  const matched = pickRouteItem(items, stop)
  return toArrivalItem(stop, matched)
}
