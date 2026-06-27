import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { priceYes } from '@/lib/lmsr'
import Nav from '@/app/components/Nav'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: markets, error } = await supabase
    .from('markets')
    .select('id, question, closes_at, status, b, q_yes, q_no')
    .order('created_at', { ascending: false })

  const openMarkets = markets?.filter((market) => market.status === 'open').length ?? 0

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main>
        <section className="border-b">
          <div className="page-shell grid gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
            <div className="max-w-3xl">
              <p className="eyebrow mb-5">Columbia&apos;s prediction exchange</p>
              <h1 className="display-title max-w-3xl">Trade the questions shaping campus.</h1>
              <p className="mt-5 max-w-2xl text-[1.0625rem] leading-7 text-ink-soft sm:text-lg">
                Put play-money behind your point of view. Prices move with every trade; the market keeps the score.
              </p>
            </div>

            <div className="border-t border-line-strong pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div className="font-numeric flex items-end justify-between">
                <div>
                  <p className="eyebrow">Market board</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{openMarkets}</p>
                  <p className="text-xs text-ink-faint">open now</p>
                </div>
                <Link
                  href="/markets/new"
                  className="inline-flex min-h-11 items-center justify-center bg-ink px-4 text-sm font-semibold text-surface-strong transition-colors hover:bg-accent"
                >
                  Create market
                  <span aria-hidden="true" className="ml-3 text-base">↗</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell py-8 sm:py-10">
          <div className="mb-4 flex items-end justify-between border-b border-line-strong pb-3">
            <div>
              <p className="eyebrow">Live board</p>
              <h2 className="font-display mt-2 text-2xl font-medium tracking-[-0.025em] sm:text-3xl">All markets</h2>
            </div>
            <p className="font-numeric text-xs text-ink-faint">YES / NO quotes</p>
          </div>

          {error ? (
            <div className="border-l-2 border-danger bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              Failed to load markets: {error.message}
            </div>
          ) : markets && markets.length > 0 ? (
            <ul className="border-b border-line-strong">
              {markets.map((market) => {
                const yesProb = priceYes(Number(market.q_yes), Number(market.q_no), Number(market.b))
                const yesPct = Math.round(yesProb * 100)
                const noPct = 100 - yesPct
                const volume = Number(market.q_yes) + Number(market.q_no)
                const closeDate = new Date(market.closes_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <li key={market.id} className="border-t border-line">
                    <Link
                      href={`/markets/${market.id}`}
                      className="group grid min-h-36 gap-5 bg-transparent py-5 transition-colors hover:bg-surface sm:px-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="mb-3 flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                          <span className={market.status === 'open' ? 'text-accent' : 'text-ink-faint'}>{market.status}</span>
                          <span aria-hidden="true">/</span>
                          <span>Campus</span>
                        </div>
                        <h3 className="font-display max-w-2xl text-[1.3rem] font-medium leading-[1.25] tracking-[-0.02em] text-ink sm:text-[1.45rem]">
                          {market.question}
                        </h3>
                        <div className="font-numeric mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-faint">
                          <span>Expires {closeDate}</span>
                          <span>{volume.toLocaleString()} shares traded</span>
                          <span>Liquidity {Number(market.b).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-[1fr_1fr_auto] items-stretch border border-line-strong bg-surface-strong">
                        <div className="border-r px-3 py-3 sm:px-4">
                          <p className="eyebrow text-accent">Yes</p>
                          <p className="font-numeric mt-2 text-2xl font-semibold tracking-[-0.04em] text-accent">{yesPct}¢</p>
                        </div>
                        <div className="border-r px-3 py-3 sm:px-4">
                          <p className="eyebrow">No</p>
                          <p className="font-numeric mt-2 text-2xl font-semibold tracking-[-0.04em] text-ink">{noPct}¢</p>
                        </div>
                        <div className="flex min-w-12 items-center justify-center px-3 text-ink transition-colors group-hover:bg-ink group-hover:text-surface-strong">
                          <span className="sr-only">Open market</span>
                          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="border-y border-line-strong py-16 text-center">
              <p className="font-display text-2xl">The board is quiet.</p>
              <p className="mt-2 text-sm text-ink-soft">Create the first market and set the opening odds.</p>
              <Link href="/markets/new" className="mt-5 inline-block min-h-11 py-3 text-sm font-semibold text-accent underline underline-offset-4">
                Create a market →
              </Link>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
