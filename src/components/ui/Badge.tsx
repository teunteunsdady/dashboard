interface BadgeProps {
  label: string
  variant?: 'main' | 'sub' | 'neutral'
}

/** 기술 스택·태그용 뱃지 컴포넌트 */
export function Badge({ label, variant = 'sub' }: BadgeProps) {
  const variantStyles = {
    main: 'bg-main/10 text-main',
    sub: 'bg-sub/15 text-main-dark',
    neutral: 'bg-surface text-text-secondary border border-border',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${variantStyles[variant]}`}
    >
      {label}
    </span>
  )
}
