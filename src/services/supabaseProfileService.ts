import { supabase } from '../lib/supabase'
import type { ReadonlyScope, UserProfile } from '../types/profile'

const OWNER_PROFILE: UserProfile = {
  app_role: 'owner',
  data_owner_id: null,
  readonly_scope: null,
}

function parseReadonlyScope(value: unknown): ReadonlyScope | null {
  if (value === 'full' || value === 'personal_events') return value
  return null
}

/** 로그인 사용자 프로필(역할) 조회 */
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  if (!supabase) return OWNER_PROFILE

  const { data, error } = await supabase
    .from('profiles')
    .select('app_role, data_owner_id, readonly_scope')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    if (
      error.message.includes('app_role') ||
      error.message.includes('data_owner_id') ||
      error.message.includes('readonly_scope')
    ) {
      throw new Error(
        '계정 역할 컬럼이 DB에 없습니다. supabase/migrations/20260702_readonly_role.sql 및 20260708_readonly2_personal_events.sql 을 실행해 주세요.',
      )
    }
    throw error
  }

  if (!data) return OWNER_PROFILE

  return {
    app_role: data.app_role === 'readonly' ? 'readonly' : 'owner',
    data_owner_id: data.data_owner_id ?? null,
    readonly_scope:
      data.app_role === 'readonly'
        ? (parseReadonlyScope(data.readonly_scope) ?? 'full')
        : null,
  }
}

export function resolveDataOwnerId(
  userId: string,
  profile: UserProfile | null,
): string {
  if (profile?.app_role === 'readonly' && profile.data_owner_id) {
    return profile.data_owner_id
  }
  return userId
}

export function canWriteData(profile: UserProfile | null): boolean {
  return profile?.app_role !== 'readonly'
}

export function hasFullReadonlyAccess(profile: UserProfile | null): boolean {
  if (profile?.app_role !== 'readonly') return true
  return profile.readonly_scope !== 'personal_events'
}

export function isPersonalEventsReadonly(profile: UserProfile | null): boolean {
  return (
    profile?.app_role === 'readonly' &&
    profile.readonly_scope === 'personal_events'
  )
}
