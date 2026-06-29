import type { CategoryBreakdown } from '../../utils/ledgerUtils'
import { formatKrw } from '../../utils/ledgerUtils'
import { Card } from '../ui/Card'

interface LedgerChartProps {
  breakdown: CategoryBreakdown[]
}

export function LedgerChart({ breakdown }: LedgerChartProps) {
  return (
    <Card className="p-4 md:p-5">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">지출 분류</h3>

      {breakdown.length === 0 ? (
        <p className="text-sm text-text-secondary">이번 달 지출 내역이 없습니다.</p>
      ) : (
        <ul className="space-y-2.5">
          {breakdown.map((item) => (
            <li key={item.category}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 font-medium text-text-primary">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
                <span className="text-text-secondary">
                  {formatKrw(item.amount)} ({Math.round(item.ratio * 100)}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${item.ratio * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
