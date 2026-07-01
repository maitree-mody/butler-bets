import { Crown, Shield, Landmark, Sparkles } from 'lucide-react'
import { signInWithGoogle } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { HERO_LINE_1, HERO_LINE_2 } from '@/lib/copy'
import Alert from '@/app/components/ui/Alert'

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

const ERROR_MESSAGES: Record<string, string> = {
  invalid_domain:
    'Only Columbia and Barnard emails are allowed. Please sign in with your @columbia.edu or @barnard.edu email.',
  auth_failed: 'Sign-in failed. Please try again.',
}

const TRUST_ITEMS = [
  { Icon: Shield, label: 'Play-money markets' },
  { Icon: Landmark, label: 'Columbia & Barnard students only' },
  { Icon: Sparkles, label: 'Student-built for our community' },
]

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.') : null
  const { traders, openMarkets } = await getSocialProof()

  return (
    <main className="relative flex min-h-screen flex-col">

      {/* Thin top nav — no session yet, so this isn't the authenticated Nav */}
      <header className="relative z-10 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-columbia-deep" strokeWidth={2} />
            <span className="font-display text-lg font-bold tracking-tight text-columbia-deep">
              butler bets
            </span>
          </div>
        </div>
      </header>

      {/* Background */}
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

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Login card — solid white, floating shadow */}
          <div className="rounded-2xl border border-border bg-white p-8 shadow-xl">
            <div className="mb-4 flex justify-center">
              <Crown className="h-6 w-6 text-columbia" strokeWidth={2} />
            </div>
            <h1 className="text-center font-display text-2xl font-bold tracking-tight text-[#0a0a0a]">
              {HERO_LINE_1}{' '}
              <em className="italic text-columbia" style={{ fontFamily: 'var(--font-display)' }}>{HERO_LINE_2}</em>
            </h1>
            <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">
              Play-money prediction markets on campus events. Sign in with your Columbia or Barnard account.
            </p>

            {errorMessage && (
              <Alert tone="danger" role="alert" className="mt-5 flex items-start gap-2.5">
                <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                <span>{errorMessage}</span>
              </Alert>
            )}

            <form action={signInWithGoogle} className="mt-6">
              <button
                type="submit"
                className="pressable flex w-full items-center justify-center gap-3 rounded-lg bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-85"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
            </form>

            {/* Trust row */}
            <div className="mt-6 border-t border-border pt-5">
              <p className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                Secure
                <span className="h-px flex-1 bg-border" />
              </p>
              <div className="grid grid-cols-3 gap-3">
                {TRUST_ITEMS.map(({ Icon, label }) => (
                  <div key={label} className="text-center">
                    <Icon className="mx-auto h-4 w-4 text-columbia" strokeWidth={1.8} />
                    <p className="mt-1.5 text-[11px] leading-tight text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
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
      </div>
    </main>
  )
}
