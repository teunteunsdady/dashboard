import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { FieldLabelWithHint } from './FieldLabelWithHint'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  hint?: string
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  required?: boolean
  disabled?: boolean
  placeholder?: string
  /** 왼쪽 아이콘·색 점 등 */
  leading?: ReactNode
  className?: string
}

function SelectChevron() {
  return (
    <svg
      className="ui-select-chevron-icon"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/** 공통 셀렉트 — 커스텀 드롭다운 (`.ui-select` 스타일, index.css) */
export function Select({
  label,
  hint,
  id: idProp,
  name,
  value,
  onChange,
  options,
  required,
  disabled,
  placeholder,
  leading,
  className = '',
}: SelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const autoId = useId()
  const id = idProp ?? autoId
  const listboxId = `${id}-listbox`

  const selectedOption = options.find((option) => option.value === value)
  const displayLabel = selectedOption?.label ?? placeholder ?? ''

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setOpen(false)
  }

  return (
    <div className={className}>
      {label && (
        <FieldLabelWithHint label={label} hint={hint} htmlFor={id} />
      )}

      <div ref={rootRef} className="ui-select-wrap">
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-required={required || undefined}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={[
            'ui-select',
            leading ? 'ui-select--with-leading' : '',
            open ? 'ui-select--open' : '',
            !selectedOption && placeholder ? 'text-text-secondary' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {leading && <span className="ui-select-leading">{leading}</span>}
          <span className="ui-select-value">{displayLabel}</span>
          <span
            className={[
              'ui-select-chevron',
              open ? 'ui-select-chevron--open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          >
            <SelectChevron />
          </span>
        </button>

        {open && (
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={id}
            className="ui-select-menu picker-scroll"
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(option.value)}
                  className={[
                    'ui-select-option',
                    isSelected ? 'ui-select-option--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <svg
                      className="ui-select-check"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0l-3.25-3.25a1 1 0 111.42-1.42l2.54 2.54 6.54-6.54a1 1 0 011.42 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {name ? <input type="hidden" name={name} value={value} /> : null}
      </div>
    </div>
  )
}
