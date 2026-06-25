import { useEffect, useState } from 'react'
import { ProfileCard } from '../components/about/ProfileCard'
import { SkillBadges } from '../components/about/SkillBadges'
import { ProjectCard } from '../components/about/ProjectCard'
import { SectionTitle } from '../components/ui/SectionTitle'
import { getProfile, getSkills, getProjects } from '../services/mockDataService'
import type { Profile, Skill } from '../types/profile'
import type { Project } from '../types/project'

/** About 페이지 — 프로필, 기술 스택, 프로젝트 포트폴리오 */
export function AboutPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    async function loadData() {
      const [profileRes, skillsRes, projectsRes] = await Promise.all([
        getProfile(),
        getSkills(),
        getProjects(),
      ])
      setProfile(profileRes)
      setSkills(skillsRes)
      setProjects(projectsRes)
    }
    loadData()
  }, [])

  if (!profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-main/20 border-t-main" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-96 bg-gradient-to-b from-main/5 via-sub/5 to-transparent" />

      <section className="space-y-6">
        <ProfileCard profile={profile} />
        <SkillBadges skills={skills} />
      </section>

      <section id="projects" className="mt-16 scroll-mt-20">
        <SectionTitle
          title="Projects"
          subtitle="진행했던 프로젝트와 포트폴리오"
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>
    </div>
  )
}
