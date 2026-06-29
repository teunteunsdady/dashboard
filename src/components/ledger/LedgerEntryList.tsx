import { getLedgerCategoryMeta } from '../../data/ledgerCategories'
import type { LedgerEntry } from '../../types/ledger'
import { formatKrw } from '../../utils/ledgerUtils'
import { Card } from '../ui/Card'

interface LedgerEntryListProps {
  entries: LedgerEntry[]
  onEdit: (entry: LedgerEntry) => void
}

export function LedgerEntryList({ entries, onEdit }: LedgerEntryListProps) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="border-b border-border/70 px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">내역</h3>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-text-secondary">
          이번 달 기록이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {entries.map((entry) => {
            const meta = getLedgerCategoryMeta(entry.category)
            const isIncome = entry.type === 'income'

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onEdit(entry)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                    style={{
                      backgroundColor: meta?.color ?? '#E2E8F0',
                      color: '#334155',
                    }}
                  >
                    {meta?.label.slice(0, 2) ?? '—'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">
                      {entry.memo || meta?.label || '내역'}
                    </span>
                    <span className="mt-0.5 block text-xs text-text-secondary">
                      {entry.occurredOn.slice(5).replace('-', '/')} · {meta?.label}
                      {entry.recurringId && ' · 고정'}
                    </span>
                  </span>
                  <span
                    className={[
                      'shrink-0 text-sm font-semibold tabular-nums',
                      isIncome ? 'text-emerald-700' : 'text-red-600',
                    ].join(' ')}
                  >
                    {isIncome ? '+' : '-'}
                    {formatKrw(entry.amount)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
