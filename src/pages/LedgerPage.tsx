import { useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import { useLedger } from '../hooks/useLedger'
import { LedgerBudgetModal } from '../components/ledger/LedgerBudgetModal'
import { LedgerBudgetSection } from '../components/ledger/LedgerBudgetSection'
import { LedgerChart } from '../components/ledger/LedgerChart'
import { LedgerEntryList } from '../components/ledger/LedgerEntryList'
import {
  LedgerEntryModal,
  type LedgerEntryModalMode,
} from '../components/ledger/LedgerEntryModal'
import { LedgerMonthNav } from '../components/ledger/LedgerMonthNav'
import {
  LedgerRecurringModal,
  LedgerRecurringSection,
  type RecurringModalMode,
} from '../components/ledger/LedgerRecurringSection'
import { LedgerSummary } from '../components/ledger/LedgerSummary'
import type { LedgerBudgetCategory, LedgerEntry, LedgerRecurring } from '../types/ledger'

interface EntryModalState {
  isOpen: boolean
  mode: LedgerEntryModalMode
  entry: LedgerEntry | null
}

interface RecurringModalState {
  isOpen: boolean
  mode: RecurringModalMode
  item: LedgerRecurring | null
}

const closedEntryModal: EntryModalState = { isOpen: false, mode: 'create', entry: null }
const closedRecurring: RecurringModalState = { isOpen: false, mode: 'create', item: null }

/** 가게부 — 수입·지출, 예산, 고정 항목, 통계 */
export function LedgerPage() {
  const {
    month,
    setMonth,
    monthEntries,
    budgets,
    recurring,
    incomeTotal,
    expenseTotal,
    balance,
    breakdown,
    budgetStatuses,
    overBudget,
    loading,
    error,
    useCloud,
    addEntry,
    updateEntry,
    deleteEntry,
    upsertBudget,
    deleteBudget,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    clearError,
  } = useLedger()

  const [entryModal, setEntryModal] = useState(closedEntryModal)
  const [recurringModal, setRecurringModal] = useState(closedRecurring)
  const [budgetOpen, setBudgetOpen] = useState(false)

  const handleSaveEntry = async (payload: Omit<LedgerEntry, 'id'> | LedgerEntry) => {
    if ('id' in payload && payload.id) {
      await updateEntry(payload as LedgerEntry)
    } else {
      await addEntry(payload as Omit<LedgerEntry, 'id'>)
    }
  }

  const handleSaveRecurring = async (
    payload: Omit<LedgerRecurring, 'id' | 'lastAppliedMonth'> | LedgerRecurring,
  ) => {
    if ('id' in payload && payload.id) {
      await updateRecurring(payload as LedgerRecurring)
    } else {
      await addRecurring(payload as Omit<LedgerRecurring, 'id' | 'lastAppliedMonth'>)
    }
  }

  const handleSaveBudget = async (category: LedgerBudgetCategory, amount: number) => {
    await upsertBudget({ month, category, amount })
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-main/20 border-t-main" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <LedgerMonthNav month={month} onChange={setMonth} />
        <button
          type="button"
          onClick={() =>
            setEntryModal({ isOpen: true, mode: 'create', entry: null })
          }
          disabled={!useCloud}
          className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-main-dark disabled:opacity-50"
        >
          + 내역 추가
        </button>
      </div>

      {!isSupabaseConfigured() && (
        <p className="mb-4 rounded-xl border border-sub/30 bg-sub/10 px-4 py-3 text-sm text-text-secondary">
          Ledger는 Supabase 연동·로그인 후 사용할 수 있습니다.
        </p>
      )}

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span>{error}</span>
          <button type="button" onClick={clearError} className="font-medium">
            닫기
          </button>
        </div>
      )}

      {overBudget && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          이번 달 예산을 초과한 항목이 있습니다.
        </div>
      )}

      <div className="space-y-4">
        <LedgerSummary
          income={incomeTotal}
          expense={expenseTotal}
          balance={balance}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LedgerBudgetSection
            statuses={budgetStatuses}
            onManage={() => setBudgetOpen(true)}
          />
          <LedgerChart breakdown={breakdown} />
        </div>

        <LedgerRecurringSection
          items={recurring}
          onAdd={() =>
            setRecurringModal({ isOpen: true, mode: 'create', item: null })
          }
          onEdit={(item) =>
            setRecurringModal({ isOpen: true, mode: 'edit', item })
          }
        />

        <LedgerEntryList
          entries={monthEntries}
          onEdit={(entry) =>
            setEntryModal({ isOpen: true, mode: 'edit', entry })
          }
        />
      </div>

      <LedgerEntryModal
        isOpen={entryModal.isOpen}
        mode={entryModal.mode}
        entry={entryModal.entry}
        onClose={() => setEntryModal(closedEntryModal)}
        onSave={handleSaveEntry}
        onDelete={deleteEntry}
      />

      <LedgerBudgetModal
        isOpen={budgetOpen}
        month={month}
        budgets={budgets}
        onClose={() => setBudgetOpen(false)}
        onSave={handleSaveBudget}
        onDelete={deleteBudget}
      />

      <LedgerRecurringModal
        isOpen={recurringModal.isOpen}
        mode={recurringModal.mode}
        item={recurringModal.item}
        onClose={() => setRecurringModal(closedRecurring)}
        onSave={handleSaveRecurring}
        onDelete={deleteRecurring}
      />
    </div>
  )
}
