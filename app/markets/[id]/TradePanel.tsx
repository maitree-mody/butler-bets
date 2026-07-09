'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { priceYes, tradeCost, sellPayout } from '@/lib/lmsr'
import { executeTradeAction, sellSharesAction } from '@/app/actions/trade'
import PricingInfoTooltip from './PricingInfoTooltip'

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
  const [successInfo, setSuccessInfo] = useState<{ shares: number; side: string; cost: number; newCrowns: number; mode: 'buy' | 'sell' } | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    setSuccessInfo(null)
    setError(null)
    startTransition(async () => {
      if (mode === 'buy') {
        const res = await executeTradeAction(marketId, side, validShares)
        if ('error' in res) {
          setError(res.error)
        } else {
          setSuccessInfo({ shares: validShares, side, cost: res.data.cost, newCrowns: res.data.new_crowns, mode: 'buy' })
          router.refresh()
        }
      } else {
        const res = await sellSharesAction(marketId, side, validShares)
        if ('error' in res) {
          setError(res.error)
        } else {
          setSuccessInfo({ shares: validShares, side, cost: res.data.payout, newCrowns: res.data.new_crowns, mode: 'sell' })
          router.refresh()
        }
      }
    })
  }

  return (
    <section
      id="trade-ticket"
      className="scroll-mt-20 rounded-2xl border border-border bg-card p-3.5 shadow-sm"
      aria-labelledby="trade-ticket-title"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 id="trade-ticket-title" className="font-display text-base font-semibold text-columbia-deep">
          Trade ticket
        </h2>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Available</p>
          <p className="text-sm font-bold text-foreground">{availableBalance.toFixed(2)} ♛</p>
        </div>
      </div>

      {/* Buy / Sell toggle */}
      <fieldset className="mb-3">
        <legend className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Order type
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={mode === 'buy'}
            onClick={() => setMode('buy')}
            className={`pressable rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out ${
              mode === 'buy'
                ? 'bg-columbia-deep text-primary-foreground shadow-sm'
                : 'border border-border bg-background text-muted-foreground hover:border-columbia-deep'
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            aria-pressed={mode === 'sell'}
            onClick={() => setMode('sell')}
            className={`pressable rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out ${
              mode === 'sell'
                ? 'bg-columbia-deep text-primary-foreground shadow-sm'
                : 'border border-border bg-background text-muted-foreground hover:border-columbia-deep'
            }`}
          >
            Sell
          </button>
        </div>
      </fieldset>

      {/* YES / NO toggle */}
      <fieldset className="mb-3">
        <legend className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Position
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={side === 'yes'}
            onClick={() => setSide('yes')}
            className={`pressable rounded-xl border px-4 py-3 text-left transition-colors duration-150 ease-out ${
              side === 'yes'
                ? 'border-columbia bg-columbia text-primary-foreground ring-1 ring-columbia/50'
                : 'border-columbia/20 bg-columbia-soft/60 text-columbia hover:border-columbia/60'
            }`}
          >
            <span className="block text-xs font-bold uppercase tracking-widest">Yes</span>
            <span className="font-display mt-1 block text-3xl font-extrabold">{Math.round(currentYesPrice * 100)}¢</span>
          </button>
          <button
            type="button"
            aria-pressed={side === 'no'}
            onClick={() => setSide('no')}
            className={`pressable rounded-xl border px-4 py-3 text-left transition-colors duration-150 ease-out ${
              side === 'no'
                ? 'border-danger bg-danger text-white ring-1 ring-danger/50'
                : 'border-danger/20 bg-danger/5 text-danger hover:border-danger/60'
            }`}
          >
            <span className="block text-xs font-bold uppercase tracking-widest">No</span>
            <span className="font-display mt-1 block text-3xl font-extrabold">{Math.round((1 - currentYesPrice) * 100)}¢</span>
          </button>
        </div>
      </fieldset>

      {/* Quantity input */}
      <div className="mb-3">
        <label
          className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          htmlFor="shares-input"
        >
          Quantity
        </label>
        <div className={`flex min-h-9 items-center rounded-xl border bg-background transition-colors focus-within:border-columbia ${exceedsMax ? 'border-danger' : 'border-border'}`}>
          <input
            id="shares-input"
            type="number"
            min={1}
            max={mode === 'sell' ? holdingsForSide : MAX_SHARES}
            step={1}
            inputMode="numeric"
            value={sharesInput}
            onChange={(e) => setSharesInput(e.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-foreground outline-none"
          />
          <span className="border-l border-border px-3 text-xs font-medium text-muted-foreground">shares</span>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {[1, 10, 25, 50].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSharesInput(String(n))}
              className="pressable flex-1 rounded-lg border border-border py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-columbia hover:text-columbia"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSharesInput(String(mode === 'sell' ? holdingsForSide : MAX_SHARES))}
            className="pressable flex-1 rounded-lg border border-border py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-columbia hover:text-columbia"
          >
            Max
          </button>
        </div>
        <p className="mt-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
          You own <span className="font-display font-bold">{holdingsForSide.toFixed(0)}</span> {side.toUpperCase()} shares
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
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Cost &amp; payout
        <PricingInfoTooltip />
      </div>
      <dl className="mb-3 divide-y divide-border rounded-xl border border-border text-sm">
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
          <div key={label} className="flex items-center justify-between px-3 py-2">
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
        className={`pressable w-full rounded-xl py-3 text-sm font-bold text-white shadow-md transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${
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
        {successInfo && (
          <div className="mt-3 rounded-xl border border-success/25 bg-success/8 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
              <span>✓</span> Order filled
            </p>
            <p className="mt-0.5 text-xs text-success/70">
              {successInfo.shares} {successInfo.side.toUpperCase()} · {successInfo.mode === 'sell' ? 'received' : 'cost'} {successInfo.cost.toFixed(2)} ♛ · balance {successInfo.newCrowns.toFixed(2)} ♛
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
