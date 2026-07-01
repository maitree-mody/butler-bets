import {
  BarChart3, Snowflake, Landmark, Volleyball, Building2,
} from 'lucide-react'

export type CategoryMeta = {
  label: string
  color: string         // Tailwind text class
  sparkColor: string    // CSS colour value
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>
}

export function inferCategory(question: string): CategoryMeta {
  const q = question.toLowerCase()
  if (/snow|campus|student|columbia|cu|class|finals|dining|greek|housing|dorm|club|event/.test(q))
    return { label: 'CAMPUS', color: 'text-columbia', sparkColor: 'var(--columbia)', Icon: Snowflake }
  if (/fed|rate|inflation|stock|gdp|economy|dollar|bank|market|nasdaq|crypto|bitcoin|invest/.test(q))
    return { label: 'FINANCE', color: 'text-finance', sparkColor: 'var(--finance)', Icon: Landmark }
  if (/game|win|score|champion|playoff|nfl|nba|mlb|nhl|team|match|sport|league|lions/.test(q))
    return { label: 'SPORTS', color: 'text-columbia', sparkColor: 'var(--columbia)', Icon: Volleyball }
  if (/elect|vote|president|congress|senate|bill|law|policy|nyc|mayor|governor|democrat|republican|rent/.test(q))
    return { label: 'POLITICS', color: 'text-politics', sparkColor: 'var(--politics)', Icon: Building2 }
  return { label: 'MARKET', color: 'text-columbia', sparkColor: 'var(--columbia)', Icon: BarChart3 }
}
