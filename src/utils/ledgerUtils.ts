import { getLedgerCategoryMeta } from '../data/ledgerCategories'
import type {
  LedgerBudget,
  LedgerBudgetCategory,
  LedgerCategory,
  LedgerEntry,
  LedgerEntryType,
  LedgerRecurring,
} from '../types/ledger'

export function formatMonthKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function parseMonthKey(month: string): { year: number; month: number } {
  const [y, m] = month.split('-').map(Number)
  return { year: y, month: m }
}

export function shiftMonth(month: string, delta: number): string {
  const { year, month: m } = parseMonthKey(month)
  const d = new Date(year, m - 1 + delta, 1)
  return formatMonthKey(d)
}

export function formatMonthLabel(month: string): string {
  const { year, month: m } = parseMonthKey(month)
  return `${year}년 ${m}월`
}

export function localToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function isInMonth(date: string, month: string): boolean {
  return date.slice(0, 7) === month
}

export function formatKrw(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`
}

export function parseAmountInput(raw: string): number | null {
  const trimmed = raw.replace(/,/g, '').trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

export function sumByType(entries: LedgerEntry[], type: LedgerEntryType): number {
  return entries
    .filter((e) => e.type === type)
    .reduce((sum, e) => sum + e.amount, 0)
}

export interface CategoryBreakdown {
  category: LedgerCategory
  label: string
  color: string
  amount: number
  ratio: number
}

export function expenseBreakdown(entries: LedgerEntry[]): CategoryBreakdown[] {
  const expenses = entries.filter((e) => e.type === 'expense')
  const total = sumByType(expenses, 'expense')
  if (total <= 0) return []

  const map = new Map<LedgerCategory, number>()
  for (const e of expenses) {
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
  }

  return [...map.entries()]
    .map(([category, amount]) => {
      const meta = getLedgerCategoryMeta(category)
      return {
        category,
        label: meta?.label ?? category,
        color: meta?.color ?? '#CBD5E1',
        amount,
        ratio: amount / total,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

export interface BudgetStatus {
  category: LedgerBudgetCategory
  label: string
  budget: number
  spent: number
  ratio: number
  over: boolean
}

export function computeBudgetStatuses(
  entries: LedgerEntry[],
  budgets: LedgerBudget[],
  month: string,
): BudgetStatus[] {
  const monthEntries = entries.filter((e) => isInMonth(e.occurredOn, month))
  const expenses = monthEntries.filter((e) => e.type === 'expense')
  const totalSpent = sumByType(expenses, 'expense')

  const monthBudgets = budgets.filter((b) => b.month === month)
  if (monthBudgets.length === 0) return []

  return monthBudgets.map((b) => {
    const spent =
      b.category === 'total'
        ? totalSpent
        : expenses
            .filter((e) => e.category === b.category)
            .reduce((s, e) => s + e.amount, 0)
    const label =
      b.category === 'total'
        ? '전체 지출'
        : (getLedgerCategoryMeta(b.category)?.label ?? b.category)
    const ratio = b.amount > 0 ? spent / b.amount : 0
    return {
      category: b.category,
      label,
      budget: b.amount,
      spent,
      ratio,
      over: spent > b.amount,
    }
  })
}

/** 고정 항목 해당 월 발생일 (말일 초과 시 말일) */
export function recurringOccurrenceDate(month: string, dayOfMonth: number): string {
  const { year, month: m } = parseMonthKey(month)
  const lastDay = new Date(year, m, 0).getDate()
  const day = Math.min(Math.max(dayOfMonth, 1), lastDay)
  return `${month}-${String(day).padStart(2, '0')}`
}

export function recurringNeedsApply(item: LedgerRecurring, month: string): boolean {
  if (!item.active) return false
  if (item.lastAppliedMonth === month) return false
  return true
}
