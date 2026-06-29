/** About 페이지 부가 콘텐츠 타입 */

export type CertificationValidity =
  | { type: 'permanent' }
  | { type: 'limited'; expires: string }

export interface Certification {
  id: string
  name: string
  issuer: string
  /** 취득일 (YYYY.MM) */
  acquired: string
  validity: CertificationValidity
}

export interface Competency {
  id: string
  title: string
  description: string
}

export interface Education {
  school: string
  major: string
  degree: string
  period: string
}
