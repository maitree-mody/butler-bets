import { Crown } from 'lucide-react'
import { signInWithGoogle } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'

async function getSocialProof() {
  try {
    const supabase = await createClient()
    const [usersRes, marketsRes] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('markets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ])
    return {
      traders: usersRes.count ?? 0,
      openMarkets: marketsRes.count ?? 0,
    }
  } catch {
    return { traders: 0, openMarkets: 0 }
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const { traders, openMarkets } = await getSocialProof()

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">

      {/* Background — shifted up so columns fill center, steps area behind card */}
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

      {/* Content shifted down so card sits over the steps, not the statue */}
      <div className="relative z-10 w-full max-w-sm translate-y-16">

        {/* Standalone wordmark above card */}
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <Crown className="h-6 w-6 shrink-0 text-columbia-deep" strokeWidth={2} />
          <span className="font-display text-3xl font-bold tracking-tight text-columbia-deep">
            butler bets
          </span>
        </div>

        {/* Login card — solid white, floating shadow */}
        <div className="rounded-2xl border border-border bg-white p-8 shadow-xl">
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0a0a0a]">
            Join the market
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Trade play-money contracts on campus events. Sign in with your Columbia or Barnard account.
          </p>

          {error && (
            <p className="mt-5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <form action={signInWithGoogle} className="mt-6">
            <button
              type="submit"
              className="pressable flex w-full items-center justify-between rounded-lg bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-85"
            >
              <span className="flex items-center gap-3">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" opacity=".8" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor" opacity=".6" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" opacity=".9" />
                </svg>
                Continue with Google
              </span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="mt-4 text-xs text-muted-foreground">
            Limited to verified Columbia and Barnard email domains.
          </p>
        </div>

        {/* Social proof */}
        {(traders > 0 || openMarkets > 0) && (
          <p className="mt-5 text-center text-xs text-muted-foreground">
            {traders > 0 && <span>{traders} student{traders !== 1 ? 's' : ''} trading</span>}
            {traders > 0 && openMarkets > 0 && <span className="mx-2 opacity-40">·</span>}
            {openMarkets > 0 && <span>{openMarkets} market{openMarkets !== 1 ? 's' : ''} open</span>}
          </p>
        )}
      </div>
    </main>
  )
}
