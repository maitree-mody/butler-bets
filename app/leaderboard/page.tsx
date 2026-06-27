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
    supabase.from('users').select('id, email, crowns'),
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
      displayName: displayNameFromEmail(entry.email),
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
      <main className="page-shell py-10 sm:py-14">
        <header className="reveal grid gap-8 border-b border-line-strong pb-8 md:grid-cols-[minmax(0,1fr)_18rem] md:items-end">
          <div>
            <p className="eyebrow mb-4">Season standings</p>
            <h1 className="page-title">Leaderboard</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-ink-soft">
              Ranked by profit from a 1,000-crown starting balance. Every completed order counts toward activity.
            </p>
          </div>
          {myRow && !error && (
            <dl className="font-numeric grid grid-cols-2 border border-line-strong bg-surface text-sm">
              <div className="border-r py-3 pr-4">
                <dt className="eyebrow">Your rank</dt>
                <dd className="mt-2 text-xl font-semibold">
                  {String(myRank).padStart(2, '0')} <span className="text-xs font-normal text-ink-faint">/ {rankedUsers.length}</span>
                </dd>
              </div>
              <div className="py-3 pl-4 text-right">
                <dt className="eyebrow">Your profit</dt>
                <dd className={`mt-2 text-xl font-semibold ${myRow.profit >= 0 ? 'text-positive' : 'text-danger'}`}>
                  {myRow.profit >= 0 ? '+' : ''}{myRow.profit.toFixed(2)}
                </dd>
              </div>
            </dl>
          )}
        </header>

        <section className="reveal reveal-delay-1 pt-7" aria-labelledby="ranking-title">
          <div className="mb-3 flex items-end justify-between">
            <h2 id="ranking-title" className="font-display text-2xl font-medium tracking-[-0.025em]">Top traders</h2>
            <p className="font-numeric text-xs text-ink-faint">Top {Math.min(LEADERBOARD_LIMIT, rankedUsers.length)} by profit</p>
          </div>

          {error ? (
            <p className="border-l-2 border-danger bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              Failed to load leaderboard: {error.message}
            </p>
          ) : rankedUsers.length === 0 ? (
            <p className="border-y border-line-strong py-12 text-center text-ink-soft">No traders yet.</p>
          ) : (
            <div className="relative border-y border-line-strong">
              <table className="font-numeric w-full table-fixed" aria-label="Trader rankings">
                <thead>
                  <tr className="border-b bg-surface-muted text-left">
                    <th className="w-[14%] px-2 py-3 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint sm:w-24 sm:px-4">Rank</th>
                    <th className="w-[38%] px-2 py-3 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint sm:px-4">Trader</th>
                    <th className="w-[20%] px-2 py-3 text-right text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint sm:px-4">Trades</th>
                    <th className="w-[28%] px-2 py-3 text-right text-[0.625rem] font-bold uppercase tracking-[0.1em] text-ink-faint sm:px-4">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((entry, index) => {
                    const rank = index + 1
                    const isMe = entry.id === user.id
                    const isTopThree = rank <= 3

                    return (
                      <tr
                        key={entry.id}
                        className={`group border-b transition-colors duration-150 last:border-0 hover:bg-surface-raised ${
                          isMe
                            ? 'bg-surface-raised font-semibold'
                            : isTopThree
                              ? 'bg-surface'
                              : 'bg-transparent'
                        }`}
                      >
                        <td className={`relative px-2 py-4 sm:px-4 ${isMe ? 'border-l-4 border-accent' : ''}`}>
                          <span className={`text-base font-semibold sm:text-lg ${isTopThree ? 'text-accent' : 'text-ink'}`}>
                            {String(rank).padStart(2, '0')}
                          </span>
                          {isTopThree && <span className="ml-1.5 hidden text-[0.55rem] font-bold uppercase tracking-[0.08em] text-ink-faint sm:inline">Top 3</span>}
                        </td>
                        <td className="px-2 py-4 sm:px-4">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`min-w-0 truncate text-xs sm:text-sm ${isMe ? 'font-bold text-accent' : 'font-medium text-ink'}`}>
                              {entry.displayName}
                            </span>
                            {isMe && <span className="shrink-0 border-b border-accent pb-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-accent">You</span>}
                          </div>
                        </td>
                        <td className="px-2 py-4 text-right text-xs font-semibold text-ink-soft sm:px-4 sm:text-sm">{entry.tradeCount}</td>
                        <td className={`px-2 py-4 text-right text-xs font-semibold sm:px-4 sm:text-sm ${entry.profit >= 0 ? 'text-positive' : 'text-danger'}`}>
                          {entry.profit >= 0 ? '+' : ''}{entry.profit.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {myRow && !isCurrentUserInTop && (
                  <tfoot className="sticky bottom-0 z-10 bg-ink text-white">
                    <tr>
                      <td colSpan={2} className="border-l-4 border-accent px-2 py-3 text-xs font-bold sm:px-4 sm:text-sm">
                        You: #{myRank} <span className="ml-2 font-normal text-white/70">{myRow.displayName}</span>
                      </td>
                      <td className="px-2 py-3 text-right text-xs font-semibold text-white/70 sm:px-4 sm:text-sm">{myRow.tradeCount}</td>
                      <td className={`px-2 py-3 text-right text-xs font-semibold sm:px-4 sm:text-sm ${myRow.profit >= 0 ? 'text-positive-soft' : 'text-danger-soft'}`}>
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
