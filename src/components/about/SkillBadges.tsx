import type { Skill } from '../../types/profile'
import {
  groupSkillsByCategory,
  skillCategoryLabels,
} from '../../data/profile'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

interface SkillBadgesProps {
  skills: Skill[]
}

/** 보유 기술 스택 — 카테고리별 뱃지 */
export function SkillBadges({ skills }: SkillBadgesProps) {
  const grouped = groupSkillsByCategory(skills)

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-text-primary">
        Tech Stack
      </h3>
      <div className="space-y-4">
        {grouped.map(([category, items]) => (
          <div key={category}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {skillCategoryLabels[category]}
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((skill) => (
                <Badge key={skill.id} label={skill.name} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
