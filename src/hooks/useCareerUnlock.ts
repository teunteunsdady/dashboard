import { useCallback, useState } from 'react'
import {
  isCareerUnlocked as readUnlocked,
  isCareerUnlockConfigured,
  lockCareer,
  unlockCareer,
} from '../utils/careerUnlock'

/** 경력 상세 이력 잠금 해제 상태 */
export function useCareerUnlock() {
  const [unlocked, setUnlocked] = useState(readUnlocked)
  const configured = isCareerUnlockConfigured()

  const tryUnlock = useCallback((key: string) => {
    const ok = unlockCareer(key)
    if (ok) setUnlocked(true)
    return ok
  }, [])

  const lock = useCallback(() => {
    lockCareer()
    setUnlocked(false)
  }, [])

  return { unlocked, configured, tryUnlock, lock }
}
