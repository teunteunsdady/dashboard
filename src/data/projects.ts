import type { Project } from '../types/project'
import { careerProjectsPublic } from './careerProjects'

export { careerProjectsPublic, careerProjectsPrivate } from './careerProjects'

/** 개인 프로젝트 */
export const personalProjects: Project[] = [
  {
    id: 'personal-1',
    kind: 'personal',
    title: 'CyanOrbit.yol',
    role: '개인 대시보드 · 풀스택',
    description:
      '일정·가계부·버스 도착 정보를 모은 개인 대시보드. React + Supabase로 직접 개발·운영 중입니다.',
    tags: ['React', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Vite'],
    github: 'https://github.com/teunteunsdady/dashboard',
    period: '2025.06 - 진행중',
  },
]

/** mockDataService 등 — 공개 데이터만 */
export const projectsData: Project[] = [
  ...careerProjectsPublic,
  ...personalProjects,
]
