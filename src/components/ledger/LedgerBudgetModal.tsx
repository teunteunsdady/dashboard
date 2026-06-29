import { useEffect, useState } from 'react'
import { getLedgerCategoryMeta } from '../../data/ledgerCategories'
import type { LedgerBudget, LedgerBudgetCategory } from '../../types/ledger'
import { ledgerCategories } from '../../data/ledgerCategories'
import { parseAmountInput } from '../../utils/ledgerUtils'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'

interface LedgerBudgetModalProps {
  isOpen: boolean
  month: string
  budgets: LedgerBudget[]
  onClose: () => void
  onSave: (category: LedgerBudgetCategory, amount: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const fieldClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-main focus:ring-2 focus:ring-main/20'

const budgetCategoryOptions: { id: LedgerBudgetCategory; label: string }[] = [
  { id: 'total', label: '전체 지출' },
  ...ledgerCategories
    .filter((c) => c.type === 'expense')
    .map((c) => ({ id: c.id as LedgerBudgetCategory, label: c.label })),
]

export function LedgerBudgetModal({
  isOpen,
  month,
  budgets,
  onClose,
  onSave,
  onDelete,
}: LedgerBudgetModalProps) {
  const [category, setCategory] = useState<LedgerBudgetCategory>('total')
  const [amountRaw, setAmountRaw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const monthBudgets = budgets.filter((b) => b.month === month)
  const existing = monthBudgets.find((b) => b.category === category)

  useEffect(() => {
    if (!isOpen) return
    setCategory('total')
    setAmountRaw('')
    setError(null)
  }, [isOpen, month])

  useEffect(() => {
    const match = monthBudgets.find((b) => b.category === category)
    setAmountRaw(match ? String(match.amount) : '')
  }, [category, monthBudgets])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseAmountInput(amountRaw)
    if (!amount) {
      setError('예산 금액을 입력해 주세요.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(category, amount)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="월 예산 설정">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <Select
          label="항목"
          value={category}
          onChange={(value) => setCategory(value as LedgerBudgetCategory)}
          options={budgetCategoryOptions.map((o) => ({
            value: o.id,
            label: o.label,
          }))}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            예산 (원)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value)}
            className={fieldClass}
            placeholder="500000"
          />
        </div>

        {monthBudgets.length > 0 && (
          <div className="rounded-xl bg-surface px-3 py-2.5">
            <p className="mb-2 text-xs font-medium text-text-secondary">
              이번 달 설정된 예산
            </p>
            <ul className="space-y-1 text-xs text-text-primary">
              {monthBudgets.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2">
                  <span>
                    {b.category === 'total'
                      ? '전체'
                      : getLedgerCategoryMeta(b.category)?.label}
                  </span>
                  <span className="flex items-center gap-2">
                    {b.amount.toLocaleString('ko-KR')}원
                    <button
                      type="button"
                      onClick={() => onDelete(b.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      삭제
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white hover:bg-main-dark disabled:opacity-50"
          >
            {saving ? '저장 중…' : existing ? '수정' : '추가'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
