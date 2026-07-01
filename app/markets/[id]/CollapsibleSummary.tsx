'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function CollapsibleSummary({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.8}
        />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}
