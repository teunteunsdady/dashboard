import {
  API_CALLS_PER_REFRESH,
  CACHE_TTL_MS,
} from './busConfig.js'
import {
  getBusApiQuota,
  reserveBusApiCalls,
  type QuotaSnapshot,
} from './busQuota.js'
import { fetchBusArrival, type BusArrivalItem } from './seoulBus.js'

interface CacheEntry {
  stop: BusArrivalItem
  fetchedAt: number
}

export interface BusArrivalsPayload {
  updatedAt: string
  stop: BusArrivalItem
  stopId: string
  cached: boolean
  nextRefreshAt: string
  refreshIntervalSec: number
  quota: QuotaSnapshot
  quotaExhausted: boolean
  /** false면 Vercel 인스턴스 메모리만 집계 중 */
  quotaGlobal: boolean
}

export class BusQuotaExhaustedError extends Error {
  quota: QuotaSnapshot

  constructor(quota: QuotaSnapshot) {
    super('오늘 API 호출 한도(1000회)를 모두 사용했습니다.')
    this.name = 'BusQuotaExhaustedError'
    this.quota = quota
  }
}

const cacheByStop = new Map<string, CacheEntry>()

function buildPayload(
  stopId: string,
  stop: BusArrivalItem,
  fetchedAt: number,
  cached: boolean,
  quota: QuotaSnapshot,
  quotaExhausted: boolean,
  quotaGlobal: boolean,
): BusArrivalsPayload {
  return {
    updatedAt: new Date(fetchedAt).toISOString(),
    stop,
    stopId,
    cached,
    nextRefreshAt: new Date(fetchedAt + CACHE_TTL_MS).toISOString(),
    refreshIntervalSec: Math.round(CACHE_TTL_MS / 1000),
    quota,
    quotaExhausted,
    quotaGlobal,
  }
}

export interface BusArrivalsOptions {
  /** true면 서버 캐시 무시 — 수동 새로고침·API 1회 소모 */
  bypassCache?: boolean
}

/** 정류장별 캐시 — 선택한 정류장만 API 호출, 일일 한도는 Supabase 전역 집계 */
export async function getBusArrivalsWithCache(
  stopId: string,
  serviceKey: string,
  options: BusArrivalsOptions = {},
): Promise<BusArrivalsPayload> {
  const cachedEntry = cacheByStop.get(stopId)
  const cacheFresh =
    !options.bypassCache &&
    cachedEntry &&
    Date.now() - cachedEntry.fetchedAt < CACHE_TTL_MS

  if (cacheFresh && cachedEntry) {
    const quotaState = await getBusApiQuota()
    return buildPayload(
      stopId,
      cachedEntry.stop,
      cachedEntry.fetchedAt,
      true,
      quotaState,
      quotaState.remaining <= 0,
      quotaState.global,
    )
  }

  const reserve = await reserveBusApiCalls(API_CALLS_PER_REFRESH)

  if (!reserve.allowed) {
    if (cachedEntry) {
      return buildPayload(
        stopId,
        cachedEntry.stop,
        cachedEntry.fetchedAt,
        true,
        reserve.quota,
        true,
        reserve.global,
      )
    }
    throw new BusQuotaExhaustedError(reserve.quota)
  }

  const stop = await fetchBusArrival(stopId, serviceKey)
  const fetchedAt = Date.now()

  cacheByStop.set(stopId, { stop, fetchedAt })

  return buildPayload(
    stopId,
    stop,
    fetchedAt,
    false,
    reserve.quota,
    reserve.quota.remaining <= 0,
    reserve.global,
  )
}
