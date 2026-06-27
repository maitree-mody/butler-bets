import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { priceYes } from '@/lib/lmsr'

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
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">Signed in as {user.email}</p>
        <div className="flex items-center gap-3">
          <Link
            href="/leaderboard"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
          >
            Leaderboard
          </Link>
          <Link
            href="/markets/new"
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Create market
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <h1 className="mb-4 text-2xl font-semibold">Markets</h1>

      {error ? (
        <p className="text-red-500">DB error: {error.message}</p>
      ) : markets && markets.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {markets.map((m) => {
            const yesPct = Math.round(priceYes(Number(m.q_yes), Number(m.q_no), Number(m.b)) * 100)
            const closeDate = new Date(m.closes_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            return (
              <li key={m.id}>
                <Link
                  href={`/markets/${m.id}`}
                  className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium">{m.question}</p>
                    <span className="shrink-0 text-sm font-semibold text-green-600">
                      {yesPct}% YES
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                    <span
                      className={
                        m.status === 'open'
                          ? 'text-green-500'
                          : m.status === 'closed'
                            ? 'text-yellow-500'
                            : 'text-gray-400'
                      }
                    >
                      {m.status}
                    </span>
                    <span>Closes {closeDate}</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-gray-400">No markets yet.</p>
      )}
    </main>
  )
}
