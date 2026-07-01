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
  const [successInfo, setSuccessInfo] = useState<{ shares: number; side: string; cost: number; newCrowns: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const MAX_SHARES = 100_000

  const shares = parseInt(sharesInput, 10)
  const exceedsMax = !isNaN(shares) && shares > MAX_SHARES
  const validShares = !isNaN(shares) && shares > 0 && !exceedsMax ? shares : 0
  const currentYesPrice  = priceYes(qYes, qNo, b)
  const currentSidePrice = side === 'yes' ? currentYesPrice : 1 - currentYesPrice
  const previewCost      = validShares > 0 ? tradeCost(qYes, qNo, b, side, validShares) : 0
  const newQYes          = side === 'yes' ? qYes + validShares : qYes
  const newQNo           = side === 'no'  ? qNo  + validShares : qNo
  const newYesPrice      = priceYes(newQYes, newQNo, b)
  const newSidePrice     = side === 'yes' ? newYesPrice : 1 - newYesPrice
  const potentialProfit  = validShares - previewCost
  const balanceAfter     = availableBalance - previewCost

  function handleTrade() {
    if (validShares === 0) return
    setSuccessInfo(null)
    setError(null)
    startTransition(async () => {
      const res = await executeTradeAction(marketId, side, validShares)
      if ('error' in res) {
        setError(res.error)
      } else {
        setSuccessInfo({ shares: validShares, side, cost: res.data.cost, newCrowns: res.data.new_crowns })
        router.refresh()
      }
    })
  }

  return (
    <section
      id="trade-ticket"
      className="scroll-mt-20 rounded-2xl border border-border bg-card p-5 shadow-sm"
      aria-labelledby="trade-ticket-title"
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 id="trade-ticket-title" className="font-display text-base font-semibold text-columbia-deep">
          Trade ticket
        </h2>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Available</p>
          <p className="text-sm font-bold text-foreground">{availableBalance.toFixed(2)} ♛</p>
        </div>
      </div>

      {/* YES / NO toggle */}
      <fieldset className="mb-4">
        <legend className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Position
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={side === 'yes'}
            onClick={() => setSide('yes')}
            className={`pressable rounded-xl px-3 py-3 text-left transition-all ${
              side === 'yes'
                ? 'bg-columbia text-primary-foreground shadow-md shadow-columbia/30'
                : 'border border-columbia/20 bg-columbia-soft/60 text-columbia hover:border-columbia'
            }`}
          >
            <span className="block text-[10px] font-semibold uppercase tracking-widest">Yes</span>
            <span className="font-display mt-0.5 block text-2xl font-bold">{Math.round(currentYesPrice * 100)}¢</span>
          </button>
          <button
            type="button"
            aria-pressed={side === 'no'}
            onClick={() => setSide('no')}
            className={`pressable rounded-xl px-3 py-3 text-left transition-all ${
              side === 'no'
                ? 'bg-danger text-white shadow-md shadow-danger/30'
                : 'border border-danger/20 bg-danger/5 text-danger hover:border-danger'
            }`}
          >
            <span className="block text-[10px] font-semibold uppercase tracking-widest">No</span>
            <span className="font-display mt-0.5 block text-2xl font-bold">{Math.round((1 - currentYesPrice) * 100)}¢</span>
          </button>
        </div>
      </fieldset>

      {/* Quantity input */}
      <div className="mb-4">
        <label
          className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          htmlFor="shares-input"
        >
          Quantity
        </label>
        <div className={`flex min-h-11 items-center rounded-xl border bg-background transition-colors focus-within:border-columbia ${exceedsMax ? 'border-danger' : 'border-border'}`}>
          <input
            id="shares-input"
            type="number"
            min={1}
            max={MAX_SHARES}
            step={1}
            inputMode="numeric"
            value={sharesInput}
            onChange={(e) => setSharesInput(e.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3 text-lg font-bold text-foreground outline-none"
          />
          <span className="border-l border-border px-3 text-xs font-medium text-muted-foreground">shares</span>
        </div>
        {exceedsMax ? (
          <p className="mt-1.5 text-xs font-medium text-danger">Exceeds the 100,000 share limit</p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">Max 100,000 shares per trade</p>
        )}
      </div>

      {/* Order summary */}
      <dl className="mb-4 divide-y divide-border rounded-xl border border-border text-sm">
        {[
          { label: 'Side',             value: `${side.toUpperCase()} @ ${Math.round(currentSidePrice * 100)}¢` },
          { label: 'Cost',             value: `${previewCost.toFixed(2)} ♛` },
          { label: 'New price',        value: `${Math.round(newSidePrice * 100)}¢` },
          { label: 'Payout if wins',   value: `${validShares.toFixed(2)} ♛` },
          { label: 'Potential profit', value: `+${Math.max(0, potentialProfit).toFixed(2)}`, green: true },
          { label: 'Balance after',    value: balanceAfter.toFixed(2), red: balanceAfter < 0 },
        ].map(({ label, value, green, red }) => (
          <div key={label} className="flex items-center justify-between px-3 py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={`font-semibold ${green ? 'text-success' : red ? 'text-danger' : 'text-foreground'}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Submit */}
      <button
        type="button"
        onClick={handleTrade}
        disabled={isPending || validShares === 0 || exceedsMax}
        className={`pressable w-full rounded-xl py-4 text-base font-bold text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
          side === 'yes'
            ? 'bg-gradient-to-b from-columbia to-columbia/90 shadow-columbia/30 hover:from-columbia-deep hover:to-columbia-deep'
            : 'bg-gradient-to-b from-danger to-danger/90 shadow-danger/30 hover:from-red-700 hover:to-red-700'
        }`}
      >
        {isPending ? 'Placing order…' : `Buy ${side.toUpperCase()} · ${previewCost.toFixed(2)} ♛`}
      </button>

      {/* Feedback */}
      <div aria-live="polite">
        {successInfo && (
          <div className="mt-3 rounded-xl border border-success/25 bg-success/8 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
              <span>✓</span> Order filled
            </p>
            <p className="mt-0.5 text-xs text-success/70">
              {successInfo.shares} {successInfo.side.toUpperCase()} · cost {successInfo.cost.toFixed(2)} ♛ · balance {successInfo.newCrowns.toFixed(2)} ♛
            </p>
          </div>
        )}
        {error && (
          <p className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
