'use client'

import {
  Area, AreaChart, CartesianGrid, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

export type PricePoint = { time: string; price: number }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtPct(value: number) {
  return `${Math.round(value * 100)}¢`
}

export default function PriceChart({ points }: { points: PricePoint[] }) {
  return (
    <section aria-labelledby="price-history-title">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 id="price-history-title" className="text-sm font-semibold text-foreground">YES price history</h2>
        <p className="text-xs font-medium text-muted-foreground">0 – 100¢</p>
      </div>
      <div className="h-64 w-full px-2 py-4 sm:h-72 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 14, bottom: 4, left: 2 }}>
            <defs>
              <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--columbia)" stopOpacity={0.18} />
                <stop offset="90%" stopColor="var(--columbia)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" strokeOpacity={0.5} />
            <XAxis
              dataKey="time"
              tickFormatter={fmtTime}
              tick={{ fontSize: 10.5, fill: 'var(--muted-foreground)', opacity: 0.7 }}
              tickLine={false}
              axisLine={false}
              minTickGap={60}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={fmtPct}
              tick={{ fontSize: 10.5, fill: 'var(--muted-foreground)', opacity: 0.7 }}
              tickLine={false}
              axisLine={false}
              width={38}
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
            <ReferenceLine y={0.5} stroke="var(--border)" strokeDasharray="3 5" strokeOpacity={0.6} />
            <Area
              type="stepAfter"
              dataKey="price"
              stroke="var(--columbia)"
              strokeWidth={2.5}
              fill="url(#yesGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'var(--columbia)', stroke: 'white', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
