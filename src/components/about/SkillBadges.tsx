import type { Skill } from '../../types/profile'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

interface SkillBadgesProps {
  skills: Skill[]
}

/** 보유 기술 스택을 뱃지 형태로 나열 */
export function SkillBadges({ skills }: SkillBadgesProps) {
  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-text-primary">
        Tech Stack
      </h3>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <Badge key={skill.id} label={skill.name} />
        ))}
      </div>
    </Card>
  )
}
