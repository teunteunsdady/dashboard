import { DAILY_API_LIMIT } from './busConfig.js'

export interface QuotaSnapshot {
  used: number
  limit: number
  remaining: number
}

export interface ReserveResult {
  allowed: boolean
  quota: QuotaSnapshot
  /** Supabase DB 전역 집계 여부 (false면 인스턴스 메모리 폴백) */
  global: boolean
}

const fallbackQuota = { date: '', used: 0 }

function getKstDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(new Date())
}

function getSupabaseConfig(): { url: string; serviceRoleKey: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return { url, serviceRoleKey }
}

/** Supabase RPC로 전역 한도를 쓰는지 */
export function isGlobalBusQuotaEnabled(): boolean {
  return getSupabaseConfig() !== null
}

async function callRpc<T>(fn: string, body?: Record<string, unknown>): Promise<T | null> {
  const config = getSupabaseConfig()
  if (!config) return null

  try {
    const response = await fetch(`${config.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
      body: JSON.stringify(body ?? {}),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error(`[bus-quota] ${fn} failed: ${response.status} ${text}`)
      return null
    }

    return (await response.json()) as T
  } catch (error) {
    console.error(
      `[bus-quota] ${fn} failed:`,
      error instanceof Error ? error.message : error,
    )
    return null
  }
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
    return { allowed: false, quota, global: false }
  }

  fallbackQuota.used += count
  return {
    allowed: true,
    quota: getFallbackQuota(),
    global: false,
  }
}

/** 전역 일일 호출량 조회 (증가 없음) */
export async function getBusApiQuota(): Promise<QuotaSnapshot & { global: boolean }> {
  if (!getSupabaseConfig()) {
    console.warn(
      '[bus-quota] SUPABASE_SERVICE_ROLE_KEY 없음 — 이 인스턴스 메모리만 집계합니다.',
    )
    return { ...getFallbackQuota(), global: false }
  }

  const data = await callRpc<Record<string, unknown>>('get_bus_api_quota')
  const quota = parseQuotaRow(data)
  if (!quota) {
    return { ...getFallbackQuota(), global: false }
  }

  return { ...quota, global: true }
}

/** 서울시 API 호출 전 원자적으로 할당량 예약 */
export async function reserveBusApiCalls(count: number): Promise<ReserveResult> {
  if (!getSupabaseConfig()) {
    console.warn(
      '[bus-quota] SUPABASE_SERVICE_ROLE_KEY 없음 — 전역 집계 대신 로컬 메모리를 씁니다.',
    )
    return reserveFallback(count)
  }

  const data = await callRpc<Record<string, unknown>>('reserve_bus_api_calls', {
    p_count: count,
  })

  const quota = parseQuotaRow(data)
  if (!quota || typeof data?.allowed !== 'boolean') {
    return reserveFallback(count)
  }

  return { allowed: data.allowed, quota, global: true }
}
