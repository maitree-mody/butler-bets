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

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="page-shell py-8 sm:py-10">

        {/* ── Header ─────────────────────────────────────── */}
        <header className="border-b border-line-strong pb-7 sm:pb-9">
          <p className="eyebrow mb-4">Your account</p>
          <h1 className="page-title">{displayName ?? user.email}</h1>
          {displayName && (
            <p className="mt-2 break-all text-sm text-ink-faint">{user.email}</p>
          )}
          {memberSince && (
            <p className="mt-3 text-sm text-ink-faint">Member since {memberSince}</p>
          )}

          <div className="mt-6">
            <p className="eyebrow mb-3">Display name</p>
            <EditDisplayName current={displayName} />
          </div>
        </header>

        {/* ── Stats ──────────────────────────────────────── */}
        <section
          aria-label="Your stats"
          className="grid grid-cols-2 border-b border-line-strong sm:grid-cols-3 lg:grid-cols-5"
        >
          <div className="border-b border-r p-4 sm:p-5 lg:border-b-0">
            <p className="eyebrow">Balance</p>
            <p className="font-numeric mt-2 text-[2rem] font-semibold leading-none tracking-[-0.04em] sm:text-[2.25rem]">
              {crowns.toFixed(2)}
            </p>
            <p className="mt-1.5 text-xs text-ink-faint">crowns</p>
          </div>

          <div className="border-b p-4 sm:border-r sm:p-5 lg:border-b-0">
            <p className="eyebrow">Total profit</p>
            <p
              className={`font-numeric mt-2 text-[2rem] font-semibold leading-none tracking-[-0.04em] sm:text-[2.25rem] ${
                profit >= 0 ? 'text-accent' : 'text-danger'
              }`}
            >
              {profit >= 0 ? '+' : ''}
              {profit.toFixed(2)}
            </p>
            <p className="mt-1.5 text-xs text-ink-faint">vs. 1,000 start</p>
          </div>

          <div className="border-b border-r p-4 sm:border-b-0 sm:p-5 lg:border-r">
            <p className="eyebrow">Trades</p>
            <p className="font-numeric mt-2 text-[2rem] font-semibold leading-none tracking-[-0.04em] sm:text-[2.25rem]">
              {totalTrades}
            </p>
            <p className="mt-1.5 text-xs text-ink-faint">executed</p>
          </div>

          <div className="border-r p-4 sm:p-5 lg:border-r">
            <p className="eyebrow">Markets</p>
            <p className="font-numeric mt-2 text-[2rem] font-semibold leading-none tracking-[-0.04em] sm:text-[2.25rem]">
              {distinctMarkets}
            </p>
            <p className="mt-1.5 text-xs text-ink-faint">participated in</p>
          </div>

          <div className="col-span-2 border-t p-4 sm:col-span-1 sm:border-t-0 sm:p-5 lg:border-l">
            <p className="eyebrow">Open positions</p>
            <p className="font-numeric mt-2 text-[2rem] font-semibold leading-none tracking-[-0.04em] sm:text-[2.25rem]">
              {openPositions.length}
            </p>
            <p className="mt-1.5 text-xs text-ink-faint">active markets</p>
          </div>
        </section>

        {/* ── Open positions table ────────────────────────── */}
        <section className="mt-10" aria-labelledby="positions-heading">
          <div className="mb-4 flex items-baseline gap-3">
            <h2
              id="positions-heading"
              className="font-display text-2xl font-medium tracking-[-0.025em]"
            >
              Your positions
            </h2>
            <span className="font-numeric text-sm text-ink-faint">
              {openPositions.length} open
            </span>
          </div>

          {openPositions.length === 0 ? (
            <p className="border-y border-line-strong py-12 text-center text-sm text-ink-soft">
              No open positions yet.
            </p>
          ) : (
            <div className="overflow-x-auto border-y border-line-strong">
              <table
                className="font-numeric w-full min-w-[36rem]"
                aria-label="Open positions"
              >
                <thead>
                  <tr className="border-b">
                    <th className="py-3 pr-4 text-left text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
                      Market
                    </th>
                    <th className="py-3 pr-4 text-right text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
                      YES shares
                    </th>
                    <th className="py-3 pr-4 text-right text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
                      NO shares
                    </th>
                    <th className="py-3 text-right text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
                      Est. value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {openPositions.map(pos => {
                    const m = pos.markets!
                    const p = priceYes(Number(m.q_yes), Number(m.q_no), Number(m.b))
                    const value =
                      Number(pos.yes_shares) * p +
                      Number(pos.no_shares) * (1 - p)
                    return (
                      <tr
                        key={m.id}
                        className="border-b last:border-0 transition-colors hover:bg-surface"
                      >
                        <td className="max-w-xs py-4 pr-4 text-sm font-medium text-ink">
                          {m.question}
                        </td>
                        <td className="py-4 pr-4 text-right text-sm text-accent">
                          {Number(pos.yes_shares).toFixed(0)}
                        </td>
                        <td className="py-4 pr-4 text-right text-sm text-ink-soft">
                          {Number(pos.no_shares).toFixed(0)}
                        </td>
                        <td className="py-4 text-right text-sm font-semibold">
                          {value.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Recent activity ─────────────────────────────── */}
        <section className="mt-10" aria-labelledby="activity-heading">
          <div className="mb-4 flex items-baseline gap-3">
            <h2
              id="activity-heading"
              className="font-display text-2xl font-medium tracking-[-0.025em]"
            >
              Recent activity
            </h2>
            <span className="font-numeric text-sm text-ink-faint">
              last {recentTrades.length}
            </span>
          </div>

          {recentTrades.length === 0 ? (
            <p className="border-y border-line-strong py-12 text-center text-sm text-ink-soft">
              No trades yet — head to a market to get started.
            </p>
          ) : (
            <div className="overflow-x-auto border-y border-line-strong">
              <table
                className="font-numeric w-full min-w-[36rem]"
                aria-label="Recent trades"
              >
                <thead>
                  <tr className="border-b">
                    <th className="py-3 pr-4 text-left text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
                      Market
                    </th>
                    <th className="py-3 pr-4 text-right text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
                      Side
                    </th>
                    <th className="py-3 pr-4 text-right text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
                      Shares
                    </th>
                    <th className="py-3 pr-4 text-right text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
                      Cost
                    </th>
                    <th className="py-3 text-right text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map(trade => (
                    <tr
                      key={trade.id}
                      className="border-b last:border-0 transition-colors hover:bg-surface"
                    >
                      <td className="max-w-[14rem] truncate py-4 pr-4 text-sm font-medium text-ink">
                        {trade.markets?.question ?? '—'}
                      </td>
                      <td
                        className={`py-4 pr-4 text-right text-xs font-bold uppercase tracking-[0.08em] ${
                          trade.side === 'yes' ? 'text-accent' : 'text-ink-soft'
                        }`}
                      >
                        {trade.side}
                      </td>
                      <td className="py-4 pr-4 text-right text-sm">
                        {Number(trade.shares).toFixed(0)}
                      </td>
                      <td className="py-4 pr-4 text-right text-sm">
                        {Number(trade.cost).toFixed(2)}
                      </td>
                      <td className="py-4 text-right text-xs text-ink-faint">
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
          )}
        </section>
      </main>
    </>
  )
}
