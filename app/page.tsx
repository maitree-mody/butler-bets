import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Crown, Home as HomeIcon, BarChart3, Megaphone, Trophy, Settings, Users,
  Search, TrendingUp, BookOpen, ArrowRight, Snowflake, Landmark, Volleyball,
  Building2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { priceYes } from '@/lib/lmsr'
import { isoTimestampHoursAgo } from '@/lib/time'
import Nav from '@/app/components/Nav'

/* ── Types ──────────────────────────────────────────────────── */
type MarketView = 'all' | 'open' | 'resolved' | 'active'

const marketViews: Array<{ value: MarketView; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'active', label: 'Active · 24h' },
]

type CategoryMeta = {
  label: string
  color: string         // Tailwind text class
  sparkColor: string    // CSS colour value
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>
}

function inferCategory(question: string): CategoryMeta {
  const q = question.toLowerCase()
  if (/snow|campus|student|columbia|cu|class|finals|dining|greek|housing|dorm|club|event/.test(q))
    return { label: 'CAMPUS', color: 'text-columbia', sparkColor: 'var(--columbia)', Icon: Snowflake }
  if (/fed|rate|inflation|stock|gdp|economy|dollar|bank|market|nasdaq|crypto|bitcoin|invest/.test(q))
    return { label: 'FINANCE', color: 'text-finance', sparkColor: 'var(--finance)', Icon: Landmark }
  if (/game|win|score|champion|playoff|nfl|nba|mlb|nhl|team|match|sport|league|lions/.test(q))
    return { label: 'SPORTS', color: 'text-columbia', sparkColor: 'var(--columbia)', Icon: Volleyball }
  if (/elect|vote|president|congress|senate|bill|law|policy|nyc|mayor|governor|democrat|republican|rent/.test(q))
    return { label: 'POLITICS', color: 'text-politics', sparkColor: 'var(--politics)', Icon: Building2 }
  return { label: 'MARKET', color: 'text-columbia', sparkColor: 'var(--columbia)', Icon: BarChart3 }
}

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
  const [marketsResult, recentTradesResult, positionsResult, usersCountResult] = await Promise.all([
    supabase
      .from('markets')
      .select('id, question, closes_at, status, b, q_yes, q_no')
      .order('created_at', { ascending: false }),
    supabase.from('trades').select('market_id').gte('created_at', oneDayAgo),
    supabase.from('positions').select('market_id').eq('user_id', user.id),
    supabase.from('users').select('*', { count: 'exact', head: true }),
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

  const featuredMarket = openMarkets[0] ?? null
  const featuredYesPct = featuredMarket
    ? Math.round(priceYes(Number(featuredMarket.q_yes), Number(featuredMarket.q_no), Number(featuredMarket.b)) * 100)
    : 62

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav email={user.email ?? ''} />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-columbia-soft/60 to-transparent" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 pb-20 pt-8 lg:grid-cols-2">

          {/* Left: copy */}
          <div className="relative">
            {/* Alma Mater watermark */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/alma-mater.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute -right-10 top-0 hidden h-[520px] w-auto object-contain opacity-25 lg:block"
            />

            <h1 className="relative font-display text-4xl leading-[1.05] tracking-tight text-columbia-deep sm:text-5xl md:text-6xl lg:text-7xl">
              Trade what<br />
              Columbia thinks<br />
              <em className="italic" style={{ fontFamily: 'var(--font-display)' }}>next.</em>
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
            openMarketsCount={openMarkets.length}
            featuredMarket={featuredMarket}
            featuredYesPct={featuredYesPct}
          />
        </div>
      </section>

      {/* ── FEATURED MARKETS ─────────────────────────────── */}
      <section id="markets" className="mx-auto max-w-7xl px-6 py-16">
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
            {filteredMarkets.map((market) => {
              const yesProb = priceYes(Number(market.q_yes), Number(market.q_no), Number(market.b))
              const yesPct = Math.round(yesProb * 100)
              const noPct = 100 - yesPct
              const recentTrades = recentTradeCounts.get(market.id) ?? 0
              const isOpen = market.status === 'open'
              const cat = inferCategory(market.question)
              const tradesLabel = recentTrades >= 1000
                ? `${(recentTrades / 1000).toFixed(1)}K`
                : String(recentTrades)

              return (
                <li key={market.id}>
                  <Link
                    href={`/markets/${market.id}`}
                    className="market-card flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    {/* Top: icon + category */}
                    <div className="flex items-start justify-between">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-columbia-soft">
                        <cat.Icon
                          className="h-5 w-5"
                          style={{ color: cat.sparkColor }}
                          strokeWidth={1.8}
                        />
                      </div>
                      <span className={`text-[10px] font-semibold tracking-wider ${cat.color}`}>
                        {cat.label}
                      </span>
                    </div>

                    {/* Question */}
                    <p className="mt-4 min-h-12 text-sm font-medium leading-snug text-foreground">
                      {market.question}
                    </p>

                    {/* YES % + inline prices */}
                    <div className="mt-3">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className="font-display text-3xl font-bold"
                          style={{ color: cat.sparkColor }}
                        >
                          {yesPct}%
                        </span>
                        <span className="text-xs text-muted-foreground">chance</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Yes <span className="font-semibold text-columbia">{yesPct}¢</span>
                        {' · '}
                        No <span className="font-semibold text-danger">{noPct}¢</span>
                      </p>
                    </div>

                    {/* Probability bar */}
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-danger/10">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${yesPct}%`, backgroundColor: cat.sparkColor }}
                      />
                    </div>

                    {/* Footer */}
                    <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                      <span>{isOpen ? 'Open' : 'Resolved'}</span>
                      {recentTrades > 0 && (
                        <span className="text-success">{tradesLabel} trades today</span>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
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

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <HowItWorks />

      {/* ── ALMA MATER ───────────────────────────────────── */}
      <AlmaMater />

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
  openMarketsCount,
  featuredMarket,
  featuredYesPct,
}: {
  crowns: number
  marketsTraded: number
  openMarketsCount: number
  featuredMarket: { id: string; question: string } | null
  featuredYesPct: number
}) {
  const noPct = 100 - featuredYesPct
  const buyingPower = Math.floor(crowns * 0.28)

  const stats = [
    { l: 'Portfolio Value', v: `♛${crowns.toLocaleString()}`, sub: '▲ 4.32%' },
    { l: 'Buying Power',    v: `♛${buyingPower.toLocaleString()}` },
    { l: 'Markets Traded',  v: String(marketsTraded) },
    { l: 'Rank',            v: 'Top 12%' },
  ]

  const sidebarLinks = [
    { Icon: HomeIcon,  label: 'Home',         href: '/' },
    { Icon: BarChart3, label: 'Charts',        href: '#markets' },
    { Icon: Megaphone, label: 'Announcements', href: '/notifications' },
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
              i === 1 ? 'bg-white/15 text-white' : 'hover:bg-white/10'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} />
          </Link>
        ))}
        <div className="flex-1" />
        <Link href="/profile" aria-label="Profile" className="hover:opacity-100 opacity-70">
          <Settings className="h-4 w-4" strokeWidth={1.8} />
        </Link>
      </aside>

      {/* Main white area */}
      <div className="min-w-0 flex-1 p-5">
        <h3 className="font-display text-lg font-semibold text-columbia-deep">Market Overview</h3>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.l} className="rounded-lg bg-columbia-soft/60 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.l}</div>
              <div className="mt-1 text-sm font-semibold text-columbia-deep">{s.v}</div>
              {s.sub && <div className="text-[10px] text-success">{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* Featured market */}
        <div className="mt-5 rounded-lg border border-border p-4">
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
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
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

function Sparkline({
  color = 'var(--columbia)',
  trend = 'up',
}: {
  color?: string
  trend?: 'up' | 'down'
}) {
  const up   = 'M0,40 L10,38 L20,35 L30,36 L40,30 L50,28 L60,25 L70,22 L80,18 L90,15 L100,12'
  const down = 'M0,15 L10,18 L20,16 L30,22 L40,20 L50,24 L60,26 L70,28 L80,32 L90,30 L100,34'
  const d = trend === 'up' ? up : down
  return (
    <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="mt-3 h-16 w-full">
      <path d={`${d} L100,50 L0,50 Z`} fill={color} opacity="0.08" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.2" />
    </svg>
  )
}

function HowItWorks() {
  const steps = [
    { Icon: Search,     t: 'Discover markets',  d: 'Explore questions across campus, finance, politics, and sports. Dive into data, analysis, and student research.' },
    { Icon: TrendingUp, t: 'Trade forecasts',   d: 'Buy Yes or No shares between ♛0.01 and ♛0.99. Prices reflect the crowd\'s consensus in real time.' },
    { Icon: Trophy,     t: 'Track outcomes',    d: 'When outcomes resolve, winning shares pay ♛1.00. Build your track record and climb the leaderboard.' },
  ]
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="text-center font-display text-3xl font-bold text-columbia-deep">How it works</h2>
      <div className="mt-12 grid gap-10 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.t} className="flex gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-columbia-soft">
              <s.Icon className="h-6 w-6 text-columbia" strokeWidth={1.6} />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-xl font-bold text-columbia-deep">{i + 1}</span>
                <h3 className="text-base font-semibold text-foreground">{s.t}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function AlmaMater() {
  const values = [
    { Icon: BookOpen, t: 'Inquiry',   d: 'Curious minds ask better questions.' },
    { Icon: Crown,    t: 'Integrity', d: 'Transparent markets. Fair outcomes.' },
    { Icon: Users,    t: 'Community', d: 'Built by students, for students.' },
  ]
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid items-center gap-8 rounded-2xl border border-border bg-card p-8 md:grid-cols-[200px_1fr_auto]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/alma-mater.png"
          alt="Alma Mater statue"
          className="mx-auto h-44 w-auto opacity-90"
          loading="lazy"
        />
        <div>
          <h3 className="font-display text-2xl font-bold text-columbia-deep">Inspired by Alma Mater.</h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            We believe in the pursuit of truth, the power of ideas, and the Columbia spirit of inquiry.
            butler bets empowers students to turn insight into impact.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-8 md:gap-10">
          {values.map((v) => (
            <div key={v.t} className="text-center">
              <v.Icon className="mx-auto h-6 w-6 text-columbia" strokeWidth={1.6} />
              <div className="mt-3 text-sm font-semibold text-columbia-deep">{v.t}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{v.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ReadyCTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-columbia/20 bg-columbia-soft/60 px-8 py-8">
        <div>
          <h3 className="font-display text-2xl font-bold text-columbia-deep">
            Ready to shape what&apos;s next?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Join thousands of Columbia students turning information into insight.
          </p>
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
          <span>© 2025 butler bets</span>
          <Link href="/leaderboard" className="hover:text-columbia">Leaderboard</Link>
          <Link href="/profile"     className="hover:text-columbia">Profile</Link>
        </div>
      </div>
    </footer>
  )
}
