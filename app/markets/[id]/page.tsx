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
          <p className="font-display text-3xl font-semibold">Market not found.</p>
          <Link href="/" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">
            Back to markets
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
      <main className="page-shell py-6 sm:py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft transition-colors hover:text-ink">
          ← Markets
        </Link>

        <header className="reveal mt-4 pb-6 border-b border-line">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              market.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {market.status}
            </span>
            <span className="text-xs text-ink-soft">Expires {closeDate}</span>
            {lastTradeLabel && (
              <span className="text-xs text-ink-soft">{tradePoints.length} trades · last {lastTradeLabel}</span>
            )}
          </div>
          <h1 className="page-title max-w-4xl">{market.question}</h1>
          {market.description && <p className="mt-3 max-w-3xl text-base leading-7 text-ink-soft">{market.description}</p>}
        </header>

        <div className="reveal reveal-delay-1 grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
          <div className="min-w-0">
            {/* Giant YES/NO numbers */}
            <section aria-label="Current market prices" className="mb-6 rounded-xl border border-line p-6">
              <div className="flex items-end gap-8">
                <a href={isResolved ? '#market-result' : '#trade-ticket'} className="group">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">YES</p>
                  <p className="font-numeric mt-1 text-5xl font-bold leading-none text-accent">{yesPct}¢</p>
                  <p className={`font-numeric mt-1.5 text-xs font-semibold ${movement > 0 ? 'text-positive' : movement < 0 ? 'text-danger' : 'text-ink-soft'}`}>
                    {movement > 0 ? '▲' : movement < 0 ? '▼' : '—'} {Math.abs(movement)} pts
                  </p>
                </a>
                <div className="mb-2 text-2xl font-light text-ink-soft">vs</div>
                <a href={isResolved ? '#market-result' : '#trade-ticket'} className="group">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">NO</p>
                  <p className="font-numeric mt-1 text-5xl font-bold leading-none text-danger">{noPct}¢</p>
                  <p className="font-numeric mt-1.5 text-xs font-semibold text-ink-soft">{isResolved ? 'View result ↓' : 'Click to trade ↓'}</p>
                </a>
                <div className="ml-auto hidden gap-6 sm:flex">
                  <div className="text-right">
                    <p className="font-numeric font-bold text-ink">{volume.toLocaleString()}</p>
                    <p className="text-xs text-ink-soft">shares</p>
                  </div>
                  <div className="text-right">
                    <p className="font-numeric font-bold text-ink">{Number(market.b).toLocaleString()}</p>
                    <p className="text-xs text-ink-soft">liquidity</p>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-red-100">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${yesPct}%` }} />
              </div>
            </section>

            <PriceChart points={pricePoints} />

            <section className="mt-6 rounded-xl border border-line" aria-labelledby="market-leaders-title">
              <div className="border-b px-4 py-3">
                <h2 id="market-leaders-title" className="text-sm font-semibold text-ink">Top traders in this market</h2>
              </div>
              {topTraders.length > 0 ? (
                <ol>
                  {topTraders.map((trader, index) => (
                    <li key={`${trader.displayName}-${index}`} className="font-numeric flex items-center justify-between border-b px-4 py-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-accent">#{index + 1}</span>
                        <span className="text-sm font-semibold text-ink">{trader.displayName}</span>
                      </div>
                      <span className="text-sm text-ink-soft">{trader.totalShares.toLocaleString()} shares</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="px-4 py-6 text-sm text-ink-soft">No positions yet.</p>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
            {isResolved ? (
              <section id="market-result" className="scroll-mt-20 rounded-xl border border-line p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">Final result</p>
                <p className={`font-display mt-3 text-5xl font-bold tracking-tight ${market.resolution === 'yes' ? 'text-accent' : 'text-danger'}`}>
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
