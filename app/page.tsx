import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { priceYes } from '@/lib/lmsr'
import { isoTimestampHoursAgo } from '@/lib/time'
import Nav from '@/app/components/Nav'

type MarketView = 'all' | 'open' | 'resolved' | 'active'

const marketViews: Array<{ value: MarketView; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'active', label: 'Active · 24h' },
]

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>
}) {
  const { view } = await searchParams
  const requestedView = Array.isArray(view) ? view[0] : view
  const currentView: MarketView = marketViews.some((option) => option.value === requestedView)
    ? requestedView as MarketView
    : 'all'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userProfile } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', user.id)
    .single()

  if (!userProfile?.display_name) redirect('/onboarding')

  const oneDayAgo = isoTimestampHoursAgo(24)
  const [marketsResult, recentTradesResult] = await Promise.all([
    supabase
      .from('markets')
      .select('id, question, closes_at, status, b, q_yes, q_no')
      .order('created_at', { ascending: false }),
    supabase
      .from('trades')
      .select('market_id')
      .gte('created_at', oneDayAgo),
  ])

  const { data: markets, error } = marketsResult
  const recentTradeCounts = new Map<string, number>()
  for (const trade of recentTradesResult.data ?? []) {
    recentTradeCounts.set(trade.market_id, (recentTradeCounts.get(trade.market_id) ?? 0) + 1)
  }

  const openMarkets = markets?.filter((market) => market.status === 'open') ?? []
  const marketCounts: Record<MarketView, number> = {
    all: markets?.length ?? 0,
    open: openMarkets.length,
    resolved: markets?.filter((market) => market.status === 'resolved').length ?? 0,
    active: markets?.filter((market) => recentTradeCounts.has(market.id)).length ?? 0,
  }
  const filteredMarkets = (markets ?? []).filter((market) => {
    if (currentView === 'open') return market.status === 'open'
    if (currentView === 'resolved') return market.status === 'resolved'
    if (currentView === 'active') return recentTradeCounts.has(market.id)
    return true
  })

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main>
        {/* Hero */}
        <section className="reveal border-b border-line bg-white py-12 text-center sm:py-16">
          <div className="page-shell">
            <h1 className="display-title">What happens next?</h1>
            <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">
              Trade on campus events. Play money, real predictions.
            </p>
          </div>
        </section>

        {/* Market feed */}
        <section className="reveal reveal-delay-1 page-shell py-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-ink-soft">Markets</span>
              <div className="flex items-center gap-1.5">
                {marketViews.map((option) => {
                  const selected = option.value === currentView
                  return (
                    <Link
                      key={option.value}
                      href={option.value === 'all' ? '/' : `/?view=${option.value}`}
                      aria-current={selected ? 'page' : undefined}
                      className={`pressable rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        selected
                          ? 'bg-accent text-white'
                          : 'bg-surface-muted text-ink-soft hover:bg-line hover:text-ink'
                      }`}
                    >
                      {option.label}
                      <span className={`ml-1 ${selected ? 'opacity-70' : 'opacity-60'}`}>
                        {marketCounts[option.value]}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
            <Link
              href="/markets/new"
              className="pressable rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              + New market
            </Link>
          </div>

          {error ? (
            <div className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              Failed to load markets: {error.message}
            </div>
          ) : filteredMarkets.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMarkets.map((market) => {
                const yesProb = priceYes(Number(market.q_yes), Number(market.q_no), Number(market.b))
                const yesPct = Math.round(yesProb * 100)
                const noPct = 100 - yesPct
                const recentTrades = recentTradeCounts.get(market.id) ?? 0
                const isOpen = market.status === 'open'
                const closeDate = new Date(market.closes_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })

                return (
                  <li key={market.id}>
                    <Link
                      href={`/markets/${market.id}`}
                      className="market-card block rounded-xl p-4"
                    >
                      {/* Top row: status + date */}
                      <div className="mb-2.5 flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {market.status}
                        </span>
                        <span className="text-xs text-ink-soft">Closes {closeDate}</span>
                        {recentTrades > 0 && (
                          <span className="ml-auto text-xs font-medium text-accent">{recentTrades} trades</span>
                        )}
                      </div>

                      {/* Question + YES% */}
                      <div className="flex items-start gap-3">
                        <p className="font-numeric line-clamp-2 flex-1 text-base font-semibold leading-snug text-ink">
                          {market.question}
                        </p>
                        <div className="shrink-0 text-right">
                          <p className="font-numeric text-3xl font-bold leading-none text-accent">{yesPct}</p>
                          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">YES</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-red-100">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${yesPct}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex justify-between text-xs font-medium text-ink-soft">
                        <span className="text-accent">YES {yesPct}%</span>
                        <span className="text-danger">NO {noPct}%</span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="rounded-xl border border-line bg-surface-muted py-16 text-center">
              <p className="font-display text-2xl font-semibold">No {currentView === 'all' ? '' : `${currentView} `}markets yet.</p>
              <p className="mt-2 text-sm text-ink-soft">
                {currentView === 'active' ? 'Activity appears after a trade.' : 'Try another filter or open a new market.'}
              </p>
              {currentView !== 'all' && (
                <Link href="/" className="mt-5 inline-block text-sm font-semibold text-accent underline underline-offset-4">
                  View all markets →
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
