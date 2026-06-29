import { useAppUpdate } from '../../hooks/useAppUpdate'
import { isStandalonePwa, reloadApp } from '../../utils/pwa'

/** 새 버전 배포 또는 홈 화면 앱 새로고침 안내 */
export function AppUpdateBanner() {
  const { updateReady, applyUpdate } = useAppUpdate()
  const standalone = isStandalonePwa()

  if (!updateReady && !standalone) return null

  if (updateReady) {
    return (
      <div className="border-b border-main/20 bg-main/5 px-4 py-2.5 text-center text-sm text-text-secondary">
        새 버전이 있습니다.{' '}
        <button
          type="button"
          onClick={() => void applyUpdate()}
          className="font-medium text-main underline-offset-2 hover:underline"
        >
          앱 새로고침
        </button>
      </div>
    )
  }

  return (
    <div className="border-b border-border/70 bg-surface px-4 py-2 text-center text-xs text-text-secondary">
      홈 화면 앱은 아래로 당겨 새로고침이 안 됩니다. 메뉴 →{' '}
      <button
        type="button"
        onClick={reloadApp}
        className="font-medium text-main underline-offset-2 hover:underline"
      >
        앱 새로고침
      </button>
    </div>
  )
}
