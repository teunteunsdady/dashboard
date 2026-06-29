/** 가게부 관련 타입 */

export type LedgerEntryType = 'income' | 'expense'

export type LedgerExpenseCategory =
  | 'food'
  | 'transport'
  | 'housing'
  | 'shopping'
  | 'health'
  | 'entertainment'
  | 'subscription'
  | 'education'
  | 'expense_other'

export type LedgerIncomeCategory =
  | 'salary'
  | 'side_income'
  | 'investment'
  | 'income_other'

export type LedgerCategory = LedgerExpenseCategory | LedgerIncomeCategory

/** 월 전체 예산용 가상 카테고리 */
export type LedgerBudgetCategory = LedgerCategory | 'total'

export interface LedgerEntry {
  id: string
  type: LedgerEntryType
  category: LedgerCategory
  amount: number
  /** YYYY-MM-DD */
  occurredOn: string
  memo?: string
  recurringId?: string
}

export interface LedgerBudget {
  id: string
  /** YYYY-MM */
  month: string
  category: LedgerBudgetCategory
  amount: number
}

export interface LedgerRecurring {
  id: string
  title: string
  type: LedgerEntryType
  category: LedgerCategory
  amount: number
  /** 1–31 */
  dayOfMonth: number
  active: boolean
  memo?: string
  /** 마지막 자동 반영 월 YYYY-MM */
  lastAppliedMonth?: string
}

export interface LedgerCategoryMeta {
  id: LedgerCategory
  label: string
  type: LedgerEntryType
  color: string
}
