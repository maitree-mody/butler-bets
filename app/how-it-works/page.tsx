import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Crown, Wallet, HelpCircle, ShoppingCart, TrendingUp, Coins,
  ArrowRight, Trophy, CheckCircle2, ListChecks, RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/app/components/Nav'
import Card from '@/app/components/ui/Card'
import HowItWorksAnimated from '@/app/components/HowItWorksAnimated'

const BASICS = [
  {
    Icon: Wallet,
    t: 'Start with 1,000 Crowns',
    d: 'Every student starts with 1,000 Crowns — play money, never real money.',
  },
  {
    Icon: HelpCircle,
    t: 'Markets are yes/no questions',
    d: 'Each market asks something about campus life — will it snow, will the game go into overtime, you name it.',
  },
  {
    Icon: ShoppingCart,
    t: 'Buy YES or NO shares',
    d: 'Think it\'ll happen? Buy YES. Think it won\'t? Buy NO.',
  },
  {
    Icon: TrendingUp,
    t: 'Price = the crowd\'s odds',
    d: 'A share priced at 60¢ means the crowd thinks it\'s about 60% likely to happen.',
  },
  {
    Icon: Coins,
    t: 'Winning shares pay 1 Crown',
    d: 'Right when it resolves? Each winning share pays out 1 Crown. Wrong, and it\'s worth 0 — so buying low and being right means profit.',
  },
  {
    Icon: RefreshCw,
    t: 'Sell anytime',
    d: 'Change your mind? Sell your shares before the market closes to lock in gains or cut your losses.',
  },
]

const STEPS = [
  { n: 1, t: 'Pick a market' },
  { n: 2, t: 'Choose YES or NO' },
  { n: 3, t: 'Enter your shares' },
  { n: 4, t: 'Review cost & payout' },
  { n: 5, t: 'Hit Buy' },
]

const FAQS = [
  {
    q: 'Do I need someone to sell to me?',
    a: 'Nope — the system always trades with you instantly. No waiting around for a match.',
  },
  {
    q: 'Can I lose all my Crowns?',
    a: 'You can lose what you put into a market, but it\'s play money, so there\'s no real-world loss. You can always keep playing.',
  },
  {
    q: 'Who decides the outcome?',
    a: 'An admin resolves each market based on what actually happened.',
  },
  {
    q: 'Is this real gambling?',
    a: 'No — it\'s 100% play money, just for fun and bragging rights.',
  },
]

export default async function HowItWorksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <Nav email={user.email ?? ''} />
      <HowItWorksAnimated />
      <main className="page-shell space-y-12 py-8 sm:space-y-16 sm:py-10">

        {/* Intro / about */}
        <header className="reveal mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-columbia-soft">
            <Crown className="h-6 w-6 text-columbia" strokeWidth={1.75} />
          </div>
          <p className="eyebrow mb-2">Welcome to ButlerBets</p>
          <h1 className="page-title">How ButlerBets works</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            ButlerBets is a play-money prediction market for Columbia and Barnard students.
            Bet fake currency (Crowns) on campus events — from &ldquo;will it snow&rdquo; to
            inside jokes about people you know. It&apos;s all for fun, bragging rights, and
            seeing who can predict campus life best. No real money, ever.
          </p>
        </header>

        {/* How it works (the basics) */}
        <section className="reveal reveal-delay-1" aria-labelledby="basics-title">
          <div className="mb-6 text-center">
            <p className="eyebrow mb-2">The basics</p>
            <h2 className="font-display text-2xl font-bold text-columbia-deep">How it works</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BASICS.map((b) => (
              <Card key={b.t} padding="md">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-columbia-soft">
                  <b.Icon className="h-4 w-4 text-columbia" strokeWidth={1.6} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{b.t}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{b.d}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* How to place your first bet */}
        <section className="reveal reveal-delay-1" aria-labelledby="first-bet-title">
          <div className="mb-6 text-center">
            <p className="eyebrow mb-2">Your first trade</p>
            <h2 id="first-bet-title" className="font-display text-2xl font-bold text-columbia-deep">
              How to place your first bet
            </h2>
          </div>
          <Card padding="lg">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-5 sm:gap-2">
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex items-center gap-3 sm:flex-col sm:gap-2 sm:text-center">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-columbia text-sm font-bold text-primary-foreground">
                    {s.n}
                  </span>
                  <span className="text-sm font-semibold text-foreground sm:mt-1">{s.t}</span>
                  {i < STEPS.length - 1 && (
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-auto hidden h-4 w-4 shrink-0 text-columbia/40 sm:ml-0 sm:mt-0.5 sm:block"
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2} />
              Done — you&apos;re officially trading.
            </p>
          </Card>
        </section>

        {/* A few things to know */}
        <section className="reveal reveal-delay-1" aria-labelledby="faq-title">
          <div className="mb-6 text-center">
            <p className="eyebrow mb-2">Good to know</p>
            <h2 id="faq-title" className="font-display text-2xl font-bold text-columbia-deep">
              A few things to know
            </h2>
          </div>
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
            {FAQS.map((f) => (
              <Card key={f.q} padding="md">
                <div className="flex gap-2.5">
                  <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-columbia" strokeWidth={1.75} />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{f.q}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Climb the leaderboard / CTA */}
        <section className="reveal reveal-delay-2">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-2xl border border-columbia/20 bg-columbia-soft/60 px-6 py-8 text-center">
            <Trophy className="h-8 w-8 shrink-0 text-columbia" strokeWidth={1.6} />
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Your profit is tracked automatically — the best predictors rise to the top of
              the leaderboard.
            </p>
            <Link
              href="/"
              className="pressable rounded-md bg-columbia px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-columbia-deep"
            >
              Start trading →
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
