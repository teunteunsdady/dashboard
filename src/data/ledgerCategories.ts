import type { LedgerCategoryMeta, LedgerEntryType } from '../types/ledger'

export const ledgerCategories: LedgerCategoryMeta[] = [
  { id: 'food', label: '식비', type: 'expense', color: '#FDE68A' },
  { id: 'transport', label: '교통', type: 'expense', color: '#BFDBFE' },
  { id: 'housing', label: '주거', type: 'expense', color: '#DDD6FE' },
  { id: 'shopping', label: '쇼핑', type: 'expense', color: '#FECDD3' },
  { id: 'health', label: '의료', type: 'expense', color: '#BBF7D0' },
  { id: 'entertainment', label: '여가', type: 'expense', color: '#A7F3D0' },
  { id: 'subscription', label: '구독', type: 'expense', color: '#E2E8F0' },
  { id: 'education', label: '교육', type: 'expense', color: '#FBCFE8' },
  { id: 'expense_other', label: '기타 지출', type: 'expense', color: '#CBD5E1' },
  { id: 'salary', label: '급여', type: 'income', color: '#86EFAC' },
  { id: 'side_income', label: '부수입', type: 'income', color: '#7DD3FC' },
  { id: 'investment', label: '투자·이자', type: 'income', color: '#C4B5FD' },
  { id: 'income_other', label: '기타 수입', type: 'income', color: '#94A3B8' },
]

export function getLedgerCategoryMeta(id: string) {
  return ledgerCategories.find((c) => c.id === id)
}

export function categoriesForType(type: LedgerEntryType) {
  return ledgerCategories.filter((c) => c.type === type)
}

export const defaultCategoryForType = (type: LedgerEntryType) =>
  type === 'income' ? 'salary' : 'food'
