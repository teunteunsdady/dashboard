import { useCallback, useEffect, useRef, useState } from 'react'
import { BUS_CLIENT_POLL_MS } from '../constants/bus'
import {
  BusFetchError,
  fetchBusArrival,
  type BusArrivalItem,
  type BusArrivalsResponse,
} from '../services/busService'

function secondsUntil(iso: string | null) {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000))
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** 선택한 정류장만 갱신하는 버스 도착 정보 훅 */
export function useBusArrivals(stopId: string) {
  const [stop, setStop] = useState<BusArrivalItem | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [nextRefreshAt, setNextRefreshAt] = useState<string | null>(null)
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(0)
  const [cached, setCached] = useState(false)
  const [quota, setQuota] = useState({ used: 0, limit: 1000, remaining: 1000 })
  const [quotaExhausted, setQuotaExhausted] = useState(false)
  const [quotaGlobal, setQuotaGlobal] = useState(true)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const visibleRef = useRef(true)
  const hasDataRef = useRef(false)

  const applyResponse = useCallback((data: BusArrivalsResponse) => {
    setStop(data.stop)
    setUpdatedAt(data.updatedAt)
    setNextRefreshAt(data.nextRefreshAt)
    setRefreshIntervalSec(data.refreshIntervalSec)
    setCached(data.cached)
    setQuota(data.quota)
    setQuotaExhausted(data.quotaExhausted ?? data.quota.remaining <= 0)
    setQuotaGlobal(data.quotaGlobal !== false)
    setSecondsLeft(secondsUntil(data.nextRefreshAt))
    hasDataRef.current = true
  }, [])

  const load = useCallback(
    async (manual = false) => {
      if (!stopId) return

      if (manual) setRefreshing(true)
      else if (!hasDataRef.current) setLoading(true)

      setError(null)

      try {
        const data = await fetchBusArrival(stopId, { force: manual })
        applyResponse(data)
      } catch (err) {
        if (err instanceof BusFetchError && err.quota) {
          setQuota(err.quota)
          setQuotaExhausted(err.quota.remaining <= 0)
        }
        setError(
          err instanceof Error
            ? err.message
            : '버스 도착 정보를 불러오지 못했습니다.',
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [applyResponse, stopId],
  )

  useEffect(() => {
    hasDataRef.current = false
    setStop(null)
    setLoading(true)
  }, [stopId])

  useEffect(() => {
    const onVisibility = () => {
      visibleRef.current = document.visibilityState === 'visible'
      if (visibleRef.current) load()
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [load])

  useEffect(() => {
    load()

    const pollTimer = window.setInterval(() => {
      if (visibleRef.current) load()
    }, BUS_CLIENT_POLL_MS)

    return () => window.clearInterval(pollTimer)
  }, [load])

  useEffect(() => {
    const tick = window.setInterval(() => {
      setSecondsLeft(secondsUntil(nextRefreshAt))
    }, 1000)

    return () => window.clearInterval(tick)
  }, [nextRefreshAt])

  return {
    stop,
    updatedAt,
    refreshIntervalSec,
    cached,
    quota,
    quotaExhausted,
    quotaGlobal,
    secondsLeft,
    countdownLabel: formatCountdown(secondsLeft),
    loading,
    refreshing,
    error,
    refresh: () => load(true),
  }
}
