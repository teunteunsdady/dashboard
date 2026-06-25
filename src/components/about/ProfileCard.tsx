import type { Profile } from '../../types/profile'
import { Card } from '../ui/Card'
import { MemojiAvatar } from './MemojiAvatar'

interface ProfileCardProps {
  profile: Profile
}

/** 개인 프로필 카드 — Memoji 아바타, 이름, 직함, 연락처 */
export function ProfileCard({ profile }: ProfileCardProps) {
  const hasBio = Boolean(profile.bio?.trim())
  const hasContact = Boolean(profile.email || profile.github || profile.linkedin)

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-main/20 to-sub/30 blur-2xl" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
        <MemojiAvatar
          image={profile.avatarImage}
          emoji={profile.avatarEmoji}
          name={profile.name}
        />

        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-sub">
            About Me
          </p>
          <h1 className="mt-1 text-3xl font-bold text-text-primary md:text-4xl">
            {profile.name}
          </h1>
          <p className="mt-1 text-lg font-medium text-main">{profile.title}</p>

          {hasBio ? (
            <p className="mt-3 max-w-xl leading-relaxed text-text-secondary">
              {profile.bio}
            </p>
          ) : (
            <p className="mt-3 text-sm italic text-text-secondary/60">
              소개를 준비 중이에요.
            </p>
          )}

          {hasContact && (
            <div className="mt-5 flex flex-wrap gap-3">
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="rounded-xl bg-main px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-main-dark"
                >
                  Contact
                </a>
              )}
              {profile.github && (
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-main/30 hover:text-main"
                >
                  GitHub
                </a>
              )}
              {profile.linkedin && (
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-main/30 hover:text-main"
                >
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
