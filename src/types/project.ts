/** 포트폴리오 프로젝트 관련 타입 정의 */

export type ProjectKind = 'career' | 'personal'

export interface Project {
  id: string
  title: string
  description: string
  tags: string[]
  period: string
  kind: ProjectKind
  organization?: string
  role?: string
  /** 업계 위치·서비스 규모 등 간략 맥락 */
  marketContext?: string
  link?: string
  github?: string
}
