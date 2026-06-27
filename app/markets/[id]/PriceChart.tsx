'use client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

export type PricePoint = { time: string; price: number }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtPct(v: number) {
  return `${Math.round(v * 100)}%`
}

export default function PriceChart({ points }: { points: PricePoint[] }) {
  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-gray-500">YES price history</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={points} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="time"
            tickFormatter={fmtTime}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            minTickGap={60}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={fmtPct}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            width={38}
          />
          <Tooltip
            formatter={(v) => [`${Math.round(Number(v) * 100)}%`, 'YES']}
            labelFormatter={(label) => (typeof label === 'string' ? fmtTime(label) : String(label))}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine y={0.5} stroke="#e5e7eb" strokeDasharray="4 4" />
          <Line
            type="stepAfter"
            dataKey="price"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
