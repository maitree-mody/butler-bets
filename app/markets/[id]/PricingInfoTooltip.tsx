'use client'

import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'

const TITLE = 'How prices & payouts work'
const COPY =
  'Butler Bets uses play-money Crowns. As students buy and sell YES or NO shares, prices update automatically to reflect market sentiment. When the market closes, it is resolved YES or NO based on what happened. Winning shares pay 1 Crown each; losing shares are worth 0.'

export default function PricingInfoTooltip() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={TITLE}
        className={`pressable grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-150 ease-out ${
          open
            ? 'border-columbia bg-columbia-soft text-columbia'
            : 'border-border bg-muted text-muted-foreground hover:border-columbia/40 hover:bg-columbia-soft hover:text-columbia'
        }`}
      >
        <Info className="h-3 w-3" strokeWidth={2.25} />
      </button>
      {open && (
        <div className="reveal absolute left-1/2 top-full z-20 mt-2.5 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2">
          <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-[2px] border-l border-t border-border bg-card" />
          <div className="relative rounded-xl border border-border bg-card p-4 text-left shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.03]">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold tracking-wide text-columbia-deep">
              <Info className="h-3 w-3 text-columbia" strokeWidth={2.5} />
              {TITLE}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{COPY}</p>
          </div>
        </div>
      )}
    </span>
  )
}
