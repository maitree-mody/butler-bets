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
  const featuredMarket = [...openMarkets].sort(
    (a, b) => (recentTradeCounts.get(b.id) ?? 0) - (recentTradeCounts.get(a.id) ?? 0),
  )[0]
  const featuredYesPct = featuredMarket
    ? Math.round(priceYes(Number(featuredMarket.q_yes), Number(featuredMarket.q_no), Number(featuredMarket.b)) * 100)
    : null
  const currentViewLabel = marketViews.find((option) => option.value === currentView)?.label ?? 'All'

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main>
        <section className="reveal border-b">
          <div className="page-shell grid gap-9 py-9 sm:py-12 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-1.5 w-1.5 bg-accent" aria-hidden="true" />
                <p className="eyebrow">Columbia&apos;s prediction exchange</p>
              </div>
              <h1 className="display-title max-w-3xl">Trade the questions shaping campus.</h1>
              <p className="mt-5 max-w-2xl text-[1.0625rem] leading-7 text-ink-soft sm:text-lg">
                Put play-money behind your point of view. Prices move with every trade; the market keeps the score.
              </p>
              <Link
                href="/markets/new"
                className="pressable mt-6 inline-flex min-h-11 items-center border-b border-ink py-2 text-sm font-bold text-ink hover:border-accent hover:text-accent"
              >
                Open a new market <span aria-hidden="true" className="ml-3">↗</span>
              </Link>
            </div>

            <aside className="border border-line-strong bg-surface" aria-label="Live market snapshot">
              <div className="font-numeric flex items-center justify-between border-b bg-surface-muted px-4 py-3">
                <div>
                  <p className="eyebrow">Market board</p>
                  <p className="mt-1 text-xs text-ink-faint">Live exchange snapshot</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold tracking-[-0.04em]">{openMarkets.length}</p>
                  <p className="text-[0.625rem] font-bold uppercase tracking-[0.1em] text-accent">Open now</p>
                </div>
              </div>

              {featuredMarket && featuredYesPct !== null ? (
                <Link href={`/markets/${featuredMarket.id}`} className="group block bg-surface-raised p-4 transition-colors hover:bg-surface-active">
                  <div className="flex items-center justify-between gap-3">
                    <p className="eyebrow text-accent">{(recentTradeCounts.get(featuredMarket.id) ?? 0) > 0 ? 'Most active · 24h' : 'Open market'}</p>
                    <span className="text-xs text-ink-faint transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true">→</span>
                  </div>
                  <p className="font-display mt-3 line-clamp-2 text-lg font-medium leading-snug tracking-[-0.02em]">{featuredMarket.question}</p>
                  <div className="font-numeric mt-4 grid grid-cols-2 border border-line-strong">
                    <div className="border-r bg-surface-strong px-3 py-2.5">
                      <p className="eyebrow text-accent">Yes</p>
                      <p className="mt-1 text-xl font-semibold text-accent">{featuredYesPct}¢</p>
                    </div>
                    <div className="bg-surface-strong px-3 py-2.5">
                      <p className="eyebrow">No</p>
                      <p className="mt-1 text-xl font-semibold">{100 - featuredYesPct}¢</p>
                    </div>
                  </div>
                  <p className="font-numeric mt-3 text-[0.6875rem] text-ink-faint">
                    {recentTradeCounts.get(featuredMarket.id) ?? 0} trades in the last 24h
                  </p>
                </Link>
              ) : (
                <div className="px-4 py-8 text-sm text-ink-soft">No open markets on the board.</div>
              )}
            </aside>
          </div>
        </section>

        <section className="reveal reveal-delay-1 page-shell py-8 sm:py-10">
          <div className="flex items-end justify-between border-b border-line-strong pb-3">
            <div>
              <p className="eyebrow">Live board</p>
              <h2 className="font-display mt-2 text-2xl font-medium tracking-[-0.025em] sm:text-3xl">{currentViewLabel} markets</h2>
            </div>
            <p className="font-numeric text-xs text-ink-faint">YES / NO quotes</p>
          </div>

          <nav aria-label="Filter markets" className="mb-4 overflow-x-auto border-b">
            <div className="flex min-w-max">
              {marketViews.map((option) => {
                const selected = option.value === currentView
                return (
                  <Link
                    key={option.value}
                    href={option.value === 'all' ? '/' : `/?view=${option.value}`}
                    aria-current={selected ? 'page' : undefined}
                    className={`pressable font-numeric flex min-h-11 items-center gap-2 border-r px-4 text-xs font-bold first:border-l ${
                      selected ? 'bg-ink text-white' : 'bg-surface text-ink-soft hover:bg-surface-raised hover:text-ink'
                    }`}
                  >
                    {option.label}
                    <span className={selected ? 'text-white/60' : 'text-ink-faint'}>{marketCounts[option.value]}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {error ? (
            <div className="border-l-2 border-danger bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              Failed to load markets: {error.message}
            </div>
          ) : filteredMarkets.length > 0 ? (
            <ul className="border-b border-line-strong">
              {filteredMarkets.map((market) => {
                const yesProb = priceYes(Number(market.q_yes), Number(market.q_no), Number(market.b))
                const yesPct = Math.round(yesProb * 100)
                const noPct = 100 - yesPct
                const movement = yesPct - 50
                const recentTrades = recentTradeCounts.get(market.id) ?? 0
                const isOpen = market.status === 'open'
                const quoteTarget = isOpen ? `/markets/${market.id}#trade-ticket` : `/markets/${market.id}`
                const volume = Number(market.q_yes) + Number(market.q_no)
                const closeDate = new Date(market.closes_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <li key={market.id} className="border-t border-line">
                    <article className="interactive-row grid min-h-36 gap-5 px-4 py-5 md:grid-cols-[minmax(0,1fr)_19rem] md:items-center">
                      <Link href={`/markets/${market.id}`} className="group/market min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                          <span className={market.status === 'open' ? 'text-accent' : 'text-ink-faint'}>{market.status}</span>
                          {recentTrades > 0 && (
                            <>
                              <span aria-hidden="true">/</span>
                              <span className="text-accent">Active · {recentTrades} trades</span>
                            </>
                          )}
                          <span aria-hidden="true">/</span>
                          <span className={movement > 0 ? 'text-positive' : movement < 0 ? 'text-danger' : 'text-ink-faint'}>
                            {movement > 0 ? '▲' : movement < 0 ? '▼' : '—'} {Math.abs(movement)} pts vs open
                          </span>
                        </div>
                        <h3 className="font-display max-w-2xl text-[1.3rem] font-medium leading-[1.25] tracking-[-0.02em] text-ink underline decoration-transparent underline-offset-4 transition-colors duration-150 group-hover/market:text-accent group-hover/market:decoration-accent">
                          {market.question}
                        </h3>
                        <div className="font-numeric mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-faint">
                          <span>Expires {closeDate}</span>
                          <span>{volume.toLocaleString()} shares traded</span>
                          <span>Liquidity {Number(market.b).toLocaleString()}</span>
                        </div>
                      </Link>

                      <div className="grid grid-cols-[1fr_1fr_3rem] items-stretch border border-line-strong bg-surface-strong">
                        <Link
                          href={quoteTarget}
                          className="quote-cell border-r px-3 py-3 sm:px-4"
                          aria-label={`${isOpen ? 'Trade' : 'View'} YES at ${yesPct} cents`}
                        >
                          <p className="eyebrow text-accent">{isOpen ? 'Buy yes' : 'Final yes'}</p>
                          <p className="font-numeric mt-2 text-2xl font-semibold tracking-[-0.04em] text-accent">{yesPct}¢</p>
                        </Link>
                        <Link
                          href={quoteTarget}
                          className="quote-cell border-r px-3 py-3 sm:px-4"
                          aria-label={`${isOpen ? 'Trade' : 'View'} NO at ${noPct} cents`}
                        >
                          <p className="eyebrow">{isOpen ? 'Buy no' : 'Final no'}</p>
                          <p className="font-numeric mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">{noPct}¢</p>
                        </Link>
                        <Link
                          href={`/markets/${market.id}`}
                          className="pressable group/arrow flex items-center justify-center bg-surface-muted text-ink hover:bg-ink hover:text-surface-strong"
                          aria-label={`Open market: ${market.question}`}
                        >
                          <span aria-hidden="true" className="transition-transform duration-150 group-hover/arrow:translate-x-0.5">→</span>
                        </Link>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="border-y border-line-strong bg-surface py-16 text-center">
              <p className="font-display text-2xl">No {currentView === 'all' ? '' : `${currentView} `}markets to show.</p>
              <p className="mt-2 text-sm text-ink-soft">
                {currentView === 'active' ? 'Activity appears here after a trade is placed.' : 'Try another view or open a new market.'}
              </p>
              {currentView !== 'all' && (
                <Link href="/" className="pressable mt-5 inline-block min-h-11 py-3 text-sm font-semibold text-accent underline underline-offset-4">
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
