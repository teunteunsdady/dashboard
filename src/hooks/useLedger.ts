import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import * as ledgerService from '../services/supabaseLedgerService'
import {
  computeBudgetStatuses,
  expenseBreakdown,
  formatMonthKey,
  isInMonth,
  sumByType,
} from '../utils/ledgerUtils'
import type {
  LedgerBudget,
  LedgerEntry,
  LedgerRecurring,
} from '../types/ledger'

/** 가게부 데이터 로드·CRUD·월별 집계 */
export function useLedger(initialMonth?: string) {
  const { user, dataOwnerId, canWrite } = useAuth()
  const useCloud = isSupabaseConfigured() && Boolean(user)
  const ownerId = dataOwnerId ?? user?.id ?? null

  const [month, setMonth] = useState(initialMonth ?? formatMonthKey())
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [budgets, setBudgets] = useState<LedgerBudget[]>([])
  const [recurring, setRecurring] = useState<LedgerRecurring[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!useCloud || !user || !ownerId) {
      setEntries([])
      setBudgets([])
      setRecurring([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [entryList, budgetList, recurringList] = await Promise.all([
        ledgerService.fetchLedgerEntries(ownerId),
        ledgerService.fetchLedgerBudgets(ownerId),
        ledgerService.fetchLedgerRecurring(ownerId),
      ])

      const applied = canWrite
        ? await ledgerService.applyRecurringForMonth(
            ownerId,
            month,
            recurringList,
            entryList,
          )
        : []

      const mergedEntries =
        applied.length > 0
          ? [...applied, ...entryList].sort((a, b) =>
              b.occurredOn.localeCompare(a.occurredOn),
            )
          : entryList

      if (applied.length > 0) {
        const refreshedRecurring = await ledgerService.fetchLedgerRecurring(ownerId)
        setRecurring(refreshedRecurring)
      } else {
        setRecurring(recurringList)
      }

      setEntries(mergedEntries)
      setBudgets(budgetList)
    } catch (err) {
      setError(err instanceof Error ? err.message : '가게부를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [useCloud, user, ownerId, month, canWrite])

  useEffect(() => {
    reload()
  }, [reload])

  const monthEntries = useMemo(
    () => entries.filter((e) => isInMonth(e.occurredOn, month)),
    [entries, month],
  )

  const incomeTotal = useMemo(
    () => sumByType(monthEntries, 'income'),
    [monthEntries],
  )
  const expenseTotal = useMemo(
    () => sumByType(monthEntries, 'expense'),
    [monthEntries],
  )
  const balance = incomeTotal - expenseTotal

  const breakdown = useMemo(
    () => expenseBreakdown(monthEntries),
    [monthEntries],
  )

  const budgetStatuses = useMemo(
    () => computeBudgetStatuses(entries, budgets, month),
    [entries, budgets, month],
  )

  const overBudget = budgetStatuses.some((b) => b.over)

  const addEntry = useCallback(
    async (entry: Omit<LedgerEntry, 'id'>) => {
      if (!useCloud || !user || !ownerId) throw new Error('로그인이 필요합니다.')
      if (!canWrite) throw new Error('읽기 전용 계정은 가게부를 수정할 수 없습니다.')
      const saved = await ledgerService.createLedgerEntry(entry, ownerId)
      setEntries((prev) =>
        [saved, ...prev].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)),
      )
      return saved
    },
    [useCloud, user, ownerId, canWrite],
  )

  const updateEntry = useCallback(
    async (entry: LedgerEntry) => {
      if (!useCloud || !user || !ownerId) return
      if (!canWrite) throw new Error('읽기 전용 계정은 가게부를 수정할 수 없습니다.')
      const prev = entries
      setEntries((list) =>
        list
          .map((e) => (e.id === entry.id ? entry : e))
          .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)),
      )
      try {
        await ledgerService.updateLedgerEntry(entry, ownerId)
      } catch (err) {
        setEntries(prev)
        throw err
      }
    },
    [useCloud, user, ownerId, canWrite, entries],
  )

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!useCloud || !user || !ownerId || !canWrite) return
      const prev = entries
      setEntries((list) => list.filter((e) => e.id !== id))
      try {
        await ledgerService.deleteLedgerEntry(id, ownerId)
      } catch (err) {
        setEntries(prev)
        setError(err instanceof Error ? err.message : '삭제 실패')
      }
    },
    [useCloud, user, ownerId, canWrite, entries],
  )

  const upsertBudget = useCallback(
    async (budget: Omit<LedgerBudget, 'id'> & { id?: string }) => {
      if (!useCloud || !user || !ownerId) throw new Error('로그인이 필요합니다.')
      if (!canWrite) throw new Error('읽기 전용 계정은 가게부를 수정할 수 없습니다.')
      const saved = await ledgerService.upsertLedgerBudget(budget, ownerId)
      setBudgets((prev) => {
        const rest = prev.filter(
          (b) => !(b.month === saved.month && b.category === saved.category),
        )
        return [...rest, saved]
      })
      return saved
    },
    [useCloud, user, ownerId, canWrite],
  )

  const deleteBudget = useCallback(
    async (id: string) => {
      if (!useCloud || !user || !ownerId || !canWrite) return
      await ledgerService.deleteLedgerBudget(id, ownerId)
      setBudgets((prev) => prev.filter((b) => b.id !== id))
    },
    [useCloud, user, ownerId, canWrite],
  )

  const addRecurring = useCallback(
    async (item: Omit<LedgerRecurring, 'id' | 'lastAppliedMonth'>) => {
      if (!useCloud || !user || !ownerId) throw new Error('로그인이 필요합니다.')
      if (!canWrite) throw new Error('읽기 전용 계정은 가게부를 수정할 수 없습니다.')
      const saved = await ledgerService.createLedgerRecurring(item, ownerId)
      setRecurring((prev) => [...prev, saved])
      return saved
    },
    [useCloud, user, ownerId, canWrite],
  )

  const updateRecurring = useCallback(
    async (item: LedgerRecurring) => {
      if (!useCloud || !user || !ownerId || !canWrite) return
      await ledgerService.updateLedgerRecurring(item, ownerId)
      setRecurring((prev) => prev.map((r) => (r.id === item.id ? item : r)))
    },
    [useCloud, user, ownerId, canWrite],
  )

  const deleteRecurring = useCallback(
    async (id: string) => {
      if (!useCloud || !user || !ownerId || !canWrite) return
      await ledgerService.deleteLedgerRecurring(id, ownerId)
      setRecurring((prev) => prev.filter((r) => r.id !== id))
    },
    [useCloud, user, ownerId, canWrite],
  )

  return {
    month,
    setMonth,
    entries,
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
    reload,
    clearError: () => setError(null),
  }
}
