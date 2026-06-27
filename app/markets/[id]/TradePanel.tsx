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
      try {
        const res = await executeTradeAction(marketId, side, validShares)
        setResult(res.message)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.')
      }
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Place a Trade</h2>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setSide('yes')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            side === 'yes'
              ? 'bg-green-500 text-white'
              : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          YES
        </button>
        <button
          type="button"
          onClick={() => setSide('no')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            side === 'no'
              ? 'bg-red-500 text-white'
              : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          NO
        </button>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm text-gray-600" htmlFor="shares-input">
          Shares
        </label>
        <input
          id="shares-input"
          type="number"
          min={1}
          step={1}
          value={sharesInput}
          onChange={(e) => setSharesInput(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {validShares > 0 && (
        <div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Cost</span>
            <span className="font-medium">~{previewCost.toFixed(2)} crowns</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-gray-500">New price</span>
            <span className="font-medium">{newPricePct}% YES</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-gray-500">Avg price / share</span>
            <span className="font-medium">{avgPrice.toFixed(4)} crowns</span>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Final cost may differ slightly as the price moves.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleTrade}
        disabled={isPending || validShares === 0}
        className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed ${
          side === 'yes'
            ? 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'
            : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
        }`}
      >
        {isPending ? 'Processing…' : `Buy ${side.toUpperCase()}`}
      </button>

      {result && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {result}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
