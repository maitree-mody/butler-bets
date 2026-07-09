'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import MarketCard from './MarketCard'

type MarketRow = {
  id: string
  question: string
  status: string
  b: number
  q_yes: number
  q_no: number
  closes_at: string
  created_at: string
  resolved_at: string | null
}

type Tab = 'all' | 'trending' | 'new' | 'closing' | 'resolved'

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'trending', label: 'Trending' },
  { value: 'new', label: 'New' },
  { value: 'closing', label: 'Closing soon' },
  { value: 'resolved', label: 'Resolved' },
]

const PAGE_SIZE = 8

export default function MarketsExplorer({
  openMarkets,
  resolvedMarkets,
  recentTradeCounts,
  tradeCounts48h,
}: {
  openMarkets: MarketRow[]
  resolvedMarkets: MarketRow[]
  recentTradeCounts: Record<string, number>
  tradeCounts48h: Record<string, number>
}) {
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const tabbedMarkets = useMemo(() => {
    switch (tab) {
      case 'trending':
        return [...openMarkets].sort((a, b) => (tradeCounts48h[b.id] ?? 0) - (tradeCounts48h[a.id] ?? 0))
      case 'new':
        return [...openMarkets].sort((a, b) => b.created_at.localeCompare(a.created_at))
      case 'closing':
        return [...openMarkets].sort((a, b) => a.closes_at.localeCompare(b.closes_at))
      case 'resolved':
        return [...resolvedMarkets].sort((a, b) =>
          (b.resolved_at ?? b.created_at).localeCompare(a.resolved_at ?? a.created_at))
      case 'all':
      default:
        return openMarkets
    }
  }, [tab, openMarkets, resolvedMarkets, tradeCounts48h])

  const searchedMarkets = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tabbedMarkets
    return tabbedMarkets.filter((m) => m.question.toLowerCase().includes(q))
  }, [tabbedMarkets, query])

  const visibleMarkets = searchedMarkets.slice(0, visible)
  const hasMore = visible < searchedMarkets.length
  const activeTabLabel = TABS.find((t) => t.value === tab)?.label ?? ''

  function handleTabChange(next: Tab) {
    setTab(next)
    setVisible(PAGE_SIZE)
  }

  function handleSearchChange(value: string) {
    setQuery(value)
    setVisible(PAGE_SIZE)
  }

  return (
    <>
      {/* Tabs + search */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map(({ value, label }) => {
            const selected = value === tab
            const count = value === 'resolved' ? resolvedMarkets.length : openMarkets.length
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleTabChange(value)}
                aria-current={selected ? 'page' : undefined}
                className={`pressable rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150 ease-out ${
                  selected
                    ? 'bg-columbia text-primary-foreground shadow-sm'
                    : 'border border-border bg-card text-muted-foreground hover:border-columbia hover:text-columbia'
                }`}
              >
                {label}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
          <input
            type="search"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search markets…"
            aria-label="Search markets"
            className="w-full rounded-full border border-border bg-card py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-columbia focus:outline-none focus:ring-2 focus:ring-columbia/15"
          />
        </div>
      </div>

      {visibleMarkets.length > 0 ? (
        <>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visibleMarkets.map((market) => (
              <li key={market.id}>
                <MarketCard market={market} recentTrades={recentTradeCounts[market.id] ?? 0} />
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="pressable rounded-full border border-columbia px-5 py-2 text-sm font-semibold text-columbia transition-colors duration-150 ease-out hover:bg-columbia-soft"
              >
                Show more
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-8 rounded-2xl border border-border bg-card py-20 text-center">
          <p className="font-display text-2xl font-semibold text-columbia-deep">
            {query
              ? `No markets match "${query}".`
              : `No ${tab === 'all' ? '' : `${activeTabLabel.toLowerCase()} `}markets yet.`}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {query ? 'Try a different search term.' : 'Try another tab or open a new market.'}
          </p>
        </div>
      )}
    </>
  )
}
