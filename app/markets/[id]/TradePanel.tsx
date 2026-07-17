'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, TrendingUp } from 'lucide-react'
import { priceYes, tradeCost, sellPayout, sharesForCost, sharesForSellPayout } from '@/lib/lmsr'
import { executeTradeAction, sellSharesAction } from '@/app/actions/trade'
import { formatCrowns } from '@/lib/format-crowns'
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

type AmountUnit = 'shares' | 'crowns'

const MAX_SHARES = 100_000
const SHARE_PRESETS = [1, 10, 25, 50, 100, 200]
const CROWN_PRESETS = [10, 25, 50, 100]

export default function TradePanel({ marketId, qYes, qNo, b, availableBalance, userYesShares, userNoShares }: TradePanelProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [amountUnit, setAmountUnit] = useState<AmountUnit>('shares')
  const [unitMenuOpen, setUnitMenuOpen] = useState(false)
  const [amountInput, setAmountInput] = useState('10')
  const [isPending, startTransition] = useTransition()
  const [successInfo, setSuccessInfo] = useState<{ shares: number; side: string; cost: number; newCrowns: number; mode: 'buy' | 'sell' } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const holdingsForSide = side === 'yes' ? userYesShares : userNoShares
  const maxSellPayout = holdingsForSide > 0 ? sellPayout(qYes, qNo, b, side, holdingsForSide) : 0

  const amount = amountUnit === 'shares' ? parseInt(amountInput, 10) : parseFloat(amountInput)

  // Shares actually sent to the RPC. In crowns mode, the entered amount is a
  // crowns budget/payout target — convert it via the LMSR inverse and floor,
  // so the trade never costs more (or pays out for more shares) than the
  // user asked for.
  const rawShares =
    !isNaN(amount) && amount > 0
      ? amountUnit === 'shares'
        ? amount
        : Math.floor(
            mode === 'buy'
              ? sharesForCost(qYes, qNo, b, side, amount)
              : sharesForSellPayout(qYes, qNo, b, side, amount),
          )
      : 0

  const exceedsMax =
    rawShares > MAX_SHARES ||
    (mode === 'sell' && rawShares > holdingsForSide)
  const validShares = rawShares > 0 && !exceedsMax ? rawShares : 0

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

  const maxAmount =
    amountUnit === 'shares'
      ? (mode === 'sell' ? Math.max(1, Math.floor(holdingsForSide)) : MAX_SHARES)
      : (mode === 'sell' ? Math.max(1, Math.floor(maxSellPayout)) : Math.max(1, Math.floor(availableBalance)))
  const presets = amountUnit === 'shares' ? SHARE_PRESETS : CROWN_PRESETS

  function setAmount(n: number) {
    setAmountInput(String(n))
  }

  function switchUnit(next: AmountUnit) {
    setAmountUnit(next)
    setAmountInput('10')
    setUnitMenuOpen(false)
  }

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
      className="scroll-mt-20 rounded-2xl border border-border bg-card p-4 shadow-sm"
      aria-labelledby="trade-ticket-title"
    >
      <h2 id="trade-ticket-title" className="sr-only">Trade ticket</h2>

      {/* Buy / Sell + amount-unit selector */}
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={mode === 'buy'}
            onClick={() => setMode('buy')}
            className={`pressable rounded-xl px-4 py-1.5 text-sm font-bold transition-colors duration-150 ease-out ${
              mode === 'buy'
                ? 'bg-columbia-deep text-primary-foreground shadow-sm'
                : 'border border-border bg-background text-muted-foreground hover:border-columbia-deep hover:text-columbia-deep'
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            aria-pressed={mode === 'sell'}
            onClick={() => setMode('sell')}
            className={`pressable rounded-xl px-4 py-1.5 text-sm font-bold transition-colors duration-150 ease-out ${
              mode === 'sell'
                ? 'bg-columbia-deep text-primary-foreground shadow-sm'
                : 'border border-border bg-background text-muted-foreground hover:border-columbia-deep hover:text-columbia-deep'
            }`}
          >
            Sell
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setUnitMenuOpen((v) => !v)}
            className="pressable flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-sm font-bold text-muted-foreground transition-colors hover:border-columbia hover:text-columbia"
          >
            {amountUnit === 'shares' ? 'Shares' : 'Crowns'}
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          {unitMenuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-32 overflow-hidden rounded-lg border border-border bg-card shadow-md">
              <button
                type="button"
                onClick={() => switchUnit('shares')}
                className="block w-full px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Shares
              </button>
              <button
                type="button"
                onClick={() => switchUnit('crowns')}
                className="block w-full px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Crowns ♛
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Available balance */}
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Available</span>
        <span className="font-bold text-foreground">{formatCrowns(availableBalance)} ♛</span>
      </div>

      {/* YES / NO pills */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          aria-pressed={side === 'yes'}
          onClick={() => setSide('yes')}
          className={`pressable flex-1 rounded-full border py-2.5 text-sm font-bold transition-colors duration-150 ease-out ${
            side === 'yes'
              ? 'border-columbia bg-columbia text-white'
              : 'border-columbia/25 bg-columbia-soft/50 text-columbia hover:border-columbia/60'
          }`}
        >
          YES {Math.round(currentYesPrice * 100)}¢
        </button>
        <button
          type="button"
          aria-pressed={side === 'no'}
          onClick={() => setSide('no')}
          className={`pressable flex-1 rounded-full border py-2.5 text-sm font-bold transition-colors duration-150 ease-out ${
            side === 'no'
              ? 'border-danger bg-danger text-white'
              : 'border-danger/25 bg-danger/5 text-danger hover:border-danger/60'
          }`}
        >
          NO {Math.round((1 - currentYesPrice) * 100)}¢
        </button>
      </div>

      {/* Quantity input */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="shares-input" className="text-xs font-semibold text-muted-foreground">
            {amountUnit === 'shares' ? 'Shares' : 'Crowns'}
          </label>
          <button
            type="button"
            onClick={() => setAmount(maxAmount)}
            className="pressable text-xs font-semibold text-columbia hover:underline"
          >
            Max
          </button>
        </div>
        <div className={`flex items-center rounded-xl border bg-background px-3.5 py-2.5 transition-colors focus-within:border-columbia ${exceedsMax ? 'border-danger' : 'border-border'}`}>
          <input
            id="shares-input"
            type="number"
            min={amountUnit === 'shares' ? 1 : 0.01}
            max={maxAmount}
            step={amountUnit === 'shares' ? 1 : 0.01}
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="w-full bg-transparent text-right text-2xl font-bold text-foreground outline-none"
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((n) => {
            const isActive = !isNaN(amount) && amount === n
            return (
              <button
                key={n}
                type="button"
                aria-pressed={isActive}
                onClick={() => setAmount(n)}
                className={`pressable rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? 'border-columbia bg-columbia text-white'
                    : 'border-border text-muted-foreground hover:border-columbia hover:text-columbia'
                }`}
              >
                {n}
              </button>
            )
          })}
        </div>

        <p className="mt-1.5 text-[11px] text-muted-foreground">
          You own {holdingsForSide.toFixed(0)} {side.toUpperCase()} shares
          {amountUnit === 'crowns' && validShares > 0 && ` · ≈ ${validShares.toLocaleString()} shares`}
        </p>
        {exceedsMax && (
          <p className="mt-1 text-xs font-medium text-danger">
            {mode === 'sell'
              ? `Exceeds your position (${holdingsForSide.toFixed(0)} shares${amountUnit === 'crowns' ? `, ≈ ${formatCrowns(maxSellPayout)} ♛ max` : ''})`
              : `Exceeds the ${MAX_SHARES.toLocaleString()} share limit`}
          </p>
        )}
      </div>

      {/* Summary — plain rows, payout emphasized */}
      <dl className="mb-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">
            Price <span className="text-muted-foreground/60">(now → after this trade)</span>
          </dt>
          <dd className="font-semibold text-foreground">
            {Math.round(currentSidePrice * 100)}¢ → {Math.round(newSidePrice * 100)}¢
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-1 text-muted-foreground">
            {mode === 'buy' ? 'Cost' : 'Payout'}
            <PricingInfoTooltip />
          </dt>
          <dd className="font-semibold text-foreground">{formatCrowns(previewCost)} ♛</dd>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2.5">
          <dt className="text-muted-foreground">{mode === 'buy' ? 'Payout if wins' : 'You receive'}</dt>
          <dd className="text-right">
            <span className="font-display block text-xl font-bold text-foreground">
              {formatCrowns(mode === 'buy' ? validShares : previewCost)} ♛
            </span>
          </dd>
        </div>
      </dl>
      {mode === 'buy' && potentialProfit > 0 && (
        <div className="mb-3 flex justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-base font-bold text-success">
            <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
            +{formatCrowns(potentialProfit)} ♛
            {previewCost > 0 && ` (+${((potentialProfit / previewCost) * 100).toFixed(0)}%)`}
          </span>
        </div>
      )}
      <p className={`mb-3 text-sm font-semibold ${balanceAfter < 0 ? 'text-danger' : 'text-muted-foreground'}`}>
        Balance after: {formatCrowns(balanceAfter)} ♛
      </p>

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
            ? `Buy ${side.toUpperCase()} · ${formatCrowns(previewCost)} ♛`
            : `Sell ${side.toUpperCase()} · ${formatCrowns(previewCost)} ♛`}
      </button>

      {/* Feedback */}
      <div aria-live="polite">
        {successInfo && (
          <div className="mt-3 rounded-xl border border-success/25 bg-success/8 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
              <span>✓</span> Order filled
            </p>
            <p className="mt-0.5 text-xs text-success/70">
              {successInfo.shares} {successInfo.side.toUpperCase()} · {successInfo.mode === 'sell' ? 'received' : 'cost'} {formatCrowns(successInfo.cost)} ♛ · balance {formatCrowns(successInfo.newCrowns)} ♛
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
