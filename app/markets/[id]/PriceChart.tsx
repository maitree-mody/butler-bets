'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type PricePoint = { time: string; price: number }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function fmtPct(value: number) {
  return `${Math.round(value * 100)}¢`
}

export default function PriceChart({ points }: { points: PricePoint[] }) {
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-line bg-white" aria-labelledby="price-history-title">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 id="price-history-title" className="text-sm font-semibold text-ink">YES price history</h2>
        <p className="font-numeric text-xs text-ink-soft">0–100¢</p>
      </div>
      <div className="h-56 w-full px-2 py-4 sm:h-64 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 14, bottom: 4, left: 2 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 5" />
            <XAxis
              dataKey="time"
              tickFormatter={fmtTime}
              tick={{ fontSize: 11, fill: 'var(--ink-faint)' }}
              tickLine={false}
              axisLine={false}
              minTickGap={60}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={fmtPct}
              tick={{ fontSize: 11, fill: 'var(--ink-faint)' }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip
              formatter={(value) => [`${Math.round(Number(value) * 100)}¢`, 'YES price']}
              labelFormatter={(label) => (typeof label === 'string' ? fmtTime(label) : String(label))}
              contentStyle={{
                background: 'var(--ink)',
                border: 'none',
                borderRadius: 0,
                color: 'white',
                fontSize: 12,
              }}
              itemStyle={{ color: 'white' }}
              labelStyle={{ color: 'var(--line)', marginBottom: 4 }}
            />
            <ReferenceLine y={0.5} stroke="var(--line-strong)" strokeDasharray="3 5" />
            <Line
              type="stepAfter"
              dataKey="price"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface-strong)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
