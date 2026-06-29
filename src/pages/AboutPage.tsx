import { useEffect, useState } from 'react'
import { CertificationsCard } from '../components/about/CertificationsCard'
import { EducationCard } from '../components/about/EducationCard'
import { CareerSection } from '../components/about/CareerSection'
import { CoreCompetencies } from '../components/about/CoreCompetencies'
import { ProfileCard } from '../components/about/ProfileCard'
import { SkillBadges } from '../components/about/SkillBadges'
import { ProjectCard } from '../components/about/ProjectCard'
import { SectionTitle } from '../components/ui/SectionTitle'
import {
  certificationsData,
  competenciesData,
  educationData,
} from '../data/aboutContent'
import { personalProjects } from '../data/projects'
import { getProfile, getSkills } from '../services/mockDataService'
import type { Profile, Skill } from '../types/profile'

/** About 페이지 — 프로필, 역량·자격, 기술 스택, 프로젝트 */
export function AboutPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])

  useEffect(() => {
    async function loadData() {
      const [profileRes, skillsRes] = await Promise.all([
        getProfile(),
        getSkills(),
      ])
      setProfile(profileRes)
      setSkills(skillsRes)
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

        <div className="grid gap-6 lg:grid-cols-2">
          <CoreCompetencies items={competenciesData} />
          <div className="flex flex-col gap-6">
            <CertificationsCard certifications={certificationsData} />
            <EducationCard education={educationData} />
          </div>
        </div>

        <SkillBadges skills={skills} />
      </section>

      <section id="projects" className="mt-16 scroll-mt-20 space-y-12">
        <CareerSection />

        <div>
          <SectionTitle
            title="Side Projects"
            subtitle="개인 프로젝트"
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {personalProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
