import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { displayNameFromEmail } from '@/lib/display-name'
import Nav from '@/app/components/Nav'
import TradePanel from './TradePanel'
import ResolvePanel from './ResolvePanel'
import PriceChart, { type PricePoint } from './PriceChart'

type MarketPosition = {
  yes_shares: number | string
  no_shares: number | string
  users: { email: string | null; display_name: string | null } | Array<{ email: string | null; display_name: string | null }> | null
}

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: market }, { data: profile }, { data: trades }, { data: positions }, { data: myPosition }] = await Promise.all([
    supabase.from('markets').select('id, question, description, closes_at, status, b, q_yes, q_no, resolution, resolved_at, created_at, created_by').eq('id', id).single(),
    supabase.from('users').select('is_admin, crowns').eq('id', user.id).single(),
    supabase.from('trades').select('price_after, created_at').eq('market_id', id).order('created_at', { ascending: true }),
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

  const tradePoints: PricePoint[] = (trades ?? []).map((t) => ({ time: t.created_at, price: Number(t.price_after) }))
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
  const lastTrade = tradePoints.at(-1)
  const lastTradeLabel = lastTrade
    ? new Date(lastTrade.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null
  const isRecentlyActive = lastTrade
    ? Date.now() - new Date(lastTrade.time).getTime() < 24 * 60 * 60 * 1000
    : false
  const closeDate = new Date(market.closes_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-6 py-8">

          {/* Back */}
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-columbia">
            ← Markets
          </Link>

          {/* Header card */}
          <div className="mt-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                isOpen
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-success' : 'bg-muted-foreground'}`} />
                {market.status}
              </span>
              {isRecentlyActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-500">
                  🔥 active
                </span>
              )}
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">Expires {closeDate}</span>
              {lastTradeLabel && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {tradePoints.length} trade{tradePoints.length !== 1 ? 's' : ''} · last {lastTradeLabel}
                  </span>
                </>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold leading-snug tracking-tight text-columbia-deep sm:text-3xl">
              {market.question}
            </h1>
            {market.description && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{market.description}</p>
            )}
          </div>

          {/* Main grid */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">

            {/* Left */}
            <div className="flex flex-col gap-6">

              {/* Chart */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <PriceChart points={pricePoints} />
              </div>

              {/* Top traders */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-sm font-semibold text-foreground">Top traders in this market</h2>
                </div>
                {topTraders.length > 0 ? (
                  <ol>
                    {topTraders.map((trader, i) => (
                      <li key={`${trader.displayName}-${i}`} className="flex items-center justify-between border-b border-border px-5 py-3.5 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-columbia-soft text-xs font-bold text-columbia">
                            {i + 1}
                          </span>
                          <span className="text-sm font-semibold text-foreground">{trader.displayName}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{trader.totalShares.toLocaleString()} shares</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">No positions yet — be the first to trade.</p>
                )}
              </div>
            </div>

            {/* Right: trade panel */}
            <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
              {isOpen && isCreator ? (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Your market</p>
                  <p className="mt-2 text-sm text-muted-foreground">You created this market and can resolve it, but cannot trade on it.</p>
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
                <div id="market-result" className="scroll-mt-20 rounded-2xl border border-border bg-card p-5 shadow-sm">
                  {isResolved ? (
                    <>
                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Final result</p>
                      <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                        market.resolution === 'yes'
                          ? 'border-columbia/25 bg-columbia-soft text-columbia'
                          : 'border-danger/25 bg-danger/5 text-danger'
                      }`}>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${market.resolution === 'yes' ? 'bg-columbia' : 'bg-danger'}`} />
                        {market.resolution?.toUpperCase()} won
                      </div>
                      {market.resolved_at && (
                        <p className="mt-3 text-xs text-muted-foreground">
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
