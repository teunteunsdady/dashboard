import { useCallback, useEffect, useState } from 'react'
import { reloadApp } from '../utils/pwa'
import { isWebPushSupported } from '../utils/webPush'

/** Service Worker 새 버전 감지 및 앱 새로고침 */
export function useAppUpdate() {
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    if (!isWebPushSupported()) return

    const onControllerChange = () => {
      setUpdateReady(true)
    }

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange,
    )

    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.update()

        if (registration.waiting) {
          setUpdateReady(true)
        }
      } catch {
        // ignore
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdate()
      }
    }

    void checkForUpdate()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange,
      )
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const applyUpdate = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
    } catch {
      // ignore
    }

    reloadApp()
  }, [])

  return { updateReady, applyUpdate }
}
