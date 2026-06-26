import { useEffect, useRef, useState } from 'react'
import {
  busStopOptions,
  stopDisplayName,
  stopOptionLabel,
  type BusStopOption,
} from '../../data/busStops'

interface BusStopPickerProps {
  value: string
  onChange: (stopId: string) => void
}

/** 모바일용 커스텀 정류장 선택기 */
export function BusStopPicker({ value, onChange }: BusStopPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const selected =
    busStopOptions.find((option) => option.id === value) ?? busStopOptions[0]

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const handleSelect = (option: BusStopOption) => {
    onChange(option.id)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={[
          'flex w-full items-center gap-3 rounded-2xl border bg-surface-card px-4 py-3.5 text-left shadow-sm transition-all',
          open
            ? 'border-main/40 ring-2 ring-main/15'
            : 'border-border/80 active:scale-[0.99]',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm"
          style={{
            backgroundColor: selected.accent,
            color: selected.accentText,
          }}
        >
          {selected.routeNumber}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium text-text-secondary">
            {selected.travelDirection} 방향
          </span>
          <span className="block truncate text-sm font-semibold text-text-primary">
            {stopDisplayName(selected)}
          </span>
        </span>
        <span
          className={[
            'text-text-secondary transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-border/80 bg-surface-card shadow-card-hover"
        >
          {busStopOptions.map((option) => {
            const isSelected = option.id === value

            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option)}
                className={[
                  'flex w-full items-center gap-3 border-b border-border/60 px-4 py-3.5 text-left last:border-b-0',
                  isSelected ? 'bg-main/5' : 'bg-surface-card active:bg-surface',
                ].join(' ')}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: option.accent,
                    color: option.accentText,
                  }}
                >
                  {option.routeNumber}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-primary">
                    {stopDisplayName(option)}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-secondary">
                    {stopOptionLabel(option)}
                  </span>
                </span>
                {isSelected && (
                  <span className="text-sm font-semibold text-main">✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
