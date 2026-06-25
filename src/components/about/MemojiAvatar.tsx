interface MemojiAvatarProps {
  image?: string
  emoji?: string
  name?: string
}

/** 애플 Memoji 스티커 스타일 3D 캐릭터 아바타 */
export function MemojiAvatar({
  image,
  emoji = '🙂',
  name,
}: MemojiAvatarProps) {
  return (
    <div
      className="group relative shrink-0 p-2"
      aria-label={name ? `${name} 프로필` : '프로필'}
    >
      {/* 원 전체를 감싸는 블러 글로우 */}
      <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-sub/50 via-main/30 to-sub/40 blur-xl transition-all duration-300 group-hover:from-sub/60 group-hover:via-main/40 group-hover:to-sub/50" />

      {/* 원 전체 스티커 본체 */}
      <div className="relative h-32 w-32 overflow-hidden rounded-full bg-gradient-to-b from-sky-100 via-sky-50 to-blue-100 shadow-card ring-4 ring-white/90 md:h-36 md:w-36">
        {image ? (
          <img
            src={image}
            alt={name ? `${name} Memoji` : '프로필 캐릭터'}
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="select-none text-6xl transition-transform duration-300 group-hover:scale-110">
              {emoji}
            </span>
          </div>
        )}

        {/* 원 전체 상단 유리광 */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/50 via-white/10 to-transparent" />

        {/* 원 전체 하단 깊이감 */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-blue-200/25 via-transparent to-transparent" />
      </div>
    </div>
  )
}
