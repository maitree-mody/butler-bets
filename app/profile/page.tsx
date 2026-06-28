import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/app/components/Nav'
import { priceYes } from '@/lib/lmsr'
import EditDisplayName from './EditDisplayName'

const STARTING_CROWNS = 1000

type TradeRow = {
  id: string
  market_id: string
  side: string
  shares: number
  cost: number
  created_at: string
  markets: { question: string } | null
}

type PositionRow = {
  yes_shares: number
  no_shares: number
  markets: {
    id: string
    question: string
    status: string
    q_yes: number
    q_no: number
    b: number
  } | null
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: rawTrades }, { data: rawPositions }] =
    await Promise.all([
      supabase
        .from('users')
        .select('crowns, created_at, display_name')
        .eq('id', user.id)
        .single(),
      supabase
        .from('trades')
        .select('id, market_id, side, shares, cost, created_at, markets(question)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('positions')
        .select('yes_shares, no_shares, markets(id, question, status, q_yes, q_no, b)')
        .eq('user_id', user.id),
    ])

  const trades = (rawTrades ?? []) as unknown as TradeRow[]
  const positions = (rawPositions ?? []) as unknown as PositionRow[]

  const crowns = Number(profile?.crowns ?? 0)
  const profit = crowns - STARTING_CROWNS
  const totalTrades = trades.length
  const distinctMarkets = new Set(trades.map(t => t.market_id)).size
  const openPositions = positions.filter(
    p =>
      p.markets?.status === 'open' &&
      (Number(p.yes_shares) > 0 || Number(p.no_shares) > 0),
  )
  const recentTrades = trades.slice(0, 15)

  const displayName = (profile as { display_name?: string | null } | null)?.display_name ?? null
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      })
    : null

  const stats = [
    { label: 'Balance', value: crowns.toFixed(2), sub: 'crowns', color: 'text-foreground' },
    {
      label: 'Total profit',
      value: `${profit >= 0 ? '+' : ''}${profit.toFixed(2)}`,
      sub: 'vs. 1,000 start',
      color: profit >= 0 ? 'text-success' : 'text-danger',
    },
    { label: 'Trades', value: String(totalTrades), sub: 'executed', color: 'text-foreground' },
    { label: 'Markets', value: String(distinctMarkets), sub: 'participated in', color: 'text-foreground' },
    { label: 'Open positions', value: String(openPositions.length), sub: 'active markets', color: 'text-foreground' },
  ]

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="page-shell py-8 sm:py-10">

        {/* ── Account header card ─────────────────────────── */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <p className="eyebrow mb-3">Your account</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-columbia-deep sm:text-3xl">
            {displayName ?? user.email}
          </h1>
          {displayName && (
            <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
          )}
          {memberSince && (
            <p className="mt-1 text-sm text-muted-foreground">Member since {memberSince}</p>
          )}

          <div className="mt-5 border-t border-border pt-5">
            <p className="eyebrow mb-3">Display name</p>
            <EditDisplayName current={displayName} />
          </div>
        </div>

        {/* ── Stat cards ──────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map(({ label, value, sub, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
            >
              <p className="eyebrow mb-2">{label}</p>
              <p className={`font-numeric text-2xl font-bold leading-none tracking-tight sm:text-3xl ${color}`}>
                {value}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Open positions ──────────────────────────────── */}
        <section className="mb-6" aria-labelledby="positions-heading">
          <div className="mb-3 flex items-baseline gap-3">
            <h2
              id="positions-heading"
              className="font-display text-xl font-bold tracking-tight text-columbia-deep"
            >
              Your positions
            </h2>
            <span className="font-numeric text-sm text-muted-foreground">
              {openPositions.length} open
            </span>
          </div>

          {openPositions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">No open positions yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table
                  className="font-numeric w-full min-w-[36rem]"
                  aria-label="Open positions"
                >
                  <thead>
                    <tr className="border-b border-border bg-muted/60">
                      <th className="py-3 pl-5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Market
                      </th>
                      <th className="py-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        YES shares
                      </th>
                      <th className="py-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        NO shares
                      </th>
                      <th className="py-3 pr-5 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Est. value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map(pos => {
                      const m = pos.markets!
                      const rawP = priceYes(Number(m.q_yes), Number(m.q_no), Number(m.b))
                      const p = isFinite(rawP) ? rawP : 0.5
                      const value =
                        Number(pos.yes_shares) * p +
                        Number(pos.no_shares) * (1 - p)
                      return (
                        <tr
                          key={m.id}
                          className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                        >
                          <td className="max-w-xs py-3.5 pl-5 pr-4 text-sm font-medium text-foreground">
                            {m.question}
                          </td>
                          <td className="py-3.5 pr-4 text-right text-sm font-semibold text-columbia">
                            {Number(pos.yes_shares).toFixed(0)}
                          </td>
                          <td className="py-3.5 pr-4 text-right text-sm text-muted-foreground">
                            {Number(pos.no_shares).toFixed(0)}
                          </td>
                          <td className="py-3.5 pr-5 text-right text-sm font-semibold text-foreground">
                            {value.toFixed(2)} ♛
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── Recent activity ─────────────────────────────── */}
        <section aria-labelledby="activity-heading">
          <div className="mb-3 flex items-baseline gap-3">
            <h2
              id="activity-heading"
              className="font-display text-xl font-bold tracking-tight text-columbia-deep"
            >
              Recent activity
            </h2>
            {recentTrades.length > 0 && (
              <span className="font-numeric text-sm text-muted-foreground">
                last {recentTrades.length}
              </span>
            )}
          </div>

          {recentTrades.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">
                No trades yet — head to a market to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table
                  className="font-numeric w-full min-w-[36rem]"
                  aria-label="Recent trades"
                >
                  <thead>
                    <tr className="border-b border-border bg-muted/60">
                      <th className="py-3 pl-5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Market
                      </th>
                      <th className="py-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Side
                      </th>
                      <th className="py-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Shares
                      </th>
                      <th className="py-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Cost
                      </th>
                      <th className="py-3 pr-5 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTrades.map(trade => (
                      <tr
                        key={trade.id}
                        className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                      >
                        <td className="max-w-[14rem] truncate py-3.5 pl-5 pr-4 text-sm font-medium text-foreground">
                          {trade.markets?.question ?? '—'}
                        </td>
                        <td className="py-3.5 pr-4 text-right">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            trade.side === 'yes'
                              ? 'bg-columbia-soft text-columbia'
                              : 'bg-danger/5 text-danger'
                          }`}>
                            {trade.side}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-right text-sm text-foreground">
                          {Number(trade.shares).toFixed(0)}
                        </td>
                        <td className="py-3.5 pr-4 text-right text-sm text-foreground">
                          {Number(trade.cost).toFixed(2)}
                        </td>
                        <td className="py-3.5 pr-5 text-right text-xs text-muted-foreground">
                          {new Date(trade.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
