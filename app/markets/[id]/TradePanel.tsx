'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { priceYes, tradeCost, sellPayout } from '@/lib/lmsr'
import { executeTradeAction, sellSharesAction } from '@/app/actions/trade'

interface TradePanelProps {
  marketId: string
  qYes: number
  qNo: number
  b: number
  availableBalance: number
  userYesShares: number
  userNoShares: number
}

export default function TradePanel({ marketId, qYes, qNo, b, availableBalance, userYesShares, userNoShares }: TradePanelProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [sharesInput, setSharesInput] = useState('10')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [error, setError]   = useState<string | null>(null)

  const MAX_SHARES = 100_000

  const holdingsForSide = side === 'yes' ? userYesShares : userNoShares
  const shares = parseInt(sharesInput, 10)
  const exceedsMax =
    (!isNaN(shares) && shares > MAX_SHARES) ||
    (mode === 'sell' && !isNaN(shares) && shares > holdingsForSide)
  const validShares = !isNaN(shares) && shares > 0 && !exceedsMax ? shares : 0
  const currentYesPrice  = priceYes(qYes, qNo, b)
  const currentSidePrice = side === 'yes' ? currentYesPrice : 1 - currentYesPrice
  const previewCost =
    validShares > 0
      ? mode === 'buy'
        ? tradeCost(qYes, qNo, b, side, validShares)
        : sellPayout(qYes, qNo, b, side, validShares)
      : 0
  const newQYes =
    mode === 'buy'
      ? side === 'yes' ? qYes + validShares : qYes
      : side === 'yes' ? qYes - validShares : qYes
  const newQNo =
    mode === 'buy'
      ? side === 'no' ? qNo + validShares : qNo
      : side === 'no' ? qNo - validShares : qNo
  const newYesPrice      = priceYes(newQYes, newQNo, b)
  const newSidePrice     = side === 'yes' ? newYesPrice : 1 - newYesPrice
  const potentialProfit  = validShares - previewCost
  const balanceAfter     = mode === 'buy' ? availableBalance - previewCost : availableBalance + previewCost

  function handleTrade() {
    if (validShares === 0) return
    setResult(null)
    setError(null)
    startTransition(async () => {
      if (mode === 'buy') {
        const res = await executeTradeAction(marketId, side, validShares)
        if ('error' in res) {
          setError(res.error)
        } else {
          setResult(`Bought ${validShares} ${side.toUpperCase()} for ${res.data.cost.toFixed(2)} crowns. Balance: ${res.data.new_crowns.toFixed(2)} crowns.`)
          router.refresh()
        }
      } else {
        const res = await sellSharesAction(marketId, side, validShares)
        if ('error' in res) {
          setError(res.error)
        } else {
          setResult(`Sold ${validShares} ${side.toUpperCase()} for ${res.data.payout.toFixed(2)} crowns. Balance: ${res.data.new_crowns.toFixed(2)} crowns.`)
          router.refresh()
        }
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

      {/* Buy / Sell toggle */}
      <fieldset className="mb-4">
        <legend className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Order type
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={mode === 'buy'}
            onClick={() => setMode('buy')}
            className={`pressable rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
              mode === 'buy'
                ? 'bg-columbia-deep text-primary-foreground shadow-md'
                : 'border border-border bg-background text-muted-foreground hover:border-columbia-deep'
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            aria-pressed={mode === 'sell'}
            onClick={() => setMode('sell')}
            className={`pressable rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
              mode === 'sell'
                ? 'bg-columbia-deep text-primary-foreground shadow-md'
                : 'border border-border bg-background text-muted-foreground hover:border-columbia-deep'
            }`}
          >
            Sell
          </button>
        </div>
      </fieldset>

      {/* YES / NO toggle */}
      <fieldset className="mb-4">
        <legend className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Position
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={side === 'yes'}
            onClick={() => setSide('yes')}
            className={`pressable rounded-xl px-4 py-4 text-left transition-all ${
              side === 'yes'
                ? 'scale-[1.02] bg-columbia text-primary-foreground shadow-lg shadow-columbia/40 ring-2 ring-columbia ring-offset-2 ring-offset-card'
                : 'border border-columbia/20 bg-columbia-soft/60 text-columbia hover:border-columbia'
            }`}
          >
            <span className="block text-xs font-bold uppercase tracking-widest">Yes</span>
            <span className="font-display mt-1 block text-3xl font-extrabold">{Math.round(currentYesPrice * 100)}¢</span>
          </button>
          <button
            type="button"
            aria-pressed={side === 'no'}
            onClick={() => setSide('no')}
            className={`pressable rounded-xl px-4 py-4 text-left transition-all ${
              side === 'no'
                ? 'scale-[1.02] bg-danger text-white shadow-lg shadow-danger/40 ring-2 ring-danger ring-offset-2 ring-offset-card'
                : 'border border-danger/20 bg-danger/5 text-danger hover:border-danger'
            }`}
          >
            <span className="block text-xs font-bold uppercase tracking-widest">No</span>
            <span className="font-display mt-1 block text-3xl font-extrabold">{Math.round((1 - currentYesPrice) * 100)}¢</span>
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
            max={mode === 'sell' ? holdingsForSide : MAX_SHARES}
            step={1}
            inputMode="numeric"
            value={sharesInput}
            onChange={(e) => setSharesInput(e.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3 text-lg font-bold text-foreground outline-none"
          />
          <span className="border-l border-border px-3 text-xs font-medium text-muted-foreground">shares</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {[1, 10, 25, 50].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSharesInput(String(n))}
              className="pressable flex-1 rounded-lg border border-border py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-columbia hover:text-columbia"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSharesInput(String(mode === 'sell' ? holdingsForSide : MAX_SHARES))}
            className="pressable flex-1 rounded-lg border border-border py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-columbia hover:text-columbia"
          >
            Max
          </button>
        </div>
        <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-foreground">
          You own <span className="font-display text-base font-extrabold">{holdingsForSide.toFixed(0)}</span> {side.toUpperCase()} shares
        </p>
        {exceedsMax ? (
          <p className="mt-1.5 text-xs font-medium text-danger">
            {mode === 'sell' ? `Exceeds your position (${holdingsForSide.toFixed(0)} shares)` : 'Exceeds the 100,000 share limit'}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">Max 100,000 shares per trade</p>
        )}
      </div>

      {/* Order summary */}
      <dl className="mb-4 divide-y divide-border rounded-xl border border-border text-sm">
        {(mode === 'buy'
          ? [
              { label: 'Side',             value: `${side.toUpperCase()} @ ${Math.round(currentSidePrice * 100)}¢` },
              { label: 'Cost',             value: `${previewCost.toFixed(2)} ♛` },
              { label: 'New price',        value: `${Math.round(newSidePrice * 100)}¢` },
              { label: 'Payout if wins',   value: `${validShares.toFixed(2)} ♛` },
              { label: 'Potential profit', value: `+${Math.max(0, potentialProfit).toFixed(2)}`, green: true },
              { label: 'Balance after',    value: balanceAfter.toFixed(2), red: balanceAfter < 0 },
            ]
          : [
              { label: 'Side',          value: `${side.toUpperCase()} @ ${Math.round(currentSidePrice * 100)}¢` },
              { label: 'Payout',        value: `${previewCost.toFixed(2)} ♛` },
              { label: 'New price',     value: `${Math.round(newSidePrice * 100)}¢` },
              { label: 'Balance after', value: balanceAfter.toFixed(2), red: balanceAfter < 0 },
            ]
        ).map(({ label, value, green, red }) => (
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
        className={`pressable w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
          side === 'yes'
            ? 'bg-columbia shadow-columbia/25 hover:bg-columbia-deep'
            : 'bg-danger shadow-danger/25 hover:bg-red-700'
        }`}
      >
        {isPending
          ? 'Placing order…'
          : mode === 'buy'
            ? `Buy ${side.toUpperCase()} · ${previewCost.toFixed(2)} ♛`
            : `Sell ${side.toUpperCase()} · ${previewCost.toFixed(2)} ♛`}
      </button>

      {/* Feedback */}
      <div aria-live="polite">
        {result && (
          <p className="mt-3 rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
            {result}
          </p>
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
