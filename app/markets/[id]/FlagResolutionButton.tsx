'use client'

import { useState, useTransition } from 'react'
import { Flag } from 'lucide-react'
import { flagResolutionAction } from '@/app/actions/resolve'

export default function FlagResolutionButton({ marketId }: { marketId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <p className="mt-2 text-xs font-medium text-muted-foreground">
        Flag submitted — an admin will review this resolution.
      </p>
    )
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="pressable mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-danger"
      >
        <Flag className="h-3 w-3" strokeWidth={1.8} />
        Flag this resolution
      </button>
    )
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const res = await flagResolutionAction(marketId, reason)
      if ('error' in res) {
        setError(res.error)
      } else {
        setSubmitted(true)
      }
    })
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-background p-3">
      <label htmlFor="flag-reason" className="mb-1.5 block text-xs font-semibold text-foreground">
        Why should this resolution be reviewed?
      </label>
      <textarea
        id="flag-reason"
        rows={3}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. the source of truth linked in the resolution criteria actually says the opposite happened…"
        className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-columbia"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || reason.trim().length === 0}
          className="pressable rounded-lg bg-danger px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? 'Submitting…' : 'Submit flag'}
        </button>
        <button
          type="button"
          onClick={() => { setExpanded(false); setError(null) }}
          className="pressable rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-columbia hover:text-columbia"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-danger" role="alert">{error}</p>}
    </div>
  )
}
