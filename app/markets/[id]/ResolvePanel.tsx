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
    <section className="border border-line-strong bg-surface p-4">
      <p className="eyebrow mb-3">Admin settlement</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleResolve('yes')}
          disabled={isPending}
          className="pressable min-h-11 flex-1 border border-accent px-2 text-xs font-bold text-accent hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending && pendingRes === 'yes' ? 'Resolving…' : 'Resolve YES'}
        </button>
        <button
          type="button"
          onClick={() => handleResolve('no')}
          disabled={isPending}
          className="pressable min-h-11 flex-1 border border-danger px-2 text-xs font-bold text-danger hover:bg-danger hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending && pendingRes === 'no' ? 'Resolving…' : 'Resolve NO'}
        </button>
      </div>
      {error && <p className="mt-3 border-l-2 border-danger bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
    </section>
  )
}
