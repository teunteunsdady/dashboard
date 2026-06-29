import type { Project } from '../../types/project'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

interface ProjectCardProps {
  project: Project
}

/** 포트폴리오 프로젝트 단일 카드 */
export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card hover className="flex h-full flex-col">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-text-primary">
            {project.title}
          </h3>
          {(project.organization || project.role) && (
            <p className="mt-1 text-xs text-text-secondary">
              {[project.organization, project.role].filter(Boolean).join(' · ')}
            </p>
          )}
          {project.marketContext && (
            <p className="mt-2 truncate rounded-lg bg-main/5 px-2.5 py-2 text-xs text-text-secondary">
              {project.marketContext}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs text-text-secondary">
          {project.period}
        </span>
      </div>

      <p className="mb-4 flex-1 text-sm leading-relaxed text-text-secondary">
        {project.description}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <Badge key={tag} label={tag} variant="neutral" />
        ))}
      </div>

      <div className="flex gap-3 text-sm">
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-main hover:text-main-dark"
          >
            GitHub →
          </a>
        )}
        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-sub hover:text-main"
          >
            Live Demo →
          </a>
        )}
      </div>
    </Card>
  )
}
