/** iOS/Android 홈 화면에 추가한 standalone PWA인지 */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  )
}

/** 앱 전체 새로고침 (iOS 홈 화면 앱에서 당겨서 새로고침 대체) */
export function reloadApp(): void {
  window.location.reload()
}
