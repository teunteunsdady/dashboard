import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DAILY_API_LIMIT } from './busConfig.js'

export interface QuotaSnapshot {
  used: number
  limit: number
  remaining: number
}

export interface ReserveResult {
  allowed: boolean
  quota: QuotaSnapshot
}

let adminClient: SupabaseClient | null | undefined

const fallbackQuota = { date: '', used: 0 }

function getKstDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(new Date())
}

function getAdminClient(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    adminClient = null
    return null
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return adminClient
}

function parseQuotaRow(value: unknown): QuotaSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (
    typeof row.used !== 'number' ||
    typeof row.limit !== 'number' ||
    typeof row.remaining !== 'number'
  ) {
    return null
  }
  return {
    used: row.used,
    limit: row.limit,
    remaining: row.remaining,
  }
}

function resetFallbackIfNeeded() {
  const today = getKstDateKey()
  if (fallbackQuota.date !== today) {
    fallbackQuota.date = today
    fallbackQuota.used = 0
  }
}

function getFallbackQuota(): QuotaSnapshot {
  resetFallbackIfNeeded()
  return {
    used: fallbackQuota.used,
    limit: DAILY_API_LIMIT,
    remaining: Math.max(0, DAILY_API_LIMIT - fallbackQuota.used),
  }
}

function reserveFallback(count: number): ReserveResult {
  resetFallbackIfNeeded()
  const quota = getFallbackQuota()

  if (quota.remaining < count) {
    return { allowed: false, quota }
  }

  fallbackQuota.used += count
  return {
    allowed: true,
    quota: getFallbackQuota(),
  }
}

/** 전역 일일 호출량 조회 (증가 없음) */
export async function getBusApiQuota(): Promise<QuotaSnapshot> {
  const client = getAdminClient()
  if (!client) {
    console.warn(
      '[bus-quota] SUPABASE_SERVICE_ROLE_KEY 없음 — 이 인스턴스 메모리만 집계합니다.',
    )
    return getFallbackQuota()
  }

  const { data, error } = await client.rpc('get_bus_api_quota')
  if (error) {
    console.error('[bus-quota] get_bus_api_quota failed:', error.message)
    return getFallbackQuota()
  }

  return parseQuotaRow(data) ?? getFallbackQuota()
}

/** 서울시 API 호출 전 원자적으로 할당량 예약 */
export async function reserveBusApiCalls(count: number): Promise<ReserveResult> {
  const client = getAdminClient()
  if (!client) {
    return reserveFallback(count)
  }

  const { data, error } = await client.rpc('reserve_bus_api_calls', {
    p_count: count,
  })

  if (error) {
    console.error('[bus-quota] reserve_bus_api_calls failed:', error.message)
    return reserveFallback(count)
  }

  const row = data as Record<string, unknown> | null
  const quota = parseQuotaRow(row)
  if (!quota || typeof row?.allowed !== 'boolean') {
    return reserveFallback(count)
  }

  return { allowed: row.allowed, quota }
}
