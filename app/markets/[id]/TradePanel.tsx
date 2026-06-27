'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { priceYes, tradeCost } from '@/lib/lmsr'
import { executeTradeAction } from '@/app/actions/trade'

interface TradePanelProps {
  marketId: string
  qYes: number
  qNo: number
  b: number
}

export default function TradePanel({ marketId, qYes, qNo, b }: TradePanelProps) {
  const router = useRouter()
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [sharesInput, setSharesInput] = useState('10')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const shares = parseInt(sharesInput, 10)
  const validShares = !isNaN(shares) && shares > 0 ? shares : 0

  const previewCost = validShares > 0 ? tradeCost(qYes, qNo, b, side, validShares) : 0
  const newQYes = side === 'yes' ? qYes + validShares : qYes
  const newQNo = side === 'no' ? qNo + validShares : qNo
  const newPricePct = Math.round(priceYes(newQYes, newQNo, b) * 100)
  const avgPrice = validShares > 0 ? previewCost / validShares : 0

  function handleTrade() {
    if (validShares === 0) return
    setResult(null)
    setError(null)
    startTransition(async () => {
      const res = await executeTradeAction(marketId, side, validShares)
      if ('error' in res) {
        setError(res.error)
      } else {
        setResult(
          `Bought ${validShares} ${side.toUpperCase()} for ${res.data.cost.toFixed(2)} crowns. Balance: ${res.data.new_crowns.toFixed(2)} crowns.`,
        )
        router.refresh()
      }
    })
  }

  return (
    <div className="rounded-2xl border border-[#EAE7E1] bg-white p-7">
      <h2 className="mb-6 text-sm font-medium text-[#71717A]">Place a trade</h2>

      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => setSide('yes')}
          className={`flex-1 rounded-lg py-3 text-sm font-semibold transition-all ${
            side === 'yes'
              ? 'bg-[#4A86C5] text-white'
              : 'border border-[#EAE7E1] text-[#71717A] hover:border-[#4A86C5]/40 hover:text-[#4A86C5]'
          }`}
        >
          YES
        </button>
        <button
          type="button"
          onClick={() => setSide('no')}
          className={`flex-1 rounded-lg py-3 text-sm font-semibold transition-all ${
            side === 'no'
              ? 'bg-[#C0413B] text-white'
              : 'border border-[#EAE7E1] text-[#71717A] hover:border-[#C0413B]/40 hover:text-[#C0413B]'
          }`}
        >
          NO
        </button>
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-sm font-medium text-[#18181B]" htmlFor="shares-input">
          Shares
        </label>
        <input
          id="shares-input"
          type="number"
          min={1}
          step={1}
          value={sharesInput}
          onChange={(e) => setSharesInput(e.target.value)}
          className="w-full rounded-lg border border-[#EAE7E1] bg-[#FBFAF8] px-4 py-3 text-sm text-[#18181B] placeholder:text-[#71717A] focus:border-[#4A86C5] focus:outline-none focus:ring-2 focus:ring-[#4A86C5]/15"
        />
      </div>

      {validShares > 0 && (
        <div className="mb-5 rounded-xl bg-[#FBFAF8] p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[#71717A]">Cost</span>
            <span className="font-medium text-[#18181B]">~{previewCost.toFixed(2)} crowns</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-[#71717A]">New price</span>
            <span className="font-medium text-[#18181B]">{newPricePct}% YES</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-[#71717A]">Avg per share</span>
            <span className="font-medium text-[#18181B]">{avgPrice.toFixed(4)} crowns</span>
          </div>
          <p className="mt-3 text-xs text-[#71717A]">
            Final cost may differ slightly as the price moves.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleTrade}
        disabled={isPending || validShares === 0}
        className={`w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${
          side === 'yes' ? 'bg-[#4A86C5]' : 'bg-[#C0413B]'
        } hover:opacity-90`}
      >
        {isPending ? 'Processing…' : `Buy ${side.toUpperCase()}`}
      </button>

      {result && (
        <p className="mt-4 rounded-xl bg-[#2E7D5B]/8 px-4 py-3 text-sm text-[#2E7D5B]">
          {result}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-[#C0413B]/8 px-4 py-3 text-sm text-[#C0413B]">
          {error}
        </p>
      )}
    </div>
  )
}
