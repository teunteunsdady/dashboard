import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

/** 공통 카드 UI — 둥근 모서리와 가벼운 그림자 적용 */
export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl border border-border bg-surface-card p-6 shadow-card',
        hover ? 'transition-shadow duration-300 hover:shadow-card-hover' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
