import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { priceYes } from '@/lib/lmsr'
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

export default async function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: market }, { data: profile }, { data: trades }, { data: positions }] = await Promise.all([
    supabase
      .from('markets')
      .select('id, question, description, closes_at, status, b, q_yes, q_no, resolution, resolved_at, created_at')
      .eq('id', id)
      .single(),
    supabase
      .from('users')
      .select('is_admin, crowns')
      .eq('id', user.id)
      .single(),
    supabase
      .from('trades')
      .select('price_after, created_at')
      .eq('market_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('positions')
      .select('yes_shares, no_shares, users(email, display_name)')
      .eq('market_id', id),
  ])

  if (!market) {
    return (
      <>
        <Nav email={user.email ?? ''} />
        <main className="page-shell py-20 text-center">
          <p className="font-display text-3xl font-medium">Market not found.</p>
          <Link href="/" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">
            Back to market board
          </Link>
        </main>
      </>
    )
  }

  const userProfile = profile as { is_admin?: boolean; crowns?: number } | null
  const isAdmin = userProfile?.is_admin ?? false
  const availableBalance = Number(userProfile?.crowns ?? 0)

  const tradePoints: PricePoint[] = (trades ?? []).map(t => ({
    time: t.created_at,
    price: Number(t.price_after),
  }))
  const pricePoints: PricePoint[] = [
    { time: market.created_at, price: 0.5 },
    ...tradePoints,
    ...(tradePoints.length === 0 ? [{ time: new Date().toISOString(), price: 0.5 }] : []),
  ]

  const topTraders = ((positions ?? []) as MarketPosition[])
    .map((position) => {
      const relatedUser = Array.isArray(position.users) ? position.users[0] : position.users
      return {
        displayName: relatedUser?.display_name ?? displayNameFromEmail(relatedUser?.email),
        totalShares: Number(position.yes_shares) + Number(position.no_shares),
      }
    })
    .filter((position) => position.totalShares > 0)
    .sort((a, b) => b.totalShares - a.totalShares)
    .slice(0, 3)

  const isResolved = market.status === 'resolved'

  const yesProb = priceYes(Number(market.q_yes), Number(market.q_no), Number(market.b))
  const yesPct = Math.round(yesProb * 100)
  const noPct = 100 - yesPct
  const movement = yesPct - 50
  const volume = Number(market.q_yes) + Number(market.q_no)
  const lastTrade = tradePoints.at(-1)
  const lastTradeLabel = lastTrade
    ? new Date(lastTrade.time).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null
  const closeDate = new Date(market.closes_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="page-shell py-8 sm:py-10">
        <Link href="/" className="inline-flex min-h-11 items-center text-xs font-semibold text-ink-soft underline decoration-transparent underline-offset-4 transition-colors hover:text-ink hover:decoration-line-strong">
          ← Back to market board
        </Link>

        <header className="reveal mt-5 border-b border-line-strong pb-7 sm:pb-9">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            <span className={market.status === 'open' ? 'text-accent' : 'text-ink-faint'}>{market.status}</span>
            <span aria-hidden="true">/</span>
            <span>Expires {closeDate}</span>
            {lastTradeLabel && (
              <>
                <span aria-hidden="true">/</span>
                <span>{tradePoints.length} trades · last {lastTradeLabel}</span>
              </>
            )}
          </div>
          <h1 className="page-title max-w-4xl">{market.question}</h1>
          {market.description && <p className="mt-5 max-w-3xl text-base leading-7 text-ink-soft sm:text-[1.0625rem]">{market.description}</p>}
        </header>

        <div className="reveal reveal-delay-1 grid gap-8 py-7 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:gap-10">
          <div className="min-w-0">
            <section aria-label="Current market prices" className="grid grid-cols-2 border border-line-strong bg-surface sm:grid-cols-4">
              <a href={isResolved ? '#market-result' : '#trade-ticket'} className="quote-cell border-b border-r p-4 sm:border-b-0 sm:p-5">
                <p className="eyebrow text-accent">Yes price</p>
                <p className="font-numeric mt-2 text-[2.6rem] font-semibold leading-none tracking-[-0.055em] text-accent sm:text-5xl">{yesPct}¢</p>
                <p className={`font-numeric mt-2 text-[0.6875rem] font-semibold ${movement > 0 ? 'text-positive' : movement < 0 ? 'text-danger' : 'text-ink-faint'}`}>
                  {movement > 0 ? '▲' : movement < 0 ? '▼' : '—'} {Math.abs(movement)} pts vs open
                </p>
              </a>
              <a href={isResolved ? '#market-result' : '#trade-ticket'} className="quote-cell border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
                <p className="eyebrow">No price</p>
                <p className="font-numeric mt-2 text-[2.6rem] font-semibold leading-none tracking-[-0.055em] sm:text-5xl">{noPct}¢</p>
                <p className="font-numeric mt-2 text-[0.6875rem] font-semibold text-ink-faint">{isResolved ? 'View result ↓' : 'Open order ticket ↓'}</p>
              </a>
              <div className="border-r bg-surface-muted p-4 sm:p-5">
                <p className="eyebrow">Volume</p>
                <p className="font-numeric mt-3 text-lg font-semibold">{volume.toLocaleString()}</p>
                <p className="mt-1 text-xs text-ink-faint">shares traded</p>
              </div>
              <div className="bg-surface-muted p-4 sm:p-5">
                <p className="eyebrow">Liquidity</p>
                <p className="font-numeric mt-3 text-lg font-semibold">{Number(market.b).toLocaleString()}</p>
                <p className="mt-1 text-xs text-ink-faint">market depth</p>
              </div>
            </section>

            <PriceChart points={pricePoints} />

            <section className="mt-8 border-y border-line-strong" aria-labelledby="market-leaders-title">
              <div className="flex items-end justify-between border-b px-1 py-3">
                <div>
                  <p className="eyebrow">Market leaderboard</p>
                  <h2 id="market-leaders-title" className="font-display mt-1 text-xl font-medium tracking-[-0.02em]">Top traders in this market</h2>
                </div>
                <p className="font-numeric text-xs text-ink-faint">by total position</p>
              </div>
              {topTraders.length > 0 ? (
                <ol>
                  {topTraders.map((trader, index) => (
                    <li key={`${trader.displayName}-${index}`} className="font-numeric grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center border-b px-2 py-3 transition-colors duration-150 last:border-0 hover:bg-surface-raised">
                      <span className="text-sm font-semibold text-accent">{String(index + 1).padStart(2, '0')}</span>
                      <span className="truncate text-sm font-semibold text-ink">{trader.displayName}</span>
                      <span className="text-sm font-semibold text-ink-soft">{trader.totalShares.toLocaleString()} shares</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="px-1 py-6 text-sm text-ink-soft">No positions yet. The first order takes the lead.</p>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
            {isResolved ? (
              <section id="market-result" className="scroll-mt-20 border border-line-strong border-t-2 border-t-accent bg-surface-raised p-6">
                <div className="mb-5 flex items-center justify-between border-b pb-3">
                  <p className="eyebrow">Final result</p>
                  <span className="font-numeric text-[0.625rem] font-bold uppercase tracking-[0.1em] text-accent">Settlement complete</span>
                </div>
                <p className={`font-display mt-3 text-4xl font-medium tracking-[-0.04em] ${market.resolution === 'yes' ? 'text-accent' : 'text-ink'}`}>
                  {market.resolution?.toUpperCase()} won
                </p>
                {market.resolved_at && (
                  <p className="mt-3 text-sm text-ink-soft">
                    {new Date(market.resolved_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </section>
            ) : (
              <TradePanel
                marketId={market.id}
                qYes={Number(market.q_yes)}
                qNo={Number(market.q_no)}
                b={Number(market.b)}
                availableBalance={availableBalance}
              />
            )}

            {isAdmin && !isResolved && <ResolvePanel marketId={market.id} />}
          </aside>
        </div>
      </main>
    </>
  )
}
