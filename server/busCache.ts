import {
  API_CALLS_PER_REFRESH,
  CACHE_TTL_MS,
  DAILY_API_LIMIT,
} from './busConfig.js'
import { fetchBusArrival, type BusArrivalItem } from './seoulBus.js'

interface QuotaState {
  date: string
  used: number
}

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
  quota: {
    used: number
    limit: number
    remaining: number
  }
}

const cacheByStop = new Map<string, CacheEntry>()
let quota: QuotaState = { date: '', used: 0 }

function getKstDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(new Date())
}

function resetQuotaIfNeeded() {
  const today = getKstDateKey()
  if (quota.date !== today) {
    quota = { date: today, used: 0 }
  }
}

function getQuotaSnapshot() {
  resetQuotaIfNeeded()
  return {
    used: quota.used,
    limit: DAILY_API_LIMIT,
    remaining: Math.max(0, DAILY_API_LIMIT - quota.used),
  }
}

function buildPayload(
  stopId: string,
  stop: BusArrivalItem,
  fetchedAt: number,
  cached: boolean,
): BusArrivalsPayload {
  return {
    updatedAt: new Date(fetchedAt).toISOString(),
    stop,
    stopId,
    cached,
    nextRefreshAt: new Date(fetchedAt + CACHE_TTL_MS).toISOString(),
    refreshIntervalSec: Math.round(CACHE_TTL_MS / 1000),
    quota: getQuotaSnapshot(),
  }
}

/** 정류장별 캐시 — 선택한 정류장만 API 호출 */
export async function getBusArrivalsWithCache(
  stopId: string,
  serviceKey: string,
): Promise<BusArrivalsPayload> {
  resetQuotaIfNeeded()

  const cachedEntry = cacheByStop.get(stopId)
  if (cachedEntry && Date.now() - cachedEntry.fetchedAt < CACHE_TTL_MS) {
    return buildPayload(stopId, cachedEntry.stop, cachedEntry.fetchedAt, true)
  }

  const remaining = DAILY_API_LIMIT - quota.used
  if (remaining < API_CALLS_PER_REFRESH) {
    if (cachedEntry) {
      return buildPayload(
        stopId,
        cachedEntry.stop,
        cachedEntry.fetchedAt,
        true,
      )
    }
    throw new Error('오늘 API 호출 한도(1000회)를 모두 사용했습니다.')
  }

  const stop = await fetchBusArrival(stopId, serviceKey)
  const fetchedAt = Date.now()

  cacheByStop.set(stopId, { stop, fetchedAt })
  quota.used += API_CALLS_PER_REFRESH

  return buildPayload(stopId, stop, fetchedAt, false)
}
