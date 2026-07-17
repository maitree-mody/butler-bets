import Link from 'next/link'
import { priceYes } from '@/lib/lmsr'
import { inferCategory } from '@/lib/category'
import { isMarketOpen } from '@/lib/time'

type MarketCardProps = {
  market: { id: string; question: string; status: string; closes_at: string; q_yes: number; q_no: number; b: number }
  recentTrades: number
}

export default function MarketCard({ market, recentTrades }: MarketCardProps) {
  const yesProb = priceYes(Number(market.q_yes), Number(market.q_no), Number(market.b))
  const yesPct = Math.round(yesProb * 100)
  const noPct = 100 - yesPct
  const isOpen = isMarketOpen(market.status, market.closes_at)
  const cat = inferCategory(market.question)
  const trend: 'up' | 'down' = yesPct >= 50 ? 'up' : 'down'
  const tradesLabel = recentTrades >= 1000
    ? `${(recentTrades / 1000).toFixed(1)}K`
    : String(recentTrades)

  return (
    <Link
      href={`/markets/${market.id}`}
      className="market-card flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      {/* Top: icon + category */}
      <div className="flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-columbia-soft">
          <cat.Icon
            className="h-5 w-5"
            style={{ color: cat.sparkColor }}
            strokeWidth={1.8}
          />
        </div>
        <span className={`text-[10px] font-semibold tracking-wider ${cat.color}`}>
          {cat.label}
        </span>
      </div>

      {/* Question */}
      <p className="mt-4 min-h-12 text-sm font-medium leading-snug text-foreground">
        {market.question}
      </p>

      {/* Big % */}
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className="font-display text-3xl font-bold"
          style={{ color: cat.sparkColor }}
        >
          {yesPct}%
        </span>
        <span className="text-xs text-muted-foreground">Yes</span>
      </div>

      {/* Sparkline */}
      <Sparkline color={cat.sparkColor} trend={trend} />

      {/* YES / NO boxes */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-columbia/20 bg-columbia-soft/60 py-2 text-center">
          <div className="font-display text-base font-bold text-columbia">{yesPct}¢</div>
          <div className="text-[10px] text-muted-foreground">Yes</div>
        </div>
        <div className="rounded-md border border-danger/20 bg-danger/5 py-2 text-center">
          <div className="font-display text-base font-bold text-danger">{noPct}¢</div>
          <div className="text-[10px] text-muted-foreground">No</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex justify-between text-xs text-muted-foreground">
        <span>{isOpen ? 'Open' : 'Resolved'}</span>
        {recentTrades > 0 && (
          <span className="text-success">{tradesLabel} trades today</span>
        )}
      </div>
    </Link>
  )
}

export function Sparkline({
  color = 'var(--columbia)',
  trend = 'up',
}: {
  color?: string
  trend?: 'up' | 'down'
}) {
  const up   = 'M0,40 L10,38 L20,35 L30,36 L40,30 L50,28 L60,25 L70,22 L80,18 L90,15 L100,12'
  const down = 'M0,15 L10,18 L20,16 L30,22 L40,20 L50,24 L60,26 L70,28 L80,32 L90,30 L100,34'
  const d = trend === 'up' ? up : down
  return (
    <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="mt-3 h-16 w-full">
      <path d={`${d} L100,50 L0,50 Z`} fill={color} opacity="0.08" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.2" />
    </svg>
  )
}
