interface SectionTitleProps {
  title: string
  subtitle?: string
  className?: string
}

/** 섹션 제목 + 부제목 공통 컴포넌트 */
export function SectionTitle({ title, subtitle, className = '' }: SectionTitleProps) {
  return (
    <div className={['mb-8', className].filter(Boolean).join(' ')}>
      <h2 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-text-secondary">{subtitle}</p>
      )}
    </div>
  )
}
