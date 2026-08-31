import type { ReactNode } from 'react'

export function Tooltip({ label, hidden = false, children }: { label: string; hidden?: boolean; children: ReactNode }) {
  return (
    <span className={`tooltip-wrap ${hidden ? 'tooltip-disabled' : ''}`}>
      {children}
      {!hidden && <span className="tooltip-bubble" role="tooltip">{label}</span>}
    </span>
  )
}
