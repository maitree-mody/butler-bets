import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Crown, Home as HomeIcon, BarChart3, Bell, Trophy, User, Users,
  Search, TrendingUp, BookOpen, ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { priceYes } from '@/lib/lmsr'
import { isoTimestampHoursAgo } from '@/lib/time'
import { displayNameFromEmail } from '@/lib/display-name'
import { rankUsers } from '@/lib/ranking'
import { HERO_LINE_1, HERO_LINE_2 } from '@/lib/copy'
import Nav from '@/app/components/Nav'
import MarketCard, { Sparkline } from '@/app/components/MarketCard'

/* ── Types ──────────────────────────────────────────────────── */
type MarketView = 'all' | 'open' | 'resolved' | 'active'

const marketViews: Array<{ value: MarketView; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'active', label: 'Active · 24h' },
]

/* ── Page (server component) ─────────────────────────────── */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>
}) {
  const { view } = (await searchParams) ?? {}
  const requestedView = Array.isArray(view) ? view[0] : view
  const currentView: MarketView = marketViews.some((o) => o.value === requestedView)
    ? (requestedView as MarketView)
    : 'all'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userProfile } = await supabase
    .from('users')
    .select('display_name, crowns')
    .eq('id', user.id)
    .single()
  if (!userProfile?.display_name) redirect('/onboarding')

  const oneDayAgo = isoTimestampHoursAgo(24)
  const [marketsResult, recentTradesResult, positionsResult, usersCountResult, liveActivityResult] = await Promise.all([
    supabase
      .from('markets')
      .select('id, question, closes_at, status, b, q_yes, q_no')
      .order('created_at', { ascending: false }),
    supabase.from('trades').select('market_id').gte('created_at', oneDayAgo),
    supabase.from('positions').select('market_id').eq('user_id', user.id),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    // Mirrors ActivityTicker's exact select shape — a one-shot server-rendered
    // sample rather than the ticker's client-side polling marquee.
    supabase
      .from('trades')
      .select('id, side, type, shares, users(email, display_name), markets(question)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const { data: markets, error } = marketsResult
  const recentTradeCounts = new Map<string, number>()
  for (const trade of recentTradesResult.data ?? []) {
    recentTradeCounts.set(trade.market_id, (recentTradeCounts.get(trade.market_id) ?? 0) + 1)
  }

  const openMarkets = markets?.filter((m) => m.status === 'open') ?? []
  const marketCounts: Record<MarketView, number> = {
    all: markets?.length ?? 0,
    open: openMarkets.length,
    resolved: markets?.filter((m) => m.status === 'resolved').length ?? 0,
    active: markets?.filter((m) => recentTradeCounts.has(m.id)).length ?? 0,
  }
  const filteredMarkets = (markets ?? []).filter((m) => {
    if (currentView === 'open') return m.status === 'open'
    if (currentView === 'resolved') return m.status === 'resolved'
    if (currentView === 'active') return recentTradeCounts.has(m.id)
    return true
  })
  if (currentView === 'all') {
    filteredMarkets.sort((a, b) => {
      const p = (s: string) => s === 'open' ? 0 : s === 'resolved' ? 1 : 2
      return p(a.status) - p(b.status)
    })
  }

  const crowns = Number(userProfile?.crowns ?? 0)
  const marketsTraded = positionsResult.data?.length ?? 0
  const totalStudents = usersCountResult.count ?? 0

  // Rank — mirrors /leaderboard's exact two-step query (trade counts, then
  // only the users who've ever traded) via the shared rankUsers() helper.
  const { data: tradeRows } = await supabase.from('trades').select('user_id')
  const tradeCounts = new Map<string, number>()
  for (const row of tradeRows ?? []) {
    tradeCounts.set(row.user_id, (tradeCounts.get(row.user_id) ?? 0) + 1)
  }
  const traderIds = [...tradeCounts.keys()]
  const { data: rankableUsers } =
    traderIds.length === 0
      ? { data: [] as { id: string; email: string | null; crowns: number; display_name: string | null }[] }
      : await supabase.from('users').select('id, email, crowns, display_name').in('id', traderIds)
  const rankedUsers = rankUsers(rankableUsers ?? [], tradeCounts)
  const myRank = rankedUsers.findIndex((entry) => entry.id === user.id) + 1
  const rankLabel = myRank > 0 ? `#${myRank} / ${rankedUsers.length}` : 'Unranked'

  const featuredMarket = openMarkets[0] ?? null
  const featuredYesPct = featuredMarket
    ? Math.round(priceYes(Number(featuredMarket.q_yes), Number(featuredMarket.q_no), Number(featuredMarket.b)) * 100)
    : 62

  type LiveActivityRow = {
    id: string
    side: 'yes' | 'no'
    type: 'buy' | 'sell'
    shares: number
    users: { email: string | null; display_name: string | null } | Array<{ email: string | null; display_name: string | null }> | null
    markets: { question: string } | Array<{ question: string }> | null
  }
  function firstOf<T>(v: T | T[] | null): T | null {
    if (v === null) return null
    return Array.isArray(v) ? v[0] ?? null : v
  }
  const liveActivity = ((liveActivityResult.data ?? []) as unknown as LiveActivityRow[]).map((row) => {
    const u = firstOf(row.users)
    const m = firstOf(row.markets)
    return {
      id: row.id,
      name: u?.display_name ?? displayNameFromEmail(u?.email),
      verb: row.type === 'sell' ? 'sold' : 'bought',
      shares: Math.round(Number(row.shares)),
      side: row.side,
      question: m?.question ?? 'a market',
    }
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav email={user.email ?? ''} />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Low Library watermark — same background used on the login page */}
        <div
          className="pointer-events-none absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: 'url(/low-library.png)',
            backgroundSize: '100% 143%',
            backgroundPosition: '50% -60px',
            opacity: 0.4,
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-columbia-soft/60 to-transparent" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-36 pt-24 lg:grid-cols-2">

          {/* Left: copy */}
          <div className="relative">
            <h1 className="relative font-display text-4xl leading-[1.05] tracking-tight text-columbia-deep sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
              {HERO_LINE_1}<br />
              <em className="italic text-columbia" style={{ fontFamily: 'var(--font-display)' }}>{HERO_LINE_2}</em>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Campus-powered prediction markets for Columbia students. Built on research, driven by insight.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#markets"
                className="pressable inline-flex items-center gap-2 rounded-md bg-columbia px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-columbia-deep"
              >
                Explore Markets <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/markets/new"
                className="pressable inline-flex items-center rounded-md border border-columbia px-5 py-3 text-sm font-medium text-columbia hover:bg-columbia-soft"
              >
                Get Started
              </Link>
            </div>
            {totalStudents > 0 && (
              <div className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-background"
                      style={{
                        background: `linear-gradient(135deg, oklch(0.7 0.1 ${200 + i * 30}), oklch(0.5 0.15 ${220 + i * 30}))`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Join <span className="font-semibold text-foreground">{totalStudents.toLocaleString()}+</span> students trading their forecasts
                </p>
              </div>
            )}
          </div>

          {/* Right: dashboard preview */}
          <DashboardMock
            crowns={crowns}
            marketsTraded={marketsTraded}
            rankLabel={rankLabel}
            featuredMarket={featuredMarket}
            featuredYesPct={featuredYesPct}
          />
        </div>
      </section>

      {/* ── FEATURED MARKETS ─────────────────────────────── */}
      <section id="markets" className="mx-auto max-w-7xl px-6 pb-16 pt-16">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-bold text-columbia-deep">Live Markets</h2>
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5">
              {marketViews.map((option) => {
                const selected = option.value === currentView
                return (
                  <Link
                    key={option.value}
                    href={option.value === 'all' ? '/' : `/?view=${option.value}`}
                    aria-current={selected ? 'page' : undefined}
                    className={`pressable rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                      selected
                        ? 'bg-columbia text-primary-foreground shadow-sm'
                        : 'border border-border bg-card text-muted-foreground hover:border-columbia hover:text-columbia'
                    }`}
                  >
                    {option.label}
                    <span className="ml-1 opacity-60">{marketCounts[option.value]}</span>
                  </Link>
                )
              })}
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-columbia hover:text-columbia-deep"
            >
              View all markets <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            Failed to load markets: {error.message}
          </div>
        ) : filteredMarkets.length > 0 ? (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredMarkets.map((market) => (
              <li key={market.id}>
                <MarketCard market={market} recentTrades={recentTradeCounts.get(market.id) ?? 0} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 rounded-2xl border border-border bg-card py-20 text-center">
            <p className="font-display text-2xl font-semibold text-columbia-deep">
              No {currentView === 'all' ? '' : `${currentView} `}markets yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {currentView === 'active'
                ? 'Activity appears after a trade.'
                : 'Try another filter or open a new market.'}
            </p>
            {currentView !== 'all' && (
              <Link href="/" className="mt-5 inline-block text-sm font-semibold text-columbia underline underline-offset-4">
                View all markets →
              </Link>
            )}
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS / ALMA MATER / LIVE ACTIVITY ────── */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-6 lg:grid-cols-3">
          <HowItWorks />
          <AlmaMater />
          <LiveActivity items={liveActivity} />
        </div>
      </section>

      {/* ── READY CTA ────────────────────────────────────── */}
      <ReadyCTA />

      {/* ── FOOTER ───────────────────────────────────────── */}
      <Footer />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PRESENTATIONAL COMPONENTS  (ported 1:1 from Lovable)
══════════════════════════════════════════════════════════════ */

function DashboardMock({
  crowns,
  marketsTraded,
  rankLabel,
  featuredMarket,
  featuredYesPct,
}: {
  crowns: number
  marketsTraded: number
  rankLabel: string
  featuredMarket: { id: string; question: string } | null
  featuredYesPct: number
}) {
  const noPct = 100 - featuredYesPct
  const buyingPower = Math.floor(crowns * 0.28)

  const stats = [
    { l: 'Portfolio Value', v: `♛${crowns.toLocaleString()}` },
    { l: 'Buying Power',    v: `♛${buyingPower.toLocaleString()}` },
    { l: 'Markets Traded',  v: String(marketsTraded) },
    { l: 'Rank',            v: rankLabel },
  ]

  // Every link here routes to a real page or in-page anchor — no dead icons.
  const sidebarLinks = [
    { Icon: HomeIcon,  label: 'Home',          href: '/' },
    { Icon: BarChart3, label: 'Markets',       href: '#markets' },
    { Icon: Bell,      label: 'Notifications', href: '/notifications' },
    { Icon: Trophy,    label: 'Leaderboard',   href: '/leaderboard' },
  ]

  return (
    <div className="flex overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-columbia/10">
      {/* Blue sidebar */}
      <aside className="flex w-14 flex-col items-center gap-5 bg-columbia py-5 text-primary-foreground/80">
        {sidebarLinks.map(({ Icon, label, href }, i) => (
          <Link
            key={label}
            href={href}
            aria-label={label}
            className={`grid h-9 w-9 place-items-center rounded-md ${
              i === 0 ? 'bg-white/15 text-white' : 'hover:bg-white/10'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} />
          </Link>
        ))}
        <div className="flex-1" />
        <Link href="/profile" aria-label="Profile" className="hover:opacity-100 opacity-70">
          <User className="h-4 w-4" strokeWidth={1.8} />
        </Link>
      </aside>

      {/* Main white area */}
      <div className="min-w-0 flex-1 p-6">
      <h3 className="font-display text-lg font-semibold text-columbia-deep">Market Overview</h3>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.l} className="rounded-lg bg-columbia-soft/60 p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.l}</div>
            <div className="mt-1 text-sm font-semibold text-columbia-deep">{s.v}</div>
          </div>
        ))}
      </div>

      {/* Featured market */}
      <div className="mt-4 rounded-lg border border-border p-4">
        {featuredMarket ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2">
                  {featuredMarket.question}
                </p>
                <div className="mt-3 font-display text-4xl font-bold text-columbia">
                  {featuredYesPct}%
                </div>
                <div className="text-xs text-muted-foreground">Yes</div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <PillBox label="Yes" value={`${featuredYesPct}¢`} tone="yes" />
                <PillBox label="No"  value={`${noPct}¢`}          tone="no"  />
              </div>
            </div>
            <Sparkline color="var(--columbia)" trend="up" />
            <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
              <span>Apr 18</span><span>May 2</span><span>May 16</span><span>May 30</span><span>Jun 13</span>
            </div>
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">No open markets yet.</p>
            <Link href="/markets/new" className="mt-2 inline-block text-sm font-semibold text-columbia hover:underline">
              Create the first →
            </Link>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

function PillBox({ label, value, tone }: { label: string; value: string; tone: 'yes' | 'no' }) {
  const cls =
    tone === 'yes'
      ? 'text-columbia border-columbia/30 bg-columbia-soft'
      : 'text-danger border-danger/30 bg-danger/5'
  return (
    <div className={`rounded-md border px-4 py-2 text-center ${cls}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="font-display text-lg font-bold">{value}</div>
    </div>
  )
}


function HowItWorks() {
  const steps = [
    { Icon: Search,     t: 'Discover markets',  d: 'Explore questions across campus, finance, politics, and sports.' },
    { Icon: TrendingUp, t: 'Trade forecasts',   d: 'Buy Yes or No shares between ♛0.01 and ♛0.99.' },
    { Icon: Trophy,     t: 'Track outcomes',    d: 'Winning shares pay ♛1.00. Climb the leaderboard.' },
  ]
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-columbia-deep">How it works</h2>
        <a href="#markets" className="text-xs font-semibold text-columbia hover:text-columbia-deep">Learn more →</a>
      </div>
      <div className="space-y-4">
        {steps.map((s) => (
          <div key={s.t} className="flex gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-columbia-soft">
              <s.Icon className="h-4 w-4 text-columbia" strokeWidth={1.6} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{s.t}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlmaMater() {
  const values = [
    { Icon: BookOpen, t: 'Inquiry',   d: 'Curious minds ask better questions.' },
    { Icon: Crown,    t: 'Integrity', d: 'Transparent markets. Fair outcomes.' },
    { Icon: Users,    t: 'Community', d: 'Built by students, for students.' },
  ]
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/alma-mater.png"
        alt="Alma Mater statue"
        className="mx-auto h-24 w-auto opacity-90"
        loading="lazy"
      />
      <h3 className="mt-3 text-center font-display text-lg font-bold text-columbia-deep">Built at Butler. Tested at Amity.</h3>
      <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
        We believe in the pursuit of truth, the power of ideas, and the Columbia spirit of inquiry.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {values.map((v) => (
          <div key={v.t} className="text-center">
            <v.Icon className="mx-auto h-4 w-4 text-columbia" strokeWidth={1.6} />
            <div className="mt-1.5 text-xs font-semibold text-columbia-deep">{v.t}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LiveActivity({
  items,
}: {
  items: Array<{ id: string; name: string; verb: string; shares: number; side: 'yes' | 'no'; question: string }>
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 font-display text-lg font-bold text-columbia-deep">Live activity</h2>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const truncated = item.question.length > 40 ? item.question.slice(0, 40).trimEnd() + '…' : item.question
            return (
              <li key={item.id} className="flex items-start gap-2 text-xs">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${item.side === 'yes' ? 'bg-columbia' : 'bg-danger'}`} />
                <p className="leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">@{item.name}</span>{' '}
                  {item.verb} {item.shares}{' '}
                  <span className={`font-bold uppercase ${item.side === 'yes' ? 'text-columbia' : 'text-danger'}`}>{item.side}</span>{' '}
                  on &ldquo;{truncated}&rdquo;
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ReadyCTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-columbia/20 bg-columbia-soft/60 px-6 py-5">
        <div className="flex items-center gap-3">
          <Crown className="h-6 w-6 shrink-0 text-columbia" strokeWidth={1.6} />
          <div>
            <h3 className="font-display text-lg font-bold text-columbia-deep">
              Ready to shape what&apos;s next?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Join thousands of Columbia students turning information into insight.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/markets/new"
            className="pressable rounded-md bg-columbia px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-columbia-deep"
          >
            Get Started
          </Link>
          <a
            href="#markets"
            className="pressable rounded-md border border-columbia bg-background px-5 py-2.5 text-sm font-medium text-columbia hover:bg-columbia-soft"
          >
            Explore Markets
          </a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-columbia-deep" strokeWidth={1.5} />
          <div>
            <div className="font-display font-bold text-columbia-deep">butler bets</div>
            <div className="text-xs text-muted-foreground">Campus prediction markets, powered by Columbia.</div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-muted-foreground">
          <span>© 2026 butler bets</span>
          <Link href="/leaderboard" className="hover:text-columbia">Leaderboard</Link>
          <Link href="/profile"     className="hover:text-columbia">Profile</Link>
        </div>
      </div>
    </footer>
  )
}
