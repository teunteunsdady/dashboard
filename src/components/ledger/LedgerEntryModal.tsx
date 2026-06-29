import { useEffect, useState } from 'react'
import {
  categoriesForType,
  defaultCategoryForType,
} from '../../data/ledgerCategories'
import type { LedgerCategory, LedgerEntry, LedgerEntryType } from '../../types/ledger'
import { localToday, parseAmountInput } from '../../utils/ledgerUtils'
import { DatePicker } from '../ui/DatePicker'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'

export type LedgerEntryModalMode = 'create' | 'edit'

interface LedgerEntryModalProps {
  isOpen: boolean
  mode: LedgerEntryModalMode
  entry: LedgerEntry | null
  defaultDate?: string
  onClose: () => void
  onSave: (entry: Omit<LedgerEntry, 'id'> | LedgerEntry) => Promise<void>
  onDelete?: (id: string) => void
  readOnly?: boolean
}

const fieldClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-main focus:ring-2 focus:ring-main/20'

export function LedgerEntryModal({
  isOpen,
  mode,
  entry,
  defaultDate,
  onClose,
  onSave,
  onDelete,
  readOnly = false,
}: LedgerEntryModalProps) {
  const [type, setType] = useState<LedgerEntryType>('expense')
  const [category, setCategory] = useState(defaultCategoryForType('expense'))
  const [amountRaw, setAmountRaw] = useState('')
  const [date, setDate] = useState(localToday())
  const [memo, setMemo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setSaving(false)

    if (mode === 'edit' && entry) {
      setType(entry.type)
      setCategory(entry.category)
      setAmountRaw(String(entry.amount))
      setDate(entry.occurredOn)
      setMemo(entry.memo ?? '')
    } else {
      setType('expense')
      setCategory(defaultCategoryForType('expense'))
      setAmountRaw('')
      setDate(defaultDate ?? localToday())
      setMemo('')
    }
  }, [isOpen, mode, entry, defaultDate])

  const handleTypeChange = (next: LedgerEntryType) => {
    setType(next)
    setCategory(defaultCategoryForType(next))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly || saving) return

    const amount = parseAmountInput(amountRaw)
    if (!amount) {
      setError('금액을 올바르게 입력해 주세요.')
      return
    }
    if (!date) {
      setError('날짜를 선택해 주세요.')
      return
    }

    const payload = {
      type,
      category: category as LedgerCategory,
      amount,
      occurredOn: date,
      memo: memo.trim() || undefined,
      recurringId: mode === 'edit' ? entry?.recurringId : undefined,
    }

    setSaving(true)
    setError(null)
    try {
      if (mode === 'edit' && entry) {
        await onSave({ ...payload, id: entry.id })
      } else {
        await onSave(payload)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const categoryOptions = categoriesForType(type)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={readOnly ? '내역 보기' : mode === 'create' ? '내역 추가' : '내역 수정'}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className={readOnly ? 'pointer-events-none opacity-90' : undefined}>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex rounded-xl border border-border bg-surface p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={[
                'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
                type === t
                  ? t === 'expense'
                    ? 'bg-red-500 text-white'
                    : 'bg-emerald-500 text-white'
                  : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              {t === 'expense' ? '지출' : '수입'}
            </button>
          ))}
        </div>

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
            placeholder="예시) 15000"
          />
        </div>

        <Select
          label="카테고리"
          value={category}
          onChange={(value) => setCategory(value as typeof category)}
          options={categoryOptions.map((c) => ({
            value: c.id,
            label: c.label,
          }))}
        />

        <DatePicker label="날짜" value={date} onChange={setDate} required />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            메모
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className={fieldClass}
            placeholder="선택 사항"
          />
        </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {!readOnly && mode === 'edit' && onDelete && entry ? (
            <button
              type="button"
              onClick={() => {
                onDelete(entry.id)
                onClose()
              }}
              className="text-sm font-medium text-red-500 hover:text-red-600"
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
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface"
            >
              {readOnly ? '닫기' : '취소'}
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white hover:bg-main-dark disabled:opacity-50"
              >
                {saving ? '저장 중…' : mode === 'create' ? '추가' : '저장'}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}
