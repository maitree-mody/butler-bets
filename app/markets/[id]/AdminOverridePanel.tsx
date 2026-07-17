'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reresolveMarketAction } from '@/app/actions/resolve'

export default function AdminOverridePanel({
  marketId,
  currentResolution,
}: {
  marketId: string
  currentResolution: 'yes' | 'no'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const correctedResolution = currentResolution === 'yes' ? 'no' : 'yes'

  function handleOverride() {
    const confirmed = window.confirm(
      `This will reverse the ${currentResolution.toUpperCase()} payout and re-pay every holder as if ${correctedResolution.toUpperCase()} had won instead. This cannot be undone. Continue?`,
    )
    if (!confirmed) return

    setError(null)
    startTransition(async () => {
      const res = await reresolveMarketAction(marketId, correctedResolution)
      if ('error' in res) {
        setError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <section className="rounded-2xl border border-danger/25 bg-danger/5 p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-danger">Admin: dispute override</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Resolved {currentResolution.toUpperCase()}. If that call was wrong, correct it below — payouts are
        reversed and re-run atomically for every position holder.
      </p>
      <button
        type="button"
        onClick={handleOverride}
        disabled={isPending}
        className="pressable w-full rounded-lg border border-danger py-2.5 text-sm font-bold text-danger transition-colors hover:bg-danger hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? 'Correcting…' : `Correct to ${correctedResolution.toUpperCase()}`}
      </button>
      {error && <p className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
    </section>
  )
}
