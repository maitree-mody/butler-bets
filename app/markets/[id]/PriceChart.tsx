'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Area, CartesianGrid, ComposedChart, Line,
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

  const activePoints = sparse ? points : displayPoints

  // Zoom the y-axis to where the price has actually been trading, rather than
  // always spanning the full 0–100¢ range — a market sitting around 60-65¢
  // should look like it's moving, not sit flat two-thirds up a huge scale.
  const { domainMin, domainMax, last, deltaPct } = useMemo(() => {
    const values = activePoints.map((p) => p.price)
    const dataMin = values.length ? Math.min(...values) : 0.4
    const dataMax = values.length ? Math.max(...values) : 0.6
    const span = dataMax - dataMin
    const pad = Math.max(span * 0.25, 0.04)
    const min = Math.max(0, dataMin - pad)
    const max = Math.min(1, dataMax + pad)
    const lastPoint = activePoints.at(-1) ?? null
    const firstPoint = activePoints[0] ?? null
    const delta = lastPoint && firstPoint ? (lastPoint.price - firstPoint.price) * 100 : 0
    return { domainMin: min, domainMax: max, last: lastPoint, deltaPct: delta }
  }, [activePoints])

  return (
    <section aria-labelledby="price-history-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <h2 id="price-history-title" className="text-sm font-semibold text-foreground">YES price</h2>
          {last && (
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${deltaPct >= 0 ? 'bg-success' : 'bg-danger'}`} />
              <span className="font-display text-base font-bold text-foreground">{Math.round(last.price * 100)}¢</span>
              <span className={`text-xs font-semibold ${deltaPct >= 0 ? 'text-success' : 'text-danger'}`}>
                {deltaPct >= 0 ? '+' : ''}{Math.round(deltaPct)}¢
              </span>
            </span>
          )}
        </div>
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
      </div>
      {sparse && (
        <p className="px-5 pt-3 text-xs text-muted-foreground">Not enough trades in this window. Showing full history.</p>
      )}
      <div className="h-[220px] w-full px-2 py-3 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={activePoints} margin={{ top: 8, right: 8, bottom: 4, left: 2 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--columbia)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--columbia)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              orientation="right"
              domain={[domainMin, domainMax]}
              tickCount={5}
              tickFormatter={fmtPct}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              width={44}
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
            <Area
              type="monotone"
              dataKey="price"
              stroke="none"
              fill="url(#priceGradient)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="var(--columbia)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--columbia)', stroke: 'white', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
