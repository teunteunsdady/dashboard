import { useEffect, useState } from 'react'
import {
  categoriesForType,
  defaultCategoryForType,
  getLedgerCategoryMeta,
} from '../../data/ledgerCategories'
import type { LedgerCategory, LedgerEntryType, LedgerRecurring } from '../../types/ledger'
import { formatKrw, parseAmountInput } from '../../utils/ledgerUtils'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'

interface LedgerRecurringSectionProps {
  items: LedgerRecurring[]
  onAdd: () => void
  onEdit: (item: LedgerRecurring) => void
  readOnly?: boolean
}

export function LedgerRecurringSection({
  items,
  onAdd,
  onEdit,
  readOnly = false,
}: LedgerRecurringSectionProps) {
  return (
    <Card className="p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">고정 수입·지출</h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            매월 해당 날짜에 내역이 자동으로 추가됩니다.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={onAdd}
            className="shrink-0 rounded-xl bg-main px-3 py-1.5 text-xs font-medium text-white hover:bg-main-dark"
          >
            + 추가
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">등록된 고정 항목이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const meta = getLedgerCategoryMeta(item.category)
            const isIncome = item.type === 'income'
            const rowClass = [
              'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left',
              item.active
                ? 'border-border/80 bg-surface'
                : 'border-border/50 bg-surface/50 opacity-60',
              !readOnly && 'transition-colors hover:border-main/25',
            ].join(' ')

            return (
              <li key={item.id}>
                {readOnly ? (
                  <div className={rowClass}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text-primary">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-text-secondary">
                      매월 {item.dayOfMonth}일 · {meta?.label}
                      {!item.active && ' · 비활성'}
                    </span>
                  </span>
                  <span
                    className={[
                      'shrink-0 text-sm font-semibold tabular-nums',
                      isIncome ? 'text-emerald-700' : 'text-red-600',
                    ].join(' ')}
                  >
                    {isIncome ? '+' : '-'}
                    {formatKrw(item.amount)}
                  </span>
                  </div>
                ) : (
                  <button type="button" onClick={() => onEdit(item)} className={rowClass}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text-primary">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-text-secondary">
                      매월 {item.dayOfMonth}일 · {meta?.label}
                      {!item.active && ' · 비활성'}
                    </span>
                  </span>
                  <span
                    className={[
                      'shrink-0 text-sm font-semibold tabular-nums',
                      isIncome ? 'text-emerald-700' : 'text-red-600',
                    ].join(' ')}
                  >
                    {isIncome ? '+' : '-'}
                    {formatKrw(item.amount)}
                  </span>
                </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export type RecurringModalMode = 'create' | 'edit'

interface LedgerRecurringModalProps {
  isOpen: boolean
  mode: RecurringModalMode
  item: LedgerRecurring | null
  onClose: () => void
  onSave: (
    item: Omit<LedgerRecurring, 'id' | 'lastAppliedMonth'> | LedgerRecurring,
  ) => Promise<void>
  onDelete?: (id: string) => void
}

const fieldClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-main focus:ring-2 focus:ring-main/20'

export function LedgerRecurringModal({
  isOpen,
  mode,
  item,
  onClose,
  onSave,
  onDelete,
}: LedgerRecurringModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<LedgerEntryType>('expense')
  const [category, setCategory] = useState(defaultCategoryForType('expense'))
  const [amountRaw, setAmountRaw] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [active, setActive] = useState(true)
  const [memo, setMemo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setSaving(false)

    if (mode === 'edit' && item) {
      setTitle(item.title)
      setType(item.type)
      setCategory(item.category)
      setAmountRaw(String(item.amount))
      setDayOfMonth(String(item.dayOfMonth))
      setActive(item.active)
      setMemo(item.memo ?? '')
    } else {
      setTitle('')
      setType('expense')
      setCategory(defaultCategoryForType('expense'))
      setAmountRaw('')
      setDayOfMonth('1')
      setActive(true)
      setMemo('')
    }
  }, [isOpen, mode, item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('제목을 입력해 주세요.')
      return
    }
    const amount = parseAmountInput(amountRaw)
    if (!amount) {
      setError('금액을 입력해 주세요.')
      return
    }
    const day = Number(dayOfMonth)
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setError('날짜는 1~31 사이로 입력해 주세요.')
      return
    }

    const payload = {
      title: title.trim(),
      type,
      category: category as LedgerCategory,
      amount,
      dayOfMonth: day,
      active,
      memo: memo.trim() || undefined,
    }

    setSaving(true)
    try {
      if (mode === 'edit' && item) {
        await onSave({ ...item, ...payload })
      } else {
        await onSave(payload)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? '고정 항목 추가' : '고정 항목 수정'}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass}
            placeholder="Netflix, 월세 등"
          />
        </div>

        <div className="flex rounded-xl border border-border bg-surface p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t)
                setCategory(defaultCategoryForType(t))
              }}
              className={[
                'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
                type === t
                  ? t === 'expense'
                    ? 'bg-red-500 text-white'
                    : 'bg-emerald-500 text-white'
                  : 'text-text-secondary',
              ].join(' ')}
            >
              {t === 'expense' ? '지출' : '수입'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              금액
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              매월 며칠
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <Select
          label="카테고리"
          value={category}
          onChange={(value) => setCategory(value as typeof category)}
          options={categoriesForType(type).map((c) => ({
            value: c.id,
            label: c.label,
          }))}
        />

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-border text-main"
          />
          <span className="text-sm text-text-primary">활성 (자동 반영)</span>
        </label>

        <div className="flex items-center justify-between pt-2">
          {mode === 'edit' && onDelete && item ? (
            <button
              type="button"
              onClick={() => {
                onDelete(item.id)
                onClose()
              }}
              className="text-sm font-medium text-red-500"
            >
              삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
