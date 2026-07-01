'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

export type PricePoint = { time: string; price: number }

type RangeKey = '1H' | '1D' | '1W' | '1M' | 'ALL'

const RANGES: Array<{ key: RangeKey; label: string; ms: number | null }> = [
  { key: '1H', label: '1H', ms: 60 * 60 * 1000 },
  { key: '1D', label: '1D', ms: 24 * 60 * 60 * 1000 },
  { key: '1W', label: '1W', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '1M', label: '1M', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: 'ALL', label: 'ALL', ms: null },
]

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtPct(value: number) {
  return `${Math.round(value * 100)}¢`
}

export default function PriceChart({ points }: { points: PricePoint[] }) {
  const [range, setRange] = useState<RangeKey>('ALL')
  // Computed in an effect (not during render) so filtering stays a pure
  // function of state/props rather than calling Date.now() while rendering.
  const [cutoff, setCutoff] = useState<number | null>(null)

  useEffect(() => {
    const config = RANGES.find((r) => r.key === range)
    setCutoff(config?.ms ? Date.now() - config.ms : null)
  }, [range])

  const { displayPoints, sparse } = useMemo(() => {
    if (cutoff === null) return { displayPoints: points, sparse: false }
    const filtered = points.filter((p) => new Date(p.time).getTime() >= cutoff)
    if (filtered.length < 2) return { displayPoints: points.slice(-2), sparse: true }
    return { displayPoints: filtered, sparse: false }
  }, [points, cutoff])

  return (
    <section aria-labelledby="price-history-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 id="price-history-title" className="text-sm font-semibold text-foreground">YES price history</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5">
            {RANGES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                aria-pressed={range === key}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  range === key
                    ? 'bg-columbia text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-columbia'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs font-medium text-muted-foreground">0 – 100¢</p>
        </div>
      </div>
      {sparse && (
        <p className="px-5 pt-3 text-xs text-muted-foreground">Not enough trades in this window — showing full history.</p>
      )}
      <div className="h-56 w-full px-2 py-4 sm:h-64 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparse ? points : displayPoints} margin={{ top: 4, right: 14, bottom: 4, left: 2 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 5" />
            <XAxis
              dataKey="time"
              tickFormatter={fmtTime}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              minTickGap={60}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={fmtPct}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip
              formatter={(value) => [`${Math.round(Number(value) * 100)}¢`, 'YES price']}
              labelFormatter={(label) => (typeof label === 'string' ? fmtTime(label) : String(label))}
              contentStyle={{
                background: 'var(--columbia-deep)',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontSize: 12,
                padding: '8px 12px',
              }}
              itemStyle={{ color: 'var(--columbia-soft)' }}
              labelStyle={{ color: 'oklch(0.7 0.04 260)', marginBottom: 4 }}
            />
            <ReferenceLine y={0.5} stroke="var(--border)" strokeDasharray="3 5" />
            <Line
              type="stepAfter"
              dataKey="price"
              stroke="var(--columbia)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--columbia)', stroke: 'white', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
