import type { Profile, Skill } from '../types/profile'

/** 개인 프로필 Mock 데이터 */
export const profileData: Profile = {
  name: '노경환',
  title: 'Backend // Vibe Coder',
  bio: '',
  avatarImage: '/avatar/memoji-avatar.png',
}

/** 보유 기술 스택 Mock 데이터 */
export const skillsData: Skill[] = [
  { id: '1', name: 'React', category: 'frontend' },
  { id: '2', name: 'Node.js', category: 'backend' },
  { id: '3', name: 'TypeScript', category: 'frontend' },
  { id: '4', name: 'Java', category: 'backend' },
  { id: '5', name: 'JavaScript', category: 'frontend' },
]
