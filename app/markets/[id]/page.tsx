import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { priceYes } from '@/lib/lmsr'
import { displayNameFromEmail } from '@/lib/display-name'
import { inferCategory } from '@/lib/category'
import { isoTimestampHoursAgo } from '@/lib/time'
import { formatCrowns } from '@/lib/format-crowns'
import Nav from '@/app/components/Nav'
import Badge from '@/app/components/ui/Badge'
import TradePanel from './TradePanel'
import ResolvePanel from './ResolvePanel'
import ShareButton from './ShareButton'
import StickyQuestionHeader from './StickyQuestionHeader'
import PriceChart, { type PricePoint } from './PriceChart'

type MarketPosition = {
  yes_shares: number | string
  no_shares: number | string
  users: { email: string | null; display_name: string | null } | Array<{ email: string | null; display_name: string | null }> | null
}

type TradeDetail = {
  price_after: number
  created_at: string
  cost: number
  side: 'yes' | 'no'
  type: 'buy' | 'sell'
  shares: number
  users: { email: string | null; display_name: string | null } | Array<{ email: string | null; display_name: string | null }> | null
}

function firstUser(u: TradeDetail['users']): { email: string | null; display_name: string | null } | null {
  if (u === null) return null
  return Array.isArray(u) ? u[0] ?? null : u
}

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: market }, { data: profile }, { data: trades }, { data: positions }, { data: myPosition }] = await Promise.all([
    supabase.from('markets').select('id, question, description, closes_at, status, b, q_yes, q_no, resolution, resolved_at, created_at, created_by').eq('id', id).single(),
    supabase.from('users').select('is_admin, crowns').eq('id', user.id).single(),
    supabase.from('trades').select('price_after, created_at, cost, side, type, shares, users(display_name, email)').eq('market_id', id).order('created_at', { ascending: true }),
    supabase.from('positions').select('yes_shares, no_shares, users(email, display_name)').eq('market_id', id),
    supabase.from('positions').select('yes_shares, no_shares').eq('market_id', id).eq('user_id', user.id).maybeSingle(),
  ])

  if (!market) {
    return (
      <>
        <Nav email={user.email ?? ''} />
        <main className="mx-auto max-w-7xl px-6 py-20 text-center">
          <p className="font-display text-3xl font-semibold text-columbia-deep">Market not found.</p>
          <Link href="/" className="mt-5 inline-block text-sm font-semibold text-columbia underline underline-offset-4">
            ← Back to markets
          </Link>
        </main>
      </>
    )
  }

  const userProfile = profile as { is_admin?: boolean; crowns?: number } | null
  const isAdmin = userProfile?.is_admin ?? false
  const isCreator = market.created_by === user.id
  const availableBalance = Number(userProfile?.crowns ?? 0)
  const userYesShares = Number(myPosition?.yes_shares ?? 0)
  const userNoShares = Number(myPosition?.no_shares ?? 0)

  const tradeDetails = (trades ?? []) as unknown as TradeDetail[]
  const tradePoints: PricePoint[] = tradeDetails.map((t) => ({ time: t.created_at, price: Number(t.price_after) }))
  const pricePoints: PricePoint[] = [
    { time: market.created_at, price: 0.5 },
    ...tradePoints,
    ...(tradePoints.length === 0 ? [{ time: new Date().toISOString(), price: 0.5 }] : []),
  ]

  const topTraders = ((positions ?? []) as MarketPosition[])
    .map((p) => {
      const u = Array.isArray(p.users) ? p.users[0] : p.users
      return { displayName: u?.display_name ?? displayNameFromEmail(u?.email), totalShares: Number(p.yes_shares) + Number(p.no_shares) }
    })
    .filter((p) => p.totalShares > 0)
    .sort((a, b) => b.totalShares - a.totalShares)
    .slice(0, 3)

  const isOpen     = market.status === 'open'
  const isResolved = market.status === 'resolved'
  const yesProb = priceYes(Number(market.q_yes), Number(market.q_no), Number(market.b))
  const yesPct = Math.round(yesProb * 100)
  const volume  = Number(market.q_yes) + Number(market.q_no)
  const lastTrade = tradePoints.at(-1)
  const lastTradeLabel = lastTrade
    ? new Date(lastTrade.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null
  const closeDate = new Date(market.closes_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const category = inferCategory(market.question)

  // Stats derived from the augmented trades array — no extra queries needed.
  const totalVolume = tradeDetails.reduce((sum, t) => sum + Math.abs(Number(t.cost)), 0)
  const oneDayAgo = isoTimestampHoursAgo(24)
  const volume24h = tradeDetails
    .filter((t) => t.created_at >= oneDayAgo)
    .reduce((sum, t) => sum + Math.abs(Number(t.cost)), 0)
  const openInterest = ((positions ?? []) as MarketPosition[])
    .filter((p) => Number(p.yes_shares) > 0 || Number(p.no_shares) > 0).length

  const recentActivity = [...tradeDetails]
    .reverse()
    .slice(0, 8)
    .map((t) => {
      const u = firstUser(t.users)
      return {
        name: u?.display_name ?? displayNameFromEmail(u?.email),
        side: t.side,
        type: t.type,
        shares: Number(t.shares),
        price: Number(t.price_after),
        time: t.created_at,
      }
    })

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-6 py-5">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/" className="font-medium transition-colors hover:text-columbia">All markets</Link>
            <span aria-hidden="true">/</span>
            <span className={category.color}>{category.label}</span>
          </nav>

          {/* Header masthead */}
          <div className="mt-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:px-5 sm:py-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    isOpen
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-success' : 'bg-muted-foreground'}`} />
                    {market.status}
                  </span>
                  <Badge tone="columbia">{category.label}</Badge>
                  <span className="text-xs text-muted-foreground">Expires {closeDate}</span>
                  {lastTradeLabel && (
                    <span className="text-xs text-muted-foreground">
                      · {tradePoints.length} trade{tradePoints.length !== 1 ? 's' : ''} · last {lastTradeLabel}
                    </span>
                  )}
                </div>
                <StickyQuestionHeader question={market.question} yesPct={yesPct} />
                {market.description && (
                  <p className="mt-1 line-clamp-1 max-w-3xl text-xs text-muted-foreground">{market.description}</p>
                )}
              </div>
              <ShareButton title={market.question} />
            </div>
          </div>

          {/* Main grid */}
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">

            {/* Left */}
            <div className="flex flex-col gap-4">

              {/* Chart */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <PriceChart points={pricePoints} />
              </div>

              {/* Market stats — compact strip; YES/NO price already lives in the chart + trade ticket */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm">
                {[
                  { label: 'Total shares', value: volume.toLocaleString() },
                  { label: 'Trades', value: tradePoints.length.toLocaleString() },
                  { label: 'Volume', value: `${formatCrowns(totalVolume)} ♛` },
                  { label: 'Open interest', value: openInterest.toLocaleString() },
                  { label: '24h volume', value: `${formatCrowns(volume24h)} ♛` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-baseline gap-1.5 text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              {/* Top traders + Recent activity */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="border-b border-border px-4 py-2.5">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top traders</h2>
                  </div>
                  {topTraders.length > 0 ? (
                    <ol>
                      {topTraders.map((trader, i) => (
                        <li key={`${trader.displayName}-${i}`} className="flex items-center justify-between border-b border-border px-4 py-2 text-sm last:border-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-columbia-soft text-[11px] font-bold text-columbia">
                              {i + 1}
                            </span>
                            <span className="truncate font-semibold text-foreground">{trader.displayName}</span>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">{trader.totalShares.toLocaleString()} shares</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">No positions yet — be the first to trade.</p>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="border-b border-border px-4 py-2.5">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent activity</h2>
                  </div>
                  {recentActivity.length > 0 ? (
                    <ul>
                      {recentActivity.map((a, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 text-sm last:border-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.side === 'yes' ? 'bg-columbia' : 'bg-danger'}`} />
                            <span className="min-w-0 truncate text-foreground">
                              {a.type === 'sell' ? 'Sold' : 'Bought'} {a.shares} <span className="font-semibold uppercase">{a.side}</span>
                            </span>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">{a.name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">No trades yet — be the first.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: trade panel */}
            <aside className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
              {isOpen && isCreator ? (
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Your market</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">You created this market and can resolve it, but cannot trade on it.</p>
                </div>
              ) : isOpen ? (
                <TradePanel
                  marketId={market.id}
                  qYes={Number(market.q_yes)}
                  qNo={Number(market.q_no)}
                  b={Number(market.b)}
                  availableBalance={availableBalance}
                  userYesShares={userYesShares}
                  userNoShares={userNoShares}
                />
              ) : (
                <div id="market-result" className="scroll-mt-20 rounded-2xl border border-border bg-card p-4 shadow-sm">
                  {isResolved ? (
                    <>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Final result</p>
                      <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                        market.resolution === 'yes'
                          ? 'border-success/25 bg-positive-soft text-success'
                          : 'border-danger/25 bg-danger-soft text-danger'
                      }`}>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${market.resolution === 'yes' ? 'bg-success' : 'bg-danger'}`} />
                        {market.resolution?.toUpperCase()} won
                      </div>
                      {market.resolved_at && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Resolved {new Date(market.resolved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Trading closed</p>
                      <p className="text-sm text-muted-foreground">This market is no longer accepting trades.</p>
                    </>
                  )}
                </div>
              )}
              {(isAdmin || isCreator) && isOpen && <ResolvePanel marketId={market.id} />}
            </aside>
          </div>
        </div>
      </main>
    </>
  )
}
