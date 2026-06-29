import { Link } from 'react-router-dom'
import { formatKrw, formatMonthKey, formatMonthLabel } from '../../utils/ledgerUtils'
import { Card } from '../ui/Card'

interface OverviewLedgerCardProps {
  income: number
  expense: number
  balance: number
  loading: boolean
  error: string | null
  overBudget: boolean
  month?: string
}

/** 홈 Overview — 이번 달 가계부 요약 */
export function OverviewLedgerCard({
  income,
  expense,
  balance,
  loading,
  error,
  overBudget,
  month = formatMonthKey(),
}: OverviewLedgerCardProps) {
  return (
    <Card className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            가계부
          </p>
          <h2 className="text-lg font-semibold text-text-primary">
            {formatMonthLabel(month)}
          </h2>
          {overBudget && (
            <p className="mt-1 text-xs font-medium text-red-600">예산 초과 항목 있음</p>
          )}
        </div>
        <Link
          to="/ledger"
          className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-main/25 hover:text-main"
        >
          전체
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-main/20 border-t-main" />
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-600">
          {error}
        </p>
      ) : (
        <dl className="mt-auto grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-emerald-50/80 px-2 py-3">
            <dt className="text-[11px] font-medium text-emerald-700">수입</dt>
            <dd className="mt-1 text-sm font-bold text-emerald-800 sm:text-base">
              {formatKrw(income)}
            </dd>
          </div>
          <div className="rounded-xl bg-red-50/80 px-2 py-3">
            <dt className="text-[11px] font-medium text-red-600">지출</dt>
            <dd className="mt-1 text-sm font-bold text-red-700 sm:text-base">
              {formatKrw(expense)}
            </dd>
          </div>
          <div className="rounded-xl bg-main/5 px-2 py-3">
            <dt className="text-[11px] font-medium text-main">잔액</dt>
            <dd
              className={[
                'mt-1 text-sm font-bold sm:text-base',
                balance >= 0 ? 'text-text-primary' : 'text-red-600',
              ].join(' ')}
            >
              {balance >= 0 ? '' : '-'}
              {formatKrw(Math.abs(balance))}
            </dd>
          </div>
        </dl>
      )}
    </Card>
  )
}
