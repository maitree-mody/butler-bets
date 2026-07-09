import { redirect } from 'next/navigation'
import { Wallet, TrendingUp, ArrowLeftRight, Building2, Target, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/app/components/Nav'
import Card from '@/app/components/ui/Card'
import Badge from '@/app/components/ui/Badge'
import IconStat from '@/app/components/ui/IconStat'
import { priceYes } from '@/lib/lmsr'
import { inferCategory } from '@/lib/category'
import { displayNameFromEmail } from '@/lib/display-name'
import { formatCrowns, formatCrownsSigned } from '@/lib/format-crowns'
import EditDisplayNameToggle from './EditDisplayNameToggle'

const STARTING_CROWNS = 1000

type TradeRow = {
  id: string
  market_id: string
  side: string
  type: string
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
        .select('id, market_id, side, type, shares, cost, created_at, markets(question)')
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
  const returnPct = (profit / STARTING_CROWNS) * 100
  const totalTrades = trades.length
  const distinctMarkets = new Set(trades.map(t => t.market_id)).size
  const openPositions = positions.filter(
    p =>
      p.markets?.status === 'open' &&
      (Number(p.yes_shares) > 0 || Number(p.no_shares) > 0),
  )
  const recentTrades = trades.slice(0, 15)

  const displayName = (profile as { display_name?: string | null } | null)?.display_name ?? null
  const resolvedName = displayName ?? displayNameFromEmail(user.email)
  const avatarInitial = resolvedName[0]?.toUpperCase() ?? '?'
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      })
    : null

  const stats = [
    { icon: Wallet, label: 'Balance', value: formatCrowns(crowns), sub: 'crowns' },
    {
      icon: TrendingUp,
      label: 'Total profit',
      value: formatCrownsSigned(profit),
      sub: 'vs. 1,000 start',
      tone: profit >= 0 ? 'success' as const : 'danger' as const,
    },
    { icon: ArrowLeftRight, label: 'Trades', value: String(totalTrades), sub: 'executed' },
    { icon: Building2, label: 'Markets', value: String(distinctMarkets), sub: 'participated in' },
    { icon: Target, label: 'Open positions', value: String(openPositions.length), sub: 'active markets' },
  ]

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="page-shell py-8 sm:py-10">

        {/* ── Account header card ─────────────────────────── */}
        <Card padding="lg" className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-columbia-soft">
                <span className="font-display text-xl font-bold text-columbia">{avatarInitial}</span>
              </div>
              <div>
                <p className="eyebrow mb-1">Your account</p>
                <p className="break-all text-sm font-medium text-foreground">{user.email}</p>
                {memberSince && (
                  <p className="mt-1 text-sm text-muted-foreground">Member since {memberSince}</p>
                )}
              </div>
            </div>
            <EditDisplayNameToggle current={displayName} />
          </div>
        </Card>

        {/* ── Stat cards ──────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map(({ icon, label, value, sub, tone }) => (
            <IconStat key={label} icon={icon} label={label} value={value} sub={sub} tone={tone} />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* ── Left: positions + activity ─────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Open positions */}
            <section aria-labelledby="positions-heading">
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
                <Card padding="lg" className="text-center">
                  <p className="text-sm text-muted-foreground">No open positions yet. Get off the Sundial and into a market.</p>
                </Card>
              ) : (
                <Card padding="none" className="overflow-hidden">
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
                          const cat = inferCategory(m.question)
                          return (
                            <tr
                              key={m.id}
                              className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                            >
                              <td className="max-w-xs py-3.5 pl-5 pr-4 text-sm font-medium text-foreground">
                                <span className="flex items-center gap-2">
                                  <cat.Icon className="h-3.5 w-3.5 shrink-0" style={{ color: cat.sparkColor }} strokeWidth={1.8} />
                                  <span className="truncate">{m.question}</span>
                                </span>
                              </td>
                              <td className="py-3.5 pr-4 text-right text-sm font-semibold text-columbia">
                                {Number(pos.yes_shares).toFixed(0)}
                              </td>
                              <td className="py-3.5 pr-4 text-right text-sm text-muted-foreground">
                                {Number(pos.no_shares).toFixed(0)}
                              </td>
                              <td className="py-3.5 pr-5 text-right text-sm font-semibold text-foreground">
                                {formatCrowns(value)} ♛
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </section>

            {/* Recent activity */}
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
                <Card padding="lg" className="text-center">
                  <p className="text-sm text-muted-foreground">
                    No trades yet. Butler ain&apos;t gonna bet on itself.
                  </p>
                </Card>
              ) : (
                <Card padding="none" className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table
                      className="font-numeric w-full min-w-[42rem]"
                      aria-label="Recent trades"
                    >
                      <thead>
                        <tr className="border-b border-border bg-muted/60">
                          <th className="py-3 pl-5 pr-4 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Market
                          </th>
                          <th className="py-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Type
                          </th>
                          <th className="py-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Side
                          </th>
                          <th className="py-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Shares
                          </th>
                          <th className="py-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Price
                          </th>
                          <th className="py-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Total
                          </th>
                          <th className="py-3 pr-5 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTrades.map(trade => {
                          const shares = Number(trade.shares)
                          const cost = Number(trade.cost)
                          const pricePerShare = shares > 0 ? Math.abs(cost) / shares : 0
                          const cat = inferCategory(trade.markets?.question ?? '')
                          return (
                            <tr
                              key={trade.id}
                              className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                            >
                              <td className="max-w-[12rem] py-3.5 pl-5 pr-4 text-sm font-medium text-foreground">
                                <span className="flex items-center gap-2">
                                  <cat.Icon className="h-3.5 w-3.5 shrink-0" style={{ color: cat.sparkColor }} strokeWidth={1.8} />
                                  <span className="truncate">{trade.markets?.question ?? 'N/A'}</span>
                                </span>
                              </td>
                              <td className="py-3.5 pr-4 text-right">
                                <Badge tone={trade.type === 'sell' ? 'muted' : 'success'}>
                                  {trade.type}
                                </Badge>
                              </td>
                              <td className="py-3.5 pr-4 text-right">
                                <Badge tone={trade.side === 'yes' ? 'columbia' : 'danger'}>
                                  {trade.side}
                                </Badge>
                              </td>
                              <td className="py-3.5 pr-4 text-right text-sm text-foreground">
                                {shares.toFixed(0)}
                              </td>
                              <td className="py-3.5 pr-4 text-right text-sm text-muted-foreground">
                                {formatCrowns(pricePerShare)}
                              </td>
                              <td className="py-3.5 pr-4 text-right text-sm text-foreground">
                                {formatCrowns(cost)}
                              </td>
                              <td className="py-3.5 pr-5 text-right text-xs text-muted-foreground">
                                {new Date(trade.created_at).toLocaleString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </section>
          </div>

          {/* ── Right: portfolio summary + community ────────── */}
          <div className="flex flex-col gap-6">
            <Card padding="lg">
              <p className="eyebrow mb-4">Portfolio summary</p>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-muted-foreground">Net profit</dt>
                  <dd className={`text-sm font-bold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCrownsSigned(profit)} ♛
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-muted-foreground">Return</dt>
                  <dd className={`text-sm font-bold ${returnPct >= 0 ? 'text-success' : 'text-danger'}`}>
                    {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <dt className="text-sm text-muted-foreground">Starting balance</dt>
                  <dd className="text-sm font-semibold text-foreground">{formatCrowns(STARTING_CROWNS)} ♛</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-muted-foreground">Current balance</dt>
                  <dd className="text-sm font-semibold text-foreground">{formatCrowns(crowns)} ♛</dd>
                </div>
              </dl>
            </Card>

            <Card padding="lg">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-columbia-soft">
                  <GraduationCap className="h-4 w-4 text-columbia" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-columbia-deep">Columbia/Barnard community</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Butler Bets is a prediction market for Columbia &amp; Barnard students.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}
