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
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <p className="mb-3 text-sm font-semibold text-amber-800">Admin: resolve this market</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleResolve('yes')}
          disabled={isPending}
          className="flex-1 rounded-lg bg-green-500 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && pendingRes === 'yes' ? 'Resolving…' : 'Resolve YES'}
        </button>
        <button
          type="button"
          onClick={() => handleResolve('no')}
          disabled={isPending}
          className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && pendingRes === 'no' ? 'Resolving…' : 'Resolve NO'}
        </button>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
