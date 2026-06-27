import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/app/components/Nav'

const STARTING_CROWNS = 1000

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, crowns')
    .order('crowns', { ascending: false })

  const myRank = users ? users.findIndex((entry) => entry.id === user.id) + 1 : 0
  const myRow = users?.find((entry) => entry.id === user.id)

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="page-shell py-10 sm:py-14">
        <header className="grid gap-8 border-b border-line-strong pb-8 md:grid-cols-[minmax(0,1fr)_18rem] md:items-end">
          <div>
            <p className="eyebrow mb-4">Season standings</p>
            <h1 className="page-title">Leaderboard</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-ink-soft">
              Ranked by current crown balance. Correct calls compound; conviction moves the board.
            </p>
          </div>
          {myRow && !error && (
            <dl className="font-numeric grid grid-cols-2 border-y border-line-strong text-sm">
              <div className="border-r py-3 pr-4">
                <dt className="eyebrow">Your rank</dt>
                <dd className="mt-2 text-xl font-semibold">{String(myRank).padStart(2, '0')} <span className="text-xs font-normal text-ink-faint">/ {users?.length}</span></dd>
              </div>
              <div className="py-3 pl-4 text-right">
                <dt className="eyebrow">Balance</dt>
                <dd className="mt-2 text-xl font-semibold">{Number(myRow.crowns).toFixed(2)}</dd>
              </div>
            </dl>
          )}
        </header>

        <section className="pt-7" aria-labelledby="ranking-title">
          <div className="mb-3 flex items-end justify-between">
            <h2 id="ranking-title" className="font-display text-2xl font-medium tracking-[-0.025em]">All traders</h2>
            <p className="font-numeric text-xs text-ink-faint">Starting balance: 1,000</p>
          </div>

          {error ? (
            <p className="border-l-2 border-danger bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              Failed to load leaderboard: {error.message}
            </p>
          ) : !users || users.length === 0 ? (
            <p className="border-y border-line-strong py-12 text-center text-ink-soft">No traders yet.</p>
          ) : (
            <div className="border-y border-line-strong">
              <table className="font-numeric w-full table-fixed" aria-label="Trader rankings">
                <thead>
                  <tr className="border-b text-left">
                    <th className="w-[15%] px-2 py-3 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint sm:w-24 sm:px-4">Rank</th>
                    <th className="w-[39%] px-2 py-3 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint sm:px-4">Trader</th>
                    <th className="w-[23%] px-2 py-3 text-right text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint sm:px-4">Crowns</th>
                    <th className="w-[23%] px-2 py-3 text-right text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint sm:px-4">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((entry, index) => {
                    const rank = index + 1
                    const isMe = entry.id === user.id
                    const profit = Number(entry.crowns) - STARTING_CROWNS

                    return (
                      <tr key={entry.id} className={`border-b last:border-0 ${isMe ? 'bg-accent-soft' : 'transition-colors hover:bg-surface'}`}>
                        <td className={`px-2 py-4 sm:px-4 ${isMe ? 'border-l-2 border-accent' : ''}`}>
                          <span className="text-base font-semibold sm:text-lg">{String(rank).padStart(2, '0')}</span>
                        </td>
                        <td className="px-2 py-4 sm:px-4">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`min-w-0 truncate text-xs sm:text-sm ${isMe ? 'font-bold text-accent' : 'font-medium text-ink'}`}>
                              {entry.email ?? '—'}
                            </span>
                            {isMe && <span className="shrink-0 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-accent">You</span>}
                          </div>
                        </td>
                        <td className="px-2 py-4 text-right text-xs font-semibold sm:px-4 sm:text-sm">{Number(entry.crowns).toFixed(2)}</td>
                        <td className={`px-2 py-4 text-right text-xs font-semibold sm:px-4 sm:text-sm ${profit >= 0 ? 'text-accent' : 'text-danger'}`}>
                          {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
