import { supabase } from '../lib/supabase'
import type {
  LedgerBudget,
  LedgerBudgetCategory,
  LedgerCategory,
  LedgerEntry,
  LedgerEntryType,
  LedgerRecurring,
} from '../types/ledger'
import { recurringOccurrenceDate } from '../utils/ledgerUtils'

interface EntryRow {
  id: string
  user_id: string
  type: LedgerEntryType
  category: string
  amount: number
  occurred_on: string
  memo: string | null
  recurring_id: string | null
}

interface BudgetRow {
  id: string
  user_id: string
  month: string
  category: string
  amount: number
}

interface RecurringRow {
  id: string
  user_id: string
  title: string
  type: LedgerEntryType
  category: string
  amount: number
  day_of_month: number
  active: boolean
  memo: string | null
  last_applied_month: string | null
}

function rowToEntry(row: EntryRow): LedgerEntry {
  return {
    id: row.id,
    type: row.type,
    category: row.category as LedgerCategory,
    amount: Number(row.amount),
    occurredOn: row.occurred_on.slice(0, 10),
    memo: row.memo ?? undefined,
    recurringId: row.recurring_id ?? undefined,
  }
}

function rowToBudget(row: BudgetRow): LedgerBudget {
  return {
    id: row.id,
    month: row.month,
    category: row.category as LedgerBudgetCategory,
    amount: Number(row.amount),
  }
}

function rowToRecurring(row: RecurringRow): LedgerRecurring {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    category: row.category as LedgerCategory,
    amount: Number(row.amount),
    dayOfMonth: row.day_of_month,
    active: row.active,
    memo: row.memo ?? undefined,
    lastAppliedMonth: row.last_applied_month ?? undefined,
  }
}

export async function fetchLedgerEntries(userId: string): Promise<LedgerEntry[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_on', { ascending: false })

  if (error) throw error
  return (data as EntryRow[]).map(rowToEntry)
}

export async function createLedgerEntry(
  entry: Omit<LedgerEntry, 'id'>,
  userId: string,
): Promise<LedgerEntry> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.')

  const { data, error } = await supabase
    .from('ledger_entries')
    .insert({
      user_id: userId,
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
      occurred_on: entry.occurredOn,
      memo: entry.memo ?? null,
      recurring_id: entry.recurringId ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return rowToEntry(data as EntryRow)
}

export async function updateLedgerEntry(
  entry: LedgerEntry,
  userId: string,
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('ledger_entries')
    .update({
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
      occurred_on: entry.occurredOn,
      memo: entry.memo ?? null,
    })
    .eq('id', entry.id)
    .eq('user_id', userId)

  if (error) throw error
}

export async function deleteLedgerEntry(id: string, userId: string): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('ledger_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

export async function fetchLedgerBudgets(userId: string): Promise<LedgerBudget[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('ledger_budgets')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return (data as BudgetRow[]).map(rowToBudget)
}

export async function upsertLedgerBudget(
  budget: Omit<LedgerBudget, 'id'> & { id?: string },
  userId: string,
): Promise<LedgerBudget> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.')

  const payload = {
    user_id: userId,
    month: budget.month,
    category: budget.category,
    amount: budget.amount,
  }

  const { data, error } = await supabase
    .from('ledger_budgets')
    .upsert(payload, { onConflict: 'user_id,month,category' })
    .select('*')
    .single()

  if (error) throw error
  return rowToBudget(data as BudgetRow)
}

export async function deleteLedgerBudget(id: string, userId: string): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('ledger_budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

export async function fetchLedgerRecurring(userId: string): Promise<LedgerRecurring[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('ledger_recurring')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_month', { ascending: true })

  if (error) throw error
  return (data as RecurringRow[]).map(rowToRecurring)
}

export async function createLedgerRecurring(
  item: Omit<LedgerRecurring, 'id' | 'lastAppliedMonth'>,
  userId: string,
): Promise<LedgerRecurring> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.')

  const { data, error } = await supabase
    .from('ledger_recurring')
    .insert({
      user_id: userId,
      title: item.title,
      type: item.type,
      category: item.category,
      amount: item.amount,
      day_of_month: item.dayOfMonth,
      active: item.active,
      memo: item.memo ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return rowToRecurring(data as RecurringRow)
}

export async function updateLedgerRecurring(
  item: LedgerRecurring,
  userId: string,
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('ledger_recurring')
    .update({
      title: item.title,
      type: item.type,
      category: item.category,
      amount: item.amount,
      day_of_month: item.dayOfMonth,
      active: item.active,
      memo: item.memo ?? null,
      last_applied_month: item.lastAppliedMonth ?? null,
    })
    .eq('id', item.id)
    .eq('user_id', userId)

  if (error) throw error
}

export async function deleteLedgerRecurring(id: string, userId: string): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from('ledger_recurring')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

/** 해당 월에 아직 반영되지 않은 고정 항목을 내역으로 생성 */
export async function applyRecurringForMonth(
  userId: string,
  month: string,
  recurring: LedgerRecurring[],
  existingEntries: LedgerEntry[],
): Promise<LedgerEntry[]> {
  if (!supabase) return []

  const created: LedgerEntry[] = []

  for (const item of recurring) {
    if (!item.active || item.lastAppliedMonth === month) continue

    const already = existingEntries.some(
      (e) => e.recurringId === item.id && e.occurredOn.startsWith(month),
    )
    if (already) continue

    const occurredOn = recurringOccurrenceDate(month, item.dayOfMonth)
    const entry = await createLedgerEntry(
      {
        type: item.type,
        category: item.category,
        amount: item.amount,
        occurredOn,
        memo: item.memo ?? item.title,
        recurringId: item.id,
      },
      userId,
    )
    created.push(entry)

    await updateLedgerRecurring({ ...item, lastAppliedMonth: month }, userId)
  }

  return created
}
