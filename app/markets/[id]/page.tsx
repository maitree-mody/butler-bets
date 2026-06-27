import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { priceYes } from '@/lib/lmsr'
import Nav from '@/app/components/Nav'
import TradePanel from './TradePanel'
import ResolvePanel from './ResolvePanel'

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

  const [{ data: market }, { data: profile }] = await Promise.all([
    supabase
      .from('markets')
      .select('id, question, description, closes_at, status, b, q_yes, q_no, resolution, resolved_at')
      .eq('id', id)
      .single(),
    supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single(),
  ])

  if (!market) {
    return (
      <>
        <Nav email={user.email ?? ''} />
        <main className="mx-auto max-w-5xl px-8 py-16 text-center">
          <p className="text-lg text-[#71717A]">Market not found.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-[#4A86C5] underline underline-offset-2">
            Back to markets
          </Link>
        </main>
      </>
    )
  }

  const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin ?? false
  const isResolved = market.status === 'resolved'

  const yesProb = priceYes(Number(market.q_yes), Number(market.q_no), Number(market.b))
  const yesPct = Math.round(yesProb * 100)
  const noPct = 100 - yesPct
  const closeDate = new Date(market.closes_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="mx-auto max-w-5xl px-8 py-16">
        <Link href="/" className="mb-10 inline-block text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B]">
          ← Markets
        </Link>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
          {/* Left: market info */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  market.status === 'open'
                    ? 'border-[#4A86C5]/30 text-[#4A86C5]'
                    : market.status === 'closed'
                      ? 'border-amber-300 text-amber-600'
                      : 'border-[#EAE7E1] text-[#71717A]'
                }`}
              >
                {market.status}
              </span>
              <span className="text-sm text-[#71717A]">Closes {closeDate}</span>
            </div>

            <h1 className="font-display mb-6 text-5xl leading-tight text-[#18181B]">
              {market.question}
            </h1>

            {market.description && (
              <p className="mb-10 text-base leading-relaxed text-[#71717A]">{market.description}</p>
            )}

            <div className="mb-6 flex items-start gap-16">
              <div>
                <p className="text-7xl font-bold text-[#4A86C5]">{yesPct}%</p>
                <p className="mt-2 text-sm font-medium text-[#71717A]">YES</p>
              </div>
              <div className="mt-4 text-3xl text-[#EAE7E1]">/</div>
              <div>
                <p className="text-7xl font-bold text-[#C0413B]">{noPct}%</p>
                <p className="mt-2 text-sm font-medium text-[#71717A]">NO</p>
              </div>
            </div>

            <div className="mb-10 h-1.5 overflow-hidden rounded-full bg-[#EAE7E1]">
              <div
                className="h-full rounded-full bg-[#4A86C5] transition-all"
                style={{ width: `${yesPct}%` }}
              />
            </div>

            <div className="rounded-lg border border-[#EAE7E1] bg-white p-4 text-xs text-[#71717A]">
              <span className="mr-4">q_yes: {market.q_yes}</span>
              <span className="mr-4">q_no: {market.q_no}</span>
              <span>b: {market.b}</span>
            </div>
          </div>

          {/* Right: trade / resolved */}
          <div className="flex flex-col gap-4">
            {isResolved ? (
              <div
                className={`rounded-2xl border p-10 text-center ${
                  market.resolution === 'yes'
                    ? 'border-[#4A86C5]/20 bg-white'
                    : 'border-[#C0413B]/20 bg-white'
                }`}
              >
                <p
                  className={`font-display text-4xl ${
                    market.resolution === 'yes' ? 'text-[#4A86C5]' : 'text-[#C0413B]'
                  }`}
                >
                  Resolved: {market.resolution?.toUpperCase()}
                </p>
                {market.resolved_at && (
                  <p className="mt-2 text-sm text-[#71717A]">
                    {new Date(market.resolved_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            ) : (
              <TradePanel
                marketId={market.id}
                qYes={Number(market.q_yes)}
                qNo={Number(market.q_no)}
                b={Number(market.b)}
              />
            )}

            {isAdmin && !isResolved && (
              <ResolvePanel marketId={market.id} />
            )}
          </div>
        </div>
      </main>
    </>
  )
}
