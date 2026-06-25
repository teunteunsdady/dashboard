import type { Project } from '../types/project'

/** 포트폴리오 프로젝트 Mock 데이터 */
export const projectsData: Project[] = [
  {
    id: '1',
    title: 'CyanOrbit.yol',
    description:
      '개인 프로필, 포트폴리오, 일정 관리를 통합한 맞춤형 대시보드 웹 앱입니다.',
    tags: ['React', 'Tailwind CSS', 'TypeScript'],
    github: 'https://github.com',
    period: '2025.06 - 진행중',
  },
  {
    id: '2',
    title: 'Asset Tracker',
    description:
      '자산 일정과 구독 결제일을 한눈에 관리하는 개인 금융 대시보드입니다.',
    tags: ['React', 'Chart.js', 'Mock API'],
    period: '2025.03 - 2025.05',
  },
  {
    id: '3',
    title: 'Study Sprint Board',
    description:
      '학습 스프린트를 주간 단위로 계획하고 추적하는 칸반 보드 프로젝트입니다.',
    tags: ['Next.js', 'Prisma', 'PostgreSQL'],
    link: 'https://example.com',
    period: '2024.11 - 2025.01',
  },
]
