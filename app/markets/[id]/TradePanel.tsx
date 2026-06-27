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
    <section id="trade-ticket" className="scroll-mt-20 border border-line-strong border-t-2 border-t-accent bg-surface-raised" aria-labelledby="trade-ticket-title">
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-accent" aria-hidden="true" />
            <p className="eyebrow">Order entry</p>
          </div>
          <h2 id="trade-ticket-title" className="mt-1 text-base font-semibold tracking-[-0.02em]">Trade ticket</h2>
        </div>
        <div className="text-right">
          <p className="eyebrow">Available</p>
          <p className="font-numeric mt-1 text-sm font-semibold">{availableBalance.toFixed(2)}</p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <fieldset>
          <legend className="eyebrow mb-2">Position</legend>
          <div className="grid grid-cols-2 border border-line-strong">
            <button
              type="button"
              aria-pressed={side === 'yes'}
              onClick={() => setSide('yes')}
              className={`pressable min-h-12 border-r px-3 text-left ${
                side === 'yes' ? 'bg-accent text-white' : 'bg-surface text-ink hover:bg-surface-active'
              }`}
            >
              <span className="block text-[0.6875rem] font-bold uppercase tracking-[0.1em]">Yes</span>
              <span className="font-numeric mt-0.5 block text-lg font-semibold">{Math.round(currentYesPrice * 100)}¢</span>
            </button>
            <button
              type="button"
              aria-pressed={side === 'no'}
              onClick={() => setSide('no')}
              className={`pressable min-h-12 px-3 text-left ${
                side === 'no' ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-surface-muted'
              }`}
            >
              <span className="block text-[0.6875rem] font-bold uppercase tracking-[0.1em]">No</span>
              <span className="font-numeric mt-0.5 block text-lg font-semibold">{Math.round((1 - currentYesPrice) * 100)}¢</span>
            </button>
          </div>
        </fieldset>

        <div className="mt-5">
          <label className="eyebrow mb-2 block" htmlFor="shares-input">Quantity</label>
          <div className="flex min-h-12 border border-line-strong bg-surface transition-colors duration-150 focus-within:border-accent focus-within:bg-surface-raised">
            <input
              id="shares-input"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={sharesInput}
              onChange={(event) => setSharesInput(event.target.value)}
              className="font-numeric min-w-0 flex-1 bg-transparent px-3 text-lg font-semibold text-ink outline-none"
            />
            <span className="flex items-center border-l px-3 text-xs font-medium text-ink-faint">shares</span>
          </div>
        </div>

        <dl className="font-numeric mt-5 divide-y border-y text-sm">
          <div className="flex items-center justify-between px-1 py-2.5 transition-colors hover:bg-surface">
            <dt className="text-ink-soft">Selected side</dt>
            <dd className="font-semibold">{side.toUpperCase()} @ {Math.round(currentSidePrice * 100)}¢</dd>
          </div>
          <div className="flex items-center justify-between px-1 py-2.5 transition-colors hover:bg-surface">
            <dt className="text-ink-soft">Estimated cost</dt>
            <dd className="font-semibold">{previewCost.toFixed(2)} crowns</dd>
          </div>
          <div className="flex items-center justify-between px-1 py-2.5 transition-colors hover:bg-surface">
            <dt className="text-ink-soft">Price after order</dt>
            <dd className="font-semibold">{Math.round(newSidePrice * 100)}¢</dd>
          </div>
          <div className="flex items-center justify-between px-1 py-2.5 transition-colors hover:bg-surface">
            <dt className="text-ink-soft">Payout if correct</dt>
            <dd className="font-semibold">{estimatedPayout.toFixed(2)} crowns</dd>
          </div>
          <div className="flex items-center justify-between px-1 py-2.5 transition-colors hover:bg-surface">
            <dt className="text-ink-soft">Potential profit</dt>
            <dd className="font-semibold text-accent">+{Math.max(0, potentialProfit).toFixed(2)}</dd>
          </div>
          <div className="flex items-center justify-between px-1 py-2.5 transition-colors hover:bg-surface">
            <dt className="text-ink-soft">Balance after</dt>
            <dd className={`font-semibold ${balanceAfter < 0 ? 'text-danger' : 'text-ink'}`}>{balanceAfter.toFixed(2)}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={handleTrade}
          disabled={isPending || validShares === 0}
          className={`pressable mt-5 min-h-12 w-full px-4 text-sm font-bold disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-faint ${
            side === 'yes' ? 'bg-accent text-white hover:bg-accent-hover' : 'bg-ink text-white hover:bg-accent'
          }`}
        >
          {isPending ? 'Sending order…' : `Buy ${side.toUpperCase()} · ${previewCost.toFixed(2)}`}
        </button>

        <div aria-live="polite">
          {result && <p className="mt-4 border-l-2 border-accent bg-accent-soft px-3 py-2.5 text-sm text-accent">{result}</p>}
          {error && <p className="mt-4 border-l-2 border-danger bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</p>}
        </div>
      </div>
    </section>
  )
}
