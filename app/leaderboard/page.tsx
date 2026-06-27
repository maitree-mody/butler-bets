import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { displayNameFromEmail } from '@/lib/display-name'
import Nav from '@/app/components/Nav'

const STARTING_CROWNS = 1000
const LEADERBOARD_LIMIT = 10

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [usersResult, tradesResult] = await Promise.all([
    supabase.from('users').select('id, email, crowns, display_name'),
    supabase.from('trades').select('user_id'),
  ])

  const error = usersResult.error ?? tradesResult.error
  const tradeCounts = new Map<string, number>()
  for (const trade of tradesResult.data ?? []) {
    tradeCounts.set(trade.user_id, (tradeCounts.get(trade.user_id) ?? 0) + 1)
  }

  const rankedUsers = (usersResult.data ?? [])
    .map((entry) => ({
      ...entry,
      displayName: (entry as { display_name?: string | null }).display_name ?? displayNameFromEmail(entry.email),
      profit: Number(entry.crowns) - STARTING_CROWNS,
      tradeCount: tradeCounts.get(entry.id) ?? 0,
    }))
    .sort((a, b) => b.profit - a.profit || b.tradeCount - a.tradeCount || a.displayName.localeCompare(b.displayName))

  const topUsers = rankedUsers.slice(0, LEADERBOARD_LIMIT)
  const myRank = rankedUsers.findIndex((entry) => entry.id === user.id) + 1
  const myRow = rankedUsers.find((entry) => entry.id === user.id)
  const isCurrentUserInTop = topUsers.some((entry) => entry.id === user.id)

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="page-shell py-8 sm:py-10">
        <header className="reveal mb-6 border-b border-line pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">Season standings</p>
              <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-ink">Leaderboard</h1>
              <p className="mt-2 text-sm text-ink-soft">
                Ranked by profit from a 1,000-crown starting balance.
              </p>
            </div>
            {myRow && !error && (
              <dl className="font-numeric flex gap-6 rounded-xl border border-line bg-accent-soft px-5 py-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Your rank</dt>
                  <dd className="mt-1 text-2xl font-bold text-ink">
                    #{myRank} <span className="text-sm font-normal text-ink-soft">/ {rankedUsers.length}</span>
                  </dd>
                </div>
                <div className="border-l border-line pl-6">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Your profit</dt>
                  <dd className={`mt-1 text-2xl font-bold ${myRow.profit >= 0 ? 'text-positive' : 'text-danger'}`}>
                    {myRow.profit >= 0 ? '+' : ''}{myRow.profit.toFixed(2)}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </header>

        <section className="reveal reveal-delay-1" aria-labelledby="ranking-title">
          <h2 id="ranking-title" className="mb-3 text-sm font-semibold uppercase tracking-widest text-ink-soft">
            Top {Math.min(LEADERBOARD_LIMIT, rankedUsers.length)} traders
          </h2>

          {error ? (
            <p className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              Failed to load leaderboard: {error.message}
            </p>
          ) : rankedUsers.length === 0 ? (
            <p className="rounded-xl border border-line py-12 text-center text-ink-soft">No traders yet.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="font-numeric w-full table-fixed" aria-label="Trader rankings">
                <thead>
                  <tr className="border-b bg-surface-muted text-left">
                    <th className="w-16 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Rank</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Trader</th>
                    <th className="w-20 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-soft">Trades</th>
                    <th className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-soft">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((entry, index) => {
                    const rank = index + 1
                    const isMe = entry.id === user.id

                    return (
                      <tr
                        key={entry.id}
                        className={`border-b last:border-0 ${isMe ? 'bg-accent-soft' : 'bg-white hover:bg-surface-muted'}`}
                      >
                        <td className="px-4 py-3.5">
                          <span className={`text-base font-bold ${rank <= 3 ? 'text-accent' : 'text-ink-soft'}`}>
                            #{rank}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`min-w-0 truncate text-sm font-semibold ${isMe ? 'text-accent' : 'text-ink'}`}>
                              {entry.displayName}
                            </span>
                            {isMe && (
                              <span className="shrink-0 rounded-full bg-[#FFF98B] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-ink">
                                you
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm font-semibold text-ink-soft">{entry.tradeCount}</td>
                        <td className={`px-4 py-3.5 text-right text-sm font-bold ${entry.profit >= 0 ? 'text-positive' : 'text-danger'}`}>
                          {entry.profit >= 0 ? '+' : ''}{entry.profit.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {myRow && !isCurrentUserInTop && (
                  <tfoot className="border-t-2 border-accent bg-accent-soft">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-accent">#{myRank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-accent">{myRow.displayName}</span>
                          <span className="rounded-full bg-[#FFF98B] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-ink">you</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-ink-soft">{myRow.tradeCount}</td>
                      <td className={`px-4 py-3 text-right text-sm font-bold ${myRow.profit >= 0 ? 'text-positive' : 'text-danger'}`}>
                        {myRow.profit >= 0 ? '+' : ''}{myRow.profit.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
