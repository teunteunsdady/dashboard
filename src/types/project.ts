/** 포트폴리오 프로젝트 관련 타입 정의 */

export interface Project {
  id: string
  title: string
  description: string
  tags: string[]
  link?: string
  github?: string
  period: string
}
