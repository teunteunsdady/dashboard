import { formatMonthLabel, shiftMonth } from '../../utils/ledgerUtils'

interface LedgerMonthNavProps {
  month: string
  onChange: (month: string) => void
}

export function LedgerMonthNav({ month, onChange }: LedgerMonthNavProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors hover:border-main/30 hover:text-main"
        aria-label="이전 달"
      >
        ‹
      </button>
      <span className="min-w-[7rem] text-center text-lg font-semibold text-text-primary">
        {formatMonthLabel(month)}
      </span>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors hover:border-main/30 hover:text-main"
        aria-label="다음 달"
      >
        ›
      </button>
    </div>
  )
}
