'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { displayNameFromEmail } from '@/lib/display-name'

// PostgREST embeds a to-one relation (trades -> one user/market) as a single
// object, not an array — but which shape actually comes back can vary, so
// callers throughout this codebase normalize defensively (see MarketPosition
// in app/markets/[id]/page.tsx). Indexing with [0] on the object shape
// silently returns undefined, which is what was causing every row here to
// fall back to "Someone" / "a market" regardless of the real trade data.
type EmbeddedUser = { email: string | null; display_name: string | null }
type EmbeddedMarket = { question: string }

type TradeRow = {
  id: string
  side: 'yes' | 'no'
  type: 'buy' | 'sell'
  shares: number
  users: EmbeddedUser | EmbeddedUser[] | null
  markets: EmbeddedMarket | EmbeddedMarket[] | null
}

function first<T>(value: T | T[] | null): T | null {
  if (value === null) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

const POLL_MS = 15_000

export default function ActivityTicker() {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [trades, setTrades] = useState<TradeRow[] | null>(null)

  const fetchTrades = useCallback(async () => {
    const { data } = await supabase
      .from('trades')
      .select('id, side, type, shares, users(email, display_name), markets(question)')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setTrades(data as unknown as TradeRow[])
  }, [supabase])

  useEffect(() => {
    fetchTrades()
    const id = setInterval(fetchTrades, POLL_MS)
    return () => clearInterval(id)
  }, [fetchTrades])

  // Hidden on the login/landing page — there's no session yet and the
  // ticker competes with the login form for attention.
  if (pathname === '/login') {
    return null
  }

  // Stable-height placeholder while the first fetch is in flight
  if (trades === null) {
    return <div className="sticky bottom-0 z-20 mt-auto h-9 border-t border-columbia/15 bg-[#F4F8FF]" />
  }

  if (trades.length === 0) {
    return (
      <div className="sticky bottom-0 z-20 mt-auto border-t border-columbia/15 bg-[#F4F8FF] py-2 text-center text-xs text-muted-foreground">
        No activity yet
      </div>
    )
  }

  // 2s per trade, clamped to 30–60s total for the full strip
  const duration = Math.min(60, Math.max(30, trades.length * 2))

  return (
    <div
      className="sticky bottom-0 z-20 mt-auto overflow-hidden border-t border-columbia/15 bg-[#F4F8FF] py-2"
      aria-label="Recent trading activity"
      aria-live="off"
    >
      {/* Fade masks on each edge */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#F4F8FF] to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#F4F8FF] to-transparent" aria-hidden="true" />

      {/*
        The track contains the full trade list twice back-to-back.
        Animating translateX(0 → -50%) scrolls exactly one full copy off-screen,
        at which point the animation loops back to 0 — seamless and invisible.
      */}
      <div
        className="animate-ticker flex whitespace-nowrap"
        style={{ animationDuration: `${duration}s` }}
      >
        {[...trades, ...trades].map((trade, i) => {
          const user = first(trade.users)
          const name = user?.display_name ?? displayNameFromEmail(user?.email)
          const shares = Math.round(Number(trade.shares))
          const side = trade.side.toUpperCase()
          const question = first(trade.markets)?.question ?? 'a market'
          const truncated = question.length > 52 ? question.slice(0, 52).trimEnd() + '…' : question

          return (
            <span key={`${trade.id}-${i}`} className="inline-flex shrink-0 items-center gap-1.5 px-5 text-xs">
              <span className="select-none text-columbia/40 px-1" aria-hidden="true">•</span>
              <span className="font-semibold text-columbia-deep">@{name}</span>
              <span className="text-foreground/70">{trade.type === 'sell' ? 'sold' : 'bought'} {shares}</span>
              <span className={`font-bold ${side === 'YES' ? 'text-success' : 'text-danger'}`}>
                {side}
              </span>
              <span className="text-foreground/70">on &ldquo;{truncated}&rdquo;</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
