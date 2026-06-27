import { signInWithGoogle } from '@/app/actions/auth'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="min-h-screen bg-canvas">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_28rem]">
        <section className="flex flex-col justify-between border-b p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-14">
          <div>
            <p className="font-display text-2xl font-medium tracking-[-0.04em]">butler bets<span className="text-accent">.</span></p>
            <p className="eyebrow mt-2">Columbia&apos;s prediction exchange</p>
          </div>

          <div className="my-16 max-w-3xl lg:my-0">
            <p className="eyebrow mb-5">Price your conviction</p>
            <h1 className="display-title">Campus has opinions. Give them a market.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-ink-soft sm:text-lg">
              Trade play-money contracts on the questions Columbia is already debating. No capital. Real stakes for your reputation.
            </p>
          </div>

          <p className="font-numeric text-xs text-ink-faint">YES / NO · LMSR PRICING · 1,000 STARTING CROWNS</p>
        </section>

        <section className="flex items-center p-6 sm:p-10 lg:p-12" aria-labelledby="sign-in-title">
          <div className="w-full border-y border-line-strong py-8">
            <p className="eyebrow">Member access</p>
            <h2 id="sign-in-title" className="font-display mt-3 text-3xl font-medium tracking-[-0.035em]">Enter the exchange</h2>
            <p className="mt-3 text-sm leading-6 text-ink-soft">Use your Columbia or Barnard Google account.</p>

            {error && <p className="mt-6 border-l-2 border-danger bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">{error}</p>}

            <form action={signInWithGoogle} className="mt-7">
              <button
                type="submit"
                className="flex min-h-12 w-full items-center justify-between bg-ink px-4 text-sm font-bold text-white transition-colors hover:bg-accent"
              >
                <span className="flex items-center gap-3">
                  <svg className="h-4 w-4 shrink-0 text-white" viewBox="0 0 24 24" aria-hidden="true">
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
            <p className="mt-4 text-xs leading-5 text-ink-faint">Access is limited to verified Columbia and Barnard email domains.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
