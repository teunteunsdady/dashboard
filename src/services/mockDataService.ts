/**
 * 데이터 접근 추상화 레이어
 * 현재는 Mock 데이터를 반환하며, 추후 API/DB 연동 시 이 파일만 교체하면 됩니다.
 */

import { profileData, skillsData } from '../data/profile'
import { projectsData } from '../data/projects'
import { eventsData, eventCategories } from '../data/events'
import type { Profile, Skill } from '../types/profile'
import type { Project } from '../types/project'
import type { CalendarEvent, EventCategoryMeta } from '../types/calendar'

export async function getProfile(): Promise<Profile> {
  return profileData
}

export async function getSkills(): Promise<Skill[]> {
  return skillsData
}

export async function getProjects(): Promise<Project[]> {
  return projectsData
}

export async function getEvents(): Promise<CalendarEvent[]> {
  return eventsData
}

export async function getEventCategories(): Promise<EventCategoryMeta[]> {
  return eventCategories
}
