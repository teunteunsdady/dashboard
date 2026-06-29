import { useState } from 'react'
import {
  careerProjectsPrivate,
  careerProjectsPublic,
} from '../../data/careerProjects'
import { useCareerUnlock } from '../../hooks/useCareerUnlock'
import { ProjectCard } from './ProjectCard'
import { SectionTitle } from '../ui/SectionTitle'

const fieldClass =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-main focus:ring-2 focus:ring-main/20'

/** 경력 프로젝트 — 기본 익명, 키 입력 시 상세 공개 */
export function CareerSection() {
  const { unlocked, configured, tryUnlock, lock } = useCareerUnlock()
  const [keyInput, setKeyInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const projects = unlocked ? careerProjectsPrivate : careerProjectsPublic
  const subtitle = unlocked
    ? '아시아나IDT 금융컨설팅팀 · 총 4년 (2022.02 -)'
    : '금융 SI · 총 4년 (2022.02 -)'

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!keyInput.trim()) {
      setError('키를 입력해 주세요.')
      return
    }
    if (!tryUnlock(keyInput)) {
      setError('키가 올바르지 않습니다.')
      return
    }
    setKeyInput('')
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle
          title="Career"
          subtitle={subtitle}
          className="mb-0"
        />
        {unlocked ? (
          <button
            type="button"
            onClick={() => {
              lock()
              setError(null)
            }}
            className="shrink-0 self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:border-main/30 hover:text-main sm:self-auto"
          >
            다시 잠금
          </button>
        ) : (
          <span className="shrink-0 self-start rounded-full bg-surface px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-border/70 sm:self-auto">
            요약 버전
          </span>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {configured && !unlocked && (
        <form
          onSubmit={handleUnlock}
          className="mt-6 rounded-xl border border-border/70 bg-surface px-4 py-4"
        >
          <p className="text-sm font-medium text-text-primary">
            상세 이력 열람
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            채용 담당자 등에게 받은 키를 입력하면 회사·프로젝트명이 포함된
            상세 이력을 볼 수 있습니다.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value)
                setError(null)
              }}
              placeholder="열람 키"
              className={fieldClass}
              autoComplete="off"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-main px-4 py-2 text-sm font-medium text-white hover:bg-main-dark"
            >
              확인
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
        </form>
      )}
    </div>
  )
}
