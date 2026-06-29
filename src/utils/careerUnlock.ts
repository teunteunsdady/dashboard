import { STORAGE_PREFIX } from '../constants/brand'

const UNLOCK_STORAGE_KEY = `${STORAGE_PREFIX}-career-unlocked`

export function isCareerUnlockConfigured(): boolean {
  return Boolean(import.meta.env.VITE_CAREER_UNLOCK_KEY?.trim())
}

export function isCareerUnlocked(): boolean {
  if (!isCareerUnlockConfigured()) return false
  try {
    return localStorage.getItem(UNLOCK_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function verifyCareerUnlockKey(input: string): boolean {
  const expected = import.meta.env.VITE_CAREER_UNLOCK_KEY?.trim()
  if (!expected) return false
  return input.trim() === expected
}

export function unlockCareer(key: string): boolean {
  if (!verifyCareerUnlockKey(key)) return false
  try {
    localStorage.setItem(UNLOCK_STORAGE_KEY, '1')
  } catch {
    return false
  }
  return true
}

export function lockCareer(): void {
  try {
    localStorage.removeItem(UNLOCK_STORAGE_KEY)
  } catch {
    // ignore
  }
}
