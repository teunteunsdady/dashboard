import { useState } from 'react'
import { BusStopPicker } from '../components/bus/BusStopPicker'
import { DEFAULT_BUS_STOP_ID, formatStopDisplayName, routeColors } from '../data/busStops'
import { useBusArrivals } from '../hooks/useBusArrivals'
import type { BusArrivalItem } from '../services/busService'

const STORAGE_KEY = 'bus-selected-stop'

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={['h-4 w-4', spinning ? 'animate-spin' : ''].join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M20 12a8 8 0 1 1-2.08-5.39" />
      <path d="M20 4v6h-6" />
    </svg>
  )
}

function formatUpdatedAt(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StopDetail({ stop }: { stop: BusArrivalItem }) {
  const colors = routeColors[stop.routeNumber] ?? routeColors['147']

  return (
    <article className="overflow-hidden rounded-2xl border border-border/80 bg-surface-card shadow-card">
      <div className="h-1.5" style={{ backgroundColor: colors.accent }} />
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex rounded-full px-3 py-1 text-sm font-bold"
            style={{
              backgroundColor: colors.accent,
              color: colors.accentText,
            }}
          >
            {stop.routeNumber}번
          </span>
          <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-main">
            {stop.travelDirection} 방향
          </span>
          <span className="text-sm text-text-secondary">
            {stop.routeDirection} 종점
          </span>
        </div>

        <h2 className="mt-4 text-2xl font-bold leading-snug text-text-primary">
          {formatStopDisplayName(stop.stopName)}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">ARS {stop.arsId}</p>

        <div className="mt-6 space-y-3">
          <div className="rounded-2xl bg-surface px-4 py-4">
            <p className="text-xs font-medium text-text-secondary">첫 번째 버스</p>
            <p className="mt-2 text-2xl font-bold leading-tight text-text-primary">
              {stop.arrival1}
            </p>
          </div>
          <div className="rounded-2xl bg-surface px-4 py-4">
            <p className="text-xs font-medium text-text-secondary">두 번째 버스</p>
            <p className="mt-2 text-xl font-semibold leading-tight text-text-primary">
              {stop.arrival2}
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}

/** 버스 도착 정보 — 모바일 전용 페이지 */
export function BusPage() {
  const [selectedId, setSelectedId] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_BUS_STOP_ID,
  )

  const {
    stop,
    updatedAt,
    refreshIntervalSec,
    cached,
    quota,
    quotaExhausted,
    countdownLabel,
    loading,
    refreshing,
    error,
    refresh,
  } = useBusArrivals(selectedId)

  const refreshMinutes = Math.max(1, Math.round(refreshIntervalSec / 60))

  const handleSelect = (id: string) => {
    setSelectedId(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border bg-surface-card px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              버스
            </h1>
            <p className="mt-0.5 truncate text-xs text-text-secondary">
              {updatedAt ? `${formatUpdatedAt(updatedAt)} 기준` : '불러오는 중'}
              {cached ? ' · 캐시' : ' · 갱신됨'}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/80 bg-surface text-text-secondary transition-colors hover:border-main/25 hover:bg-main/5 hover:text-main active:bg-main/10 disabled:opacity-45"
            aria-label="새로고침"
          >
            <RefreshIcon spinning={refreshing} />
          </button>
        </div>

        <div className="mt-3">
          <BusStopPicker value={selectedId} onChange={handleSelect} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
          <span className="rounded-full border border-border/70 bg-surface px-2.5 py-1">
            선택 정류장만 갱신
          </span>
          <span className="rounded-full border border-border/70 bg-surface px-2.5 py-1">
            약 {refreshMinutes}분마다
          </span>
          <span className="rounded-full border border-border/70 bg-surface px-2.5 py-1">
            다음 {countdownLabel}
          </span>
          <span
            className={[
              'rounded-full border px-2.5 py-1',
              quotaExhausted
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : quota.remaining <= 50
                  ? 'border-orange-200 bg-orange-50 text-orange-800'
                  : 'border-border/70 bg-surface',
            ].join(' ')}
          >
            오늘 {quota.used}/{quota.limit}회 · 남음 {quota.remaining}
          </span>
        </div>
        {quotaExhausted && (
          <p className="mt-2 text-[11px] leading-relaxed text-amber-800">
            오늘 API 한도에 도달했습니다. 캐시된 정보가 있으면 표시되며, 자정(KST) 이후 다시
            조회됩니다.
          </p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading && !stop ? (
          <div className="flex min-h-[50dvh] items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-main/20 border-t-main" />
          </div>
        ) : error && !stop ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5">
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
              {error.includes('SEOUL_BUS_API_KEY') ? (
                <>
                  배포 사이트(Vercel)에서는 프로젝트 Settings → Environment
                  Variables에 <code className="text-xs">SEOUL_BUS_API_KEY</code>
                  를 등록한 뒤 재배포해 주세요. 로컬에서는{' '}
                  <code className="text-xs">.env</code>에 키를 넣고 개발 서버를
                  다시 시작하면 됩니다.
                </>
              ) : error.includes('한도') ? (
                '오늘은 더 이상 새로고침할 수 없습니다. 자정(KST) 이후 다시 시도해 주세요.'
              ) : (
                '잠시 후 새로고침해 보세요.'
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                {error}
              </div>
            )}

            {stop && <StopDetail stop={stop} />}
          </div>
        )}
      </div>
    </div>
  )
}
