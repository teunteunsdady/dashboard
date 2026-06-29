import { useAuth } from '../../contexts/AuthContext'

/** 읽기 전용 계정 안내 배너 */
export function ReadOnlyBanner() {
  const { isReadOnlyPersonal } = useAuth()

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {isReadOnlyPersonal
        ? '개인 일정 전용 읽기 계정입니다. 카테고리가 개인인 일정만 볼 수 있습니다.'
        : '읽기 전용 계정입니다. 일정·가계부를 볼 수만 있고 수정할 수 없습니다.'}
    </div>
  )
}
