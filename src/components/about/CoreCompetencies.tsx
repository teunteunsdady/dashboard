import type { Competency } from '../../types/about'
import { Card } from '../ui/Card'

interface CoreCompetenciesProps {
  items: Competency[]
}

/** 핵심 역량 — 도메인·업무 중심 */
export function CoreCompetencies({ items }: CoreCompetenciesProps) {
  return (
    <Card className="h-full">
      <h3 className="text-lg font-semibold text-text-primary">주요 업무 영역</h3>
      <p className="mb-4 mt-1 text-xs text-text-secondary">
        Tech Stack이 쓰는 기술 목록이라면, 여기는 실무에서 맡아 온 일입니다.
      </p>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-main"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
