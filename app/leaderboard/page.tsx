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

        {/* Header */}
        <header className="reveal mb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow mb-2">Season standings</p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-columbia-deep sm:text-4xl">
                Leaderboard
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Ranked by profit from a 1,000-crown starting balance.
              </p>
            </div>

            {/* Rank summary card */}
            {myRow && !error && (
              <div className="font-numeric shrink-0 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex gap-6">
                  <div>
                    <p className="eyebrow mb-1">Your rank</p>
                    <p className="text-2xl font-bold text-columbia-deep">
                      #{myRank}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">/ {rankedUsers.length}</span>
                    </p>
                  </div>
                  <div className="border-l border-border pl-6">
                    <p className="eyebrow mb-1">Your profit</p>
                    <p className={`text-2xl font-bold ${myRow.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {myRow.profit >= 0 ? '+' : ''}{myRow.profit.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Table */}
        <section className="reveal reveal-delay-1" aria-labelledby="ranking-title">
          <h2 id="ranking-title" className="eyebrow mb-3">
            Top {Math.min(LEADERBOARD_LIMIT, rankedUsers.length)} traders
          </h2>

          {error ? (
            <p className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
              Failed to load leaderboard: {error.message}
            </p>
          ) : rankedUsers.length === 0 ? (
            <p className="rounded-xl border border-border py-12 text-center text-sm text-muted-foreground">
              No traders yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <table className="font-numeric w-full table-fixed" aria-label="Trader rankings">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="w-16 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Rank</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Trader</th>
                    <th className="w-20 px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Trades</th>
                    <th className="w-28 px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((entry, index) => {
                    const rank = index + 1
                    const isMe = entry.id === user.id

                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-border last:border-0 transition-colors ${
                          isMe ? 'bg-columbia-soft/50' : 'hover:bg-muted/40'
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <span className={`text-sm font-bold ${
                            rank <= 3 ? 'text-columbia' : 'text-foreground'
                          }`}>
                            #{rank}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`min-w-0 truncate text-sm font-semibold ${
                              isMe ? 'text-columbia' : 'text-foreground'
                            }`}>
                              {entry.displayName}
                            </span>
                            {isMe && (
                              <span className="shrink-0 rounded-full bg-columbia-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-columbia">
                                you
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-muted-foreground">
                          {entry.tradeCount}
                        </td>
                        <td className={`px-4 py-3.5 text-right text-sm font-bold ${
                          entry.profit >= 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {entry.profit >= 0 ? '+' : ''}{entry.profit.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {myRow && !isCurrentUserInTop && (
                  <tfoot className="border-t-2 border-columbia/20 bg-columbia-soft/40">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-columbia">#{myRank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-columbia">{myRow.displayName}</span>
                          <span className="rounded-full bg-columbia-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-columbia">
                            you
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">{myRow.tradeCount}</td>
                      <td className={`px-4 py-3 text-right text-sm font-bold ${
                        myRow.profit >= 0 ? 'text-success' : 'text-danger'
                      }`}>
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
