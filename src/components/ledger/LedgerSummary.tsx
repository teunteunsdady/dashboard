import { Card } from '../ui/Card'
import { formatKrw } from '../../utils/ledgerUtils'

interface LedgerSummaryProps {
  income: number
  expense: number
  balance: number
}

export function LedgerSummary({ income, expense, balance }: LedgerSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="border-emerald-200/60 bg-emerald-50/40 p-4">
        <p className="text-xs font-medium text-emerald-700">수입</p>
        <p className="mt-1 text-xl font-bold text-emerald-800">{formatKrw(income)}</p>
      </Card>
      <Card className="border-red-200/60 bg-red-50/40 p-4">
        <p className="text-xs font-medium text-red-600">지출</p>
        <p className="mt-1 text-xl font-bold text-red-700">{formatKrw(expense)}</p>
      </Card>
      <Card className="border-main/20 bg-main/5 p-4">
        <p className="text-xs font-medium text-main">잔액</p>
        <p
          className={[
            'mt-1 text-xl font-bold',
            balance >= 0 ? 'text-text-primary' : 'text-red-600',
          ].join(' ')}
        >
          {balance >= 0 ? '' : '-'}
          {formatKrw(Math.abs(balance))}
        </p>
      </Card>
    </div>
  )
}
