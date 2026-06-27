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
  availableBalance: number
}

export default function TradePanel({ marketId, qYes, qNo, b, availableBalance }: TradePanelProps) {
  const router = useRouter()
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [sharesInput, setSharesInput] = useState('10')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const shares = parseInt(sharesInput, 10)
  const validShares = !isNaN(shares) && shares > 0 ? shares : 0
  const currentYesPrice = priceYes(qYes, qNo, b)
  const currentSidePrice = side === 'yes' ? currentYesPrice : 1 - currentYesPrice
  const previewCost = validShares > 0 ? tradeCost(qYes, qNo, b, side, validShares) : 0
  const newQYes = side === 'yes' ? qYes + validShares : qYes
  const newQNo = side === 'no' ? qNo + validShares : qNo
  const newYesPrice = priceYes(newQYes, newQNo, b)
  const newSidePrice = side === 'yes' ? newYesPrice : 1 - newYesPrice
  const estimatedPayout = validShares
  const potentialProfit = estimatedPayout - previewCost
  const balanceAfter = availableBalance - previewCost

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
    <section id="trade-ticket" className="scroll-mt-20 rounded-xl border border-line bg-white p-5" aria-labelledby="trade-ticket-title">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="trade-ticket-title" className="text-base font-semibold text-ink">Trade ticket</h2>
        <div className="text-right">
          <p className="text-xs text-ink-soft">Available</p>
          <p className="font-numeric text-sm font-bold text-ink">{availableBalance.toFixed(2)} crowns</p>
        </div>
      </div>

      <fieldset className="mb-4">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Position</legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={side === 'yes'}
            onClick={() => setSide('yes')}
            className={`pressable rounded-lg px-3 py-3 text-left transition-colors ${
              side === 'yes'
                ? 'bg-accent text-white'
                : 'border border-line bg-white text-accent hover:bg-accent-soft'
            }`}
          >
            <span className="block text-xs font-bold uppercase tracking-wide">Yes</span>
            <span className="font-numeric mt-0.5 block text-xl font-bold">{Math.round(currentYesPrice * 100)}¢</span>
          </button>
          <button
            type="button"
            aria-pressed={side === 'no'}
            onClick={() => setSide('no')}
            className={`pressable rounded-lg px-3 py-3 text-left transition-colors ${
              side === 'no'
                ? 'bg-danger text-white'
                : 'border border-line bg-white text-danger hover:bg-danger-soft'
            }`}
          >
            <span className="block text-xs font-bold uppercase tracking-wide">No</span>
            <span className="font-numeric mt-0.5 block text-xl font-bold">{Math.round((1 - currentYesPrice) * 100)}¢</span>
          </button>
        </div>
      </fieldset>

      <div className="mb-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-soft" htmlFor="shares-input">Quantity</label>
        <div className="flex min-h-11 items-center rounded-lg border border-line bg-white transition-colors focus-within:border-accent">
          <input
            id="shares-input"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={sharesInput}
            onChange={(event) => setSharesInput(event.target.value)}
            className="font-numeric min-w-0 flex-1 bg-transparent px-3 text-lg font-bold text-ink outline-none"
          />
          <span className="border-l px-3 text-xs font-medium text-ink-soft">shares</span>
        </div>
      </div>

      <dl className="font-numeric mb-4 divide-y rounded-lg border border-line text-sm">
        <div className="flex items-center justify-between px-3 py-2">
          <dt className="text-ink-soft">Side</dt>
          <dd className="font-semibold">{side.toUpperCase()} @ {Math.round(currentSidePrice * 100)}¢</dd>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <dt className="text-ink-soft">Cost</dt>
          <dd className="font-semibold">{previewCost.toFixed(2)} crowns</dd>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <dt className="text-ink-soft">New price</dt>
          <dd className="font-semibold">{Math.round(newSidePrice * 100)}¢</dd>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <dt className="text-ink-soft">Payout if correct</dt>
          <dd className="font-semibold">{estimatedPayout.toFixed(2)} crowns</dd>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <dt className="text-ink-soft">Potential profit</dt>
          <dd className="font-semibold text-positive">+{Math.max(0, potentialProfit).toFixed(2)}</dd>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <dt className="text-ink-soft">Balance after</dt>
          <dd className={`font-semibold ${balanceAfter < 0 ? 'text-danger' : 'text-ink'}`}>{balanceAfter.toFixed(2)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={handleTrade}
        disabled={isPending || validShares === 0}
        className={`pressable w-full rounded-lg py-3 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          side === 'yes' ? 'bg-accent hover:bg-accent-hover' : 'bg-danger hover:bg-red-700'
        }`}
      >
        {isPending ? 'Placing order…' : `Buy ${side.toUpperCase()} · ${previewCost.toFixed(2)} crowns`}
      </button>

      <div aria-live="polite">
        {result && <p className="mt-3 rounded-lg border border-positive bg-positive-soft px-3 py-2.5 text-sm text-positive">{result}</p>}
        {error && <p className="mt-3 rounded-lg border border-danger bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>}
      </div>
    </section>
  )
}
