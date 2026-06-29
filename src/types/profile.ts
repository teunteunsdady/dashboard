/** 프로필 및 기술 스택 관련 타입 정의 */

export interface Profile {
  name: string
  title: string
  bio?: string
  email?: string
  github?: string
  linkedin?: string
  /** Memoji 스타일 프로필 이미지 경로 */
  avatarImage?: string
  /** 이미지 없을 때 fallback 이모지 */
  avatarEmoji?: string
}

export interface Skill {
  id: string
  name: string
  category: 'frontend' | 'backend' | 'devops' | 'design' | 'other'
}

export type AppRole = 'owner' | 'readonly'

/** readonly 계정 데이터 범위 — full: 전체, personal_events: 개인 일정만 */
export type ReadonlyScope = 'full' | 'personal_events'

export interface UserProfile {
  app_role: AppRole
  data_owner_id: string | null
  readonly_scope: ReadonlyScope | null
}
