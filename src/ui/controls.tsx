import { useId, type ReactNode } from 'react'
import clsx from 'clsx'
import styles from './controls.module.css'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  ends?: [string, string]
  format?: (v: number) => string
  onChange: (v: number) => void
}

export function Slider({ label, value, min, max, step = 0.01, ends, format, onChange }: SliderProps) {
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className={styles.slider}>
      <div className={styles.sliderHead}>
        <label htmlFor={id}>{label}</label>
        {format && <output htmlFor={id}>{format(value)}</output>}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {ends && (
        <div className={styles.ends} aria-hidden="true">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      )}
    </div>
  )
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <fieldset className={styles.segmented}>
      <legend>{label}</legend>
      <div>
        {options.map((o) => (
          <label key={o.value} className={clsx(o.value === value && styles.on)}>
            <input type="radio" name={label} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={styles.toggle}>
      <span>
        <span className={styles.toggleLabel}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} />
      <span className={styles.track} aria-hidden="true" />
    </label>
  )
}

export function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
    </div>
  )
}

export function IconButton({
  label,
  children,
  active,
  onClick,
  disabled,
  className
}: {
  label: string
  children: ReactNode
  active?: boolean
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      className={clsx(styles.iconButton, active && styles.active, className)}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
