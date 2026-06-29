import { useId } from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

/** on/off 스위치 — 행 전체 터치 영역 (모바일 44px 이상) */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: ToggleProps) {
  const id = useId()

  const handleToggle = () => {
    if (disabled) return
    onChange(!checked)
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={handleToggle}
        className="flex w-full touch-manipulation items-center justify-between gap-3 px-3 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-main/30 disabled:opacity-50"
      >
        <div className="min-w-0 flex-1">
          <span
            id={`${id}-label`}
            className="block text-sm font-medium text-text-primary"
          >
            {label}
          </span>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
              {description}
            </p>
          )}
        </div>
        <span
          aria-hidden
          className={[
            'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
            checked ? 'bg-main' : 'bg-border',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform',
              checked ? 'translate-x-[22px]' : 'translate-x-0.5',
            ].join(' ')}
          />
        </span>
      </button>
    </div>
  )
}
