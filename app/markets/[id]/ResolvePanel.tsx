'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resolveMarketAction } from '@/app/actions/resolve'

export default function ResolvePanel({ marketId }: { marketId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingRes, setPendingRes] = useState<'yes' | 'no' | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleResolve(resolution: 'yes' | 'no') {
    setError(null)
    setPendingRes(resolution)
    startTransition(async () => {
      const res = await resolveMarketAction(marketId, resolution)
      if ('error' in res) {
        setError(res.error)
        setPendingRes(null)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Market resolution</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleResolve('yes')}
          disabled={isPending}
          className="pressable flex-1 rounded-lg border border-columbia py-2.5 text-sm font-bold text-columbia transition-colors hover:bg-columbia hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending && pendingRes === 'yes' ? 'Resolving…' : 'Resolve YES'}
        </button>
        <button
          type="button"
          onClick={() => handleResolve('no')}
          disabled={isPending}
          className="pressable flex-1 rounded-lg border border-danger py-2.5 text-sm font-bold text-danger transition-colors hover:bg-danger hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending && pendingRes === 'no' ? 'Resolving…' : 'Resolve NO'}
        </button>
      </div>
      {error && <p className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
    </section>
  )
}
