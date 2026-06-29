import type { Education } from '../../types/about'
import { Card } from '../ui/Card'

interface EducationCardProps {
  education: Education
}

/** 학력 — 자격증과 분리 */
export function EducationCard({ education }: EducationCardProps) {
  return (
    <Card>
      <h3 className="mb-3 text-lg font-semibold text-text-primary">
        Education
      </h3>
      <p className="text-sm font-medium text-text-primary">
        {education.school}
      </p>
      <p className="mt-0.5 text-xs text-text-secondary">
        {education.major} · {education.degree}
      </p>
      <p className="mt-1 text-xs text-text-secondary">{education.period}</p>
    </Card>
  )
}
