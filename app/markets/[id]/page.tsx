import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { priceYes } from '@/lib/lmsr'
import Nav from '@/app/components/Nav'
import TradePanel from './TradePanel'
import ResolvePanel from './ResolvePanel'
import PriceChart, { type PricePoint } from './PriceChart'

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

  const [{ data: market }, { data: profile }, { data: trades }] = await Promise.all([
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
    // If no trades have been made, extend a flat line to now so the chart isn't a single dot.
    ...(tradePoints.length === 0 ? [{ time: new Date().toISOString(), price: 0.5 }] : []),
  ]
  const isResolved = market.status === 'resolved'

  const yesProb = priceYes(Number(market.q_yes), Number(market.q_no), Number(market.b))
  const yesPct = Math.round(yesProb * 100)
  const noPct = 100 - yesPct
  const volume = Number(market.q_yes) + Number(market.q_no)
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

        <header className="mt-5 border-b border-line-strong pb-7 sm:pb-9">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            <span className={market.status === 'open' ? 'text-accent' : 'text-ink-faint'}>{market.status}</span>
            <span aria-hidden="true">/</span>
            <span>Campus market</span>
            <span aria-hidden="true">/</span>
            <span>Expires {closeDate}</span>
          </div>
          <h1 className="page-title max-w-4xl">{market.question}</h1>
          {market.description && <p className="mt-5 max-w-3xl text-base leading-7 text-ink-soft sm:text-[1.0625rem]">{market.description}</p>}
        </header>

        <div className="grid gap-8 py-7 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:gap-10">
          <div className="min-w-0">
            <section aria-label="Current market prices" className="grid grid-cols-2 border-y border-line-strong sm:grid-cols-4">
              <div className="border-b border-r p-4 sm:border-b-0 sm:p-5">
                <p className="eyebrow text-accent">Yes price</p>
                <p className="font-numeric mt-2 text-[2.6rem] font-semibold leading-none tracking-[-0.055em] text-accent sm:text-5xl">{yesPct}¢</p>
              </div>
              <div className="border-b p-4 sm:border-b-0 sm:border-r sm:p-5">
                <p className="eyebrow">No price</p>
                <p className="font-numeric mt-2 text-[2.6rem] font-semibold leading-none tracking-[-0.055em] sm:text-5xl">{noPct}¢</p>
              </div>
              <div className="border-r p-4 sm:p-5">
                <p className="eyebrow">Volume</p>
                <p className="font-numeric mt-3 text-lg font-semibold">{volume.toLocaleString()}</p>
                <p className="mt-1 text-xs text-ink-faint">shares traded</p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="eyebrow">Liquidity</p>
                <p className="font-numeric mt-3 text-lg font-semibold">{Number(market.b).toLocaleString()}</p>
                <p className="mt-1 text-xs text-ink-faint">market depth</p>
              </div>
            </section>

            <PriceChart points={pricePoints} />
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
            {isResolved ? (
              <section className="border border-line-strong bg-surface-strong p-6">
                <p className="eyebrow">Final result</p>
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
