interface SectionTitleProps {
  title: string
  subtitle?: string
}

/** 섹션 제목 + 부제목 공통 컴포넌트 */
export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-text-secondary">{subtitle}</p>
      )}
    </div>
  )
}
