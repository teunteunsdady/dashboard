import type { Certification } from '../../types/about'
import { formatCertificationPeriod } from '../../data/aboutContent'
import { Card } from '../ui/Card'

interface CertificationsCardProps {
  certifications: Certification[]
}

/** 자격증 — 영구/기간 구분, 최신순 */
export function CertificationsCard({ certifications }: CertificationsCardProps) {
  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-text-primary">
        Certifications
      </h3>
      <ul className="space-y-3">
        {certifications.map((cert) => {
          const isPermanent = cert.validity.type === 'permanent'
          return (
            <li
              key={cert.id}
              className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">
                    {cert.name}
                  </p>
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      isPermanent
                        ? 'bg-main/10 text-main'
                        : 'bg-surface text-text-secondary ring-1 ring-border/70',
                    ].join(' ')}
                  >
                    {isPermanent ? '영구' : '기간'}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-text-secondary">
                  {cert.issuer}
                </p>
              </div>
              <span className="shrink-0 text-right text-xs text-text-secondary">
                {formatCertificationPeriod(cert)}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
