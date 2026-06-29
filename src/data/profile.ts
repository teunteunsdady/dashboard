import type { Profile, Skill } from '../types/profile'

/** 개인 프로필 Mock 데이터 */
export const profileData: Profile = {
  name: '노경환',
  title: 'Backend // Vibe Coder',
  bio: '금융 SI·SM 백엔드 개발자입니다. Spring·배치·인증 시스템을 다뤄 왔고, 개인 프로젝트로 CyanOrbit.yol을 운영합니다.',
  email: 'ghroh0915@gmail.com',
  github: 'https://github.com/teunteunsdady/dashboard',
  avatarImage: '/avatar/memoji-avatar.png',
}

const CATEGORY_ORDER: Skill['category'][] = [
  'frontend',
  'backend',
  'devops',
  'design',
  'other',
]

/** 보유 기술 스택 Mock 데이터 */
export const skillsData: Skill[] = [
  { id: '1', name: 'Java', category: 'backend' },
  { id: '2', name: 'Spring Boot', category: 'backend' },
  { id: '3', name: 'MyBatis', category: 'backend' },
  { id: '4', name: 'Oracle', category: 'backend' },
  { id: '5', name: 'PostgreSQL', category: 'backend' },
  { id: '7', name: 'JavaScript', category: 'frontend' },
  { id: '8', name: 'Vue.js', category: 'frontend' },
  { id: '9', name: 'React', category: 'frontend' },
  { id: '10', name: 'TypeScript', category: 'frontend' },
  { id: '11', name: 'Tailwind CSS', category: 'frontend' },
  { id: '12', name: 'Supabase', category: 'devops' },
  { id: '13', name: 'AWS', category: 'devops' },
]

export const skillCategoryLabels: Record<Skill['category'], string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  devops: 'Infra',
  design: 'Design',
  other: 'Tools',
}

export function groupSkillsByCategory(skills: Skill[]): [Skill['category'], Skill[]][] {
  const map = new Map<Skill['category'], Skill[]>()
  for (const skill of skills) {
    const list = map.get(skill.category) ?? []
    list.push(skill)
    map.set(skill.category, list)
  }
  return CATEGORY_ORDER.filter((cat) => map.has(cat)).map((cat) => [
    cat,
    map.get(cat)!,
  ])
}
