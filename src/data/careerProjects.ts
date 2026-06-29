import type { Project } from '../types/project'

/** 공개용 — 회사·프로젝트명 익명화 */
export const careerProjectsPublic: Project[] = [
  {
    id: 'career-1',
    kind: 'career',
    title: '생명보험사 SM',
    organization: '금융 SI',
    role: '방카슈랑스 운영',
    marketContext: '국내 상위 생명보험사 · 보험료 1~2위권',
    description:
      '보험 계약 전반 프로세스를 운영했습니다. 제휴사 배치(Batch) 개선으로 데이터 정합성과 처리 속도를 향상시켰습니다.',
    tags: ['Java', 'JSP', 'JavaScript', 'Oracle'],
    period: '2025.07 - 현재',
  },
  {
    id: 'career-2',
    kind: 'career',
    title: '카드사 금융 플랫폼',
    organization: '금융 SI',
    role: '이벤트·혜택 백엔드',
    marketContext: '카드사 슈퍼앱 · MAU 500만·회원 1,000만',
    description:
      '대고객 참여형 이벤트 API를 개발해 사용자 체류 시간을 늘렸습니다. 자산 서비스 마케팅 배너 시스템으로 맞춤형 혜택 전달력을 강화했습니다.',
    tags: ['Java', 'Spring Boot', 'Vue.js', 'JavaScript'],
    period: '2024.07 - 2024.11',
  },
  {
    id: 'career-3',
    kind: 'career',
    title: '저축은행 비대면 채널',
    organization: '금융 SI',
    role: '기술공통·인증',
    marketContext: '인터넷전문은행 · 비대면 대출·인증 중심',
    description:
      '비대면 채널 재구축에서 스크래핑 솔루션 교체·대응 개발로 대출 심사 정확도를 높였습니다. 로그인·인증센터 통합으로 접근성과 보안성을 개선했습니다.',
    tags: ['Java', 'JSP', 'JavaScript'],
    period: '2023.04 - 2024.01',
  },
  {
    id: 'career-4',
    kind: 'career',
    title: '생명보험사 디지털채널',
    organization: '금융 SI',
    role: '백오피스(어드민)',
    marketContext: '3대 생명보험사 · 장기보험 상위권',
    description:
      '상품 공시 프로세스 전산화로 대외 신뢰도와 업무 투명성을 확보했습니다. 개인·기업 고객 통합 정보 관리 기능으로 상담·관리 효율을 개선했습니다.',
    tags: ['Java', 'Spring', 'JavaScript', 'PostgreSQL'],
    period: '2022.03 - 2022.10',
  },
]

/** 비공개 — 키 입력 후에만 표시 */
export const careerProjectsPrivate: Project[] = [
  {
    id: 'career-1',
    kind: 'career',
    title: '삼성생명 SM',
    organization: '아시아나IDT · 금융컨설팅팀',
    role: '방카슈랑스 개발',
    marketContext: '삼성생명 · 보험료 1위권 · 방카 채널',
    description:
      '방카슈랑스 가설부터 청약·신계약까지 계약 전반 프로세스를 안정적으로 운영했습니다. 제휴사 배치(Batch) 개선으로 데이터 정합성과 처리 속도를 향상시켰습니다.',
    tags: ['Java', 'JSP', 'JavaScript', 'Oracle', 'Websquare'],
    period: '2025.07 - 현재',
  },
  {
    id: 'career-2',
    kind: 'career',
    title: '모니모 하반기 SR',
    organization: '아시아나IDT · 금융컨설팅팀',
    role: '컨텐츠·혜택 서비스 개발',
    marketContext: '모니모 · MAU 520만·회원 1,000만',
    description:
      '모니스쿨·건강스티커 등 대고객 참여형 이벤트를 개발해 사용자 체류 시간을 늘렸습니다. 자산 서비스 마케팅 배너 시스템으로 맞춤형 혜택 전달력을 강화했습니다.',
    tags: ['Java', 'Spring Boot', 'Vue.js', 'JavaScript'],
    period: '2024.07 - 2024.11',
  },
  {
    id: 'career-3',
    kind: 'career',
    title: 'SBI저축은행 비대면 채널 재구축',
    organization: '아시아나IDT · 금융컨설팅팀',
    role: '기술공통·인증 파트 개발',
    marketContext: 'SBI저축은행 · 정책·서민금융 비대면',
    description:
      '여신 통합 및 수신 비대면 채널 재구축 프로젝트에서 햇살론 스크래핑 솔루션 교체·대응 개발로 대출 심사 정확도를 높였습니다. 로그인·인증센터 통합으로 접근성과 보안성을 개선했습니다.',
    tags: ['Java', 'JSP', 'JavaScript'],
    period: '2023.04 - 2024.01',
  },
  {
    id: 'career-4',
    kind: 'career',
    title: '교보생명 디지털채널 통합 구축',
    organization: '아시아나IDT · 금융컨설팅팀',
    role: '백오피스(어드민) 개발',
    marketContext: '교보생명 · 3대 생명보험사',
    description:
      '보험 상품 공시 프로세스 전산화(공시실 구축)로 대외 신뢰도와 업무 투명성을 확보했습니다. 개인·기업 고객 통합 정보 관리 기능으로 상담·관리 효율을 개선했습니다.',
    tags: ['Java', 'Spring', 'JavaScript', 'PostgreSQL'],
    period: '2022.03 - 2022.10',
  },
]
