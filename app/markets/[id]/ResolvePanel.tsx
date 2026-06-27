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
    <div className="rounded-2xl border border-[#EAE7E1] bg-white p-6">
      <p className="mb-4 text-xs font-medium text-[#71717A]">Admin · Resolve market</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleResolve('yes')}
          disabled={isPending}
          className="flex-1 rounded-lg border border-[#4A86C5]/30 py-2.5 text-sm font-semibold text-[#4A86C5] transition-all hover:bg-[#4A86C5]/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending && pendingRes === 'yes' ? 'Resolving…' : 'Resolve YES'}
        </button>
        <button
          type="button"
          onClick={() => handleResolve('no')}
          disabled={isPending}
          className="flex-1 rounded-lg border border-[#C0413B]/30 py-2.5 text-sm font-semibold text-[#C0413B] transition-all hover:bg-[#C0413B]/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending && pendingRes === 'no' ? 'Resolving…' : 'Resolve NO'}
        </button>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-[#C0413B]/8 px-4 py-3 text-sm text-[#C0413B]">
          {error}
        </p>
      )}
    </div>
  )
}
