import type { BudgetStatus } from '../../utils/ledgerUtils'
import { formatKrw } from '../../utils/ledgerUtils'
import { Card } from '../ui/Card'

interface LedgerBudgetSectionProps {
  statuses: BudgetStatus[]
  onManage: () => void
  readOnly?: boolean
}

export function LedgerBudgetSection({
  statuses,
  onManage,
  readOnly = false,
}: LedgerBudgetSectionProps) {
  return (
    <Card className="p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">월 예산</h3>
        {!readOnly && (
          <button
            type="button"
            onClick={onManage}
            className="text-xs font-medium text-main hover:text-main-dark"
          >
            예산 설정
          </button>
        )}
      </div>

      {statuses.length === 0 ? (
        <p className="text-sm text-text-secondary">
          이번 달 예산이 없습니다. 예산을 설정하면 지출 비율을 확인할 수 있어요.
        </p>
      ) : (
        <ul className="space-y-3">
          {statuses.map((s) => (
            <li key={s.category}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-text-primary">{s.label}</span>
                <span className={s.over ? 'font-semibold text-red-600' : 'text-text-secondary'}>
                  {formatKrw(s.spent)} / {formatKrw(s.budget)}
                  {s.over && ' · 초과'}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className={[
                    'h-full rounded-full transition-all',
                    s.over ? 'bg-red-500' : 'bg-main',
                  ].join(' ')}
                  style={{ width: `${Math.min(s.ratio * 100, 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
