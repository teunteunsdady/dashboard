import type { Certification, Competency, Education } from '../types/about'

export const competenciesData: Competency[] = [
  {
    id: '1',
    title: '금융 SI · SM',
    description: '보험·저축은행·카드사 플랫폼 운영·고도화',
  },
  {
    id: '2',
    title: '백엔드 · DB · 배치',
    description: 'Spring REST API, Oracle·PostgreSQL, Control-M',
  },
  {
    id: '3',
    title: '대고객 · 인증',
    description: '이벤트·혜택, 로그인·인증센터',
  },
]

const certificationsRaw: Certification[] = [
  {
    id: '3',
    name: 'AWS Solutions Architect',
    issuer: 'Amazon Web Services',
    acquired: '2025.10',
    validity: { type: 'limited', expires: '2028.10' },
  },
  {
    id: '1',
    name: '정보처리기사',
    issuer: '한국산업인력공단',
    acquired: '2023.06',
    validity: { type: 'permanent' },
  },
  {
    id: '2',
    name: 'SQLD',
    issuer: '한국데이터산업진흥원',
    acquired: '2023.04',
    validity: { type: 'permanent' },
  },
]

/** 취득일 최신순 */
export const certificationsData = [...certificationsRaw].sort((a, b) =>
  b.acquired.localeCompare(a.acquired),
)

export const educationData: Education = {
  school: '경북대학교',
  major: '컴퓨터공학',
  degree: '학사',
  period: '2014.03 - 2021.08',
}

export function formatCertificationPeriod(cert: Certification): string {
  if (cert.validity.type === 'permanent') {
    return `${cert.acquired} · 영구`
  }
  return `${cert.acquired} ~ ${cert.validity.expires}`
}
