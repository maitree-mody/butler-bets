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

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="mx-auto max-w-5xl px-8 py-16">
        <div className="mb-14 flex items-end justify-between">
          <div>
            <h1 className="font-display text-7xl leading-none text-[#18181B]">Markets</h1>
            <p className="mt-4 text-base text-[#71717A]">
              {markets ? `${markets.length} open prediction${markets.length !== 1 ? 's' : ''}` : 'Play-money predictions'}
            </p>
          </div>
          <Link
            href="/markets/new"
            className="rounded-xl bg-[#4A86C5] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            + New market
          </Link>
        </div>

        {error ? (
          <p className="text-sm text-[#C0413B]">Failed to load markets: {error.message}</p>
        ) : markets && markets.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {markets.map((m) => {
              const yesProb = priceYes(Number(m.q_yes), Number(m.q_no), Number(m.b))
              const yesPct = Math.round(yesProb * 100)
              const noPct = 100 - yesPct
              const closeDate = new Date(m.closes_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
              return (
                <li key={m.id}>
                  <Link
                    href={`/markets/${m.id}`}
                    className="group flex items-stretch rounded-2xl border border-[#EAE7E1] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#4A86C5]/30 hover:shadow-md"
                  >
                    {/* YES% bar on left edge */}
                    <div
                      className="w-1.5 shrink-0 rounded-l-2xl bg-[#4A86C5]"
                      style={{ opacity: 0.3 + yesProb * 0.7 }}
                    />
                    <div className="flex flex-1 items-center justify-between gap-10 px-8 py-7">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex items-center gap-2.5">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                              m.status === 'open'
                                ? 'border-[#4A86C5]/30 text-[#4A86C5]'
                                : m.status === 'closed'
                                  ? 'border-amber-300 text-amber-600'
                                  : 'border-[#EAE7E1] text-[#71717A]'
                            }`}
                          >
                            {m.status}
                          </span>
                          <span className="text-xs text-[#71717A]">Closes {closeDate}</span>
                        </div>
                        <p className="font-display mb-4 text-xl leading-snug text-[#18181B]">
                          {m.question}
                        </p>
                        <div className="h-1 overflow-hidden rounded-full bg-[#EAE7E1]">
                          <div
                            className="h-full rounded-full bg-[#4A86C5] transition-all"
                            style={{ width: `${yesPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-5xl font-bold leading-none text-[#4A86C5]">{yesPct}%</p>
                        <p className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-[#71717A]">YES</p>
                        <p className="mt-3 text-xl font-bold leading-none text-[#C0413B]">{noPct}%</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#71717A]">NO</p>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border border-[#EAE7E1] bg-white p-16 text-center">
            <p className="text-[#71717A]">No markets yet.</p>
            <Link
              href="/markets/new"
              className="mt-3 inline-block text-sm font-semibold text-[#4A86C5] underline underline-offset-2"
            >
              Create the first one
            </Link>
          </div>
        )}
      </main>
    </>
  )
}
