interface FieldLabelWithHintProps {
  label: string
  hint?: string
  htmlFor?: string
}

/** 폼 라벨 + ! 툴팁 */
export function FieldLabelWithHint({
  label,
  hint,
  htmlFor,
}: FieldLabelWithHintProps) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-text-primary"
      >
        {label}
      </label>
      {hint ? (
        <div className="group relative">
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-border/70 text-[11px] font-bold leading-none text-text-secondary transition-colors hover:border-main/25 hover:bg-main/5 hover:text-main"
            aria-label={`${label} 입력 안내`}
          >
            !
          </button>
          <div
            role="tooltip"
            className="pointer-events-none absolute left-0 top-full z-30 mt-1.5 w-52 rounded-xl border border-border/60 bg-surface-card px-3 py-2 text-xs leading-relaxed text-text-secondary opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            {hint}
          </div>
        </div>
      ) : null}
    </div>
  )
}
