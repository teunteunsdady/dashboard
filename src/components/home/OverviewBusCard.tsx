import { Link } from 'react-router-dom'
import type { BusArrivalItem } from '../../services/busService'
import {
  formatStopDisplayName,
  getBusStopOption,
  routeColors,
} from '../../data/busStops'
import { Card } from '../ui/Card'

interface OverviewBusCardProps {
  stopId: string
  stop: BusArrivalItem | null
  loading: boolean
  error: string | null
  updatedAt: string | null
  onRefresh: () => void
  refreshing: boolean
}

function formatUpdatedAt(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 홈 Overview — 버스 도착 요약 */
export function OverviewBusCard({
  stopId,
  stop,
  loading,
  error,
  updatedAt,
  onRefresh,
  refreshing,
}: OverviewBusCardProps) {
  const option = getBusStopOption(stopId)
  const colors = routeColors[option?.routeNumber ?? '147'] ?? routeColors['147']
  const updatedLabel = formatUpdatedAt(updatedAt)

  return (
    <Card className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            버스
          </p>
          <h2 className="text-lg font-semibold text-text-primary">
            {option ? formatStopDisplayName(option.name) : '도착 정보'}
          </h2>
          {option && (
            <p className="mt-0.5 text-xs text-text-secondary">
              {option.routeNumber}번 · {option.travelDirection}
              {updatedLabel ? ` · ${updatedLabel} 기준` : ''}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || loading}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-main/25 hover:text-main disabled:opacity-50"
            aria-label="새로고침"
          >
            {refreshing ? '…' : '↻'}
          </button>
          <Link
            to="/bus"
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-main/25 hover:text-main"
          >
            전체
          </Link>
        </div>
      </div>

      {loading && !stop ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-main/20 border-t-main" />
        </div>
      ) : error && !stop ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-600">
          {error}
        </p>
      ) : stop ? (
        <div className="mt-auto space-y-3">
          <div
            className="rounded-xl px-4 py-3"
            style={{ backgroundColor: `${colors.accent}22` }}
          >
            <p className="text-xs font-medium text-text-secondary">첫 번째</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{stop.arrival1}</p>
          </div>
          <p className="text-sm text-text-secondary">
            두 번째 <span className="font-semibold text-text-primary">{stop.arrival2}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">도착 정보가 없습니다.</p>
      )}
    </Card>
  )
}
