import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { rankUsers } from '@/lib/ranking'
import { formatCrownsSigned } from '@/lib/format-crowns'
import Nav from '@/app/components/Nav'
import Card from '@/app/components/ui/Card'
import Badge from '@/app/components/ui/Badge'
import Alert from '@/app/components/ui/Alert'

const LEADERBOARD_LIMIT = 10

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Step 1: fetch every trade row (just user_id for counting).
  // We need this first so we can filter users at the DB level in step 2.
  const { data: tradeRows, error: tradesError } = await supabase
    .from('trades')
    .select('user_id')

  // Build per-user trade counts and the set of IDs that have ever traded.
  const tradeCounts = new Map<string, number>()
  for (const row of tradeRows ?? []) {
    tradeCounts.set(row.user_id, (tradeCounts.get(row.user_id) ?? 0) + 1)
  }
  const traderIds = [...tradeCounts.keys()]

  // Step 2: fetch ONLY users who appear in the trades table.
  // .in() filters at the database level — no client-side filter required.
  const { data: usersData, error: usersError } =
    traderIds.length === 0
      ? { data: [] as { id: string; email: string | null; crowns: number; display_name: string | null }[], error: null }
      : await supabase
          .from('users')
          .select('id, email, crowns, display_name')
          .in('id', traderIds)

  const error = tradesError ?? usersError

  const rankedUsers = rankUsers(usersData ?? [], tradeCounts)

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
                Top of The Heights
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Ranked by profit from a 1,000-crown starting balance.
              </p>
            </div>

            {/* Rank summary card */}
            {!error && (myRow ? (
              <Card padding="md" className="font-numeric shrink-0">
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
                      {formatCrownsSigned(myRow.profit)}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card padding="md" className="shrink-0">
                <p className="text-sm font-semibold text-foreground">Not ranked yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Make your first trade and crack the leaderboard.</p>
              </Card>
            ))}
          </div>
        </header>

        {/* Table */}
        <section className="reveal reveal-delay-1" aria-labelledby="ranking-title">
          <h2 id="ranking-title" className="eyebrow mb-3">
            Top {Math.min(LEADERBOARD_LIMIT, rankedUsers.length)} active traders
          </h2>

          {error ? (
            <Alert tone="danger" role="alert">
              Failed to load leaderboard: {error.message}
            </Alert>
          ) : rankedUsers.length === 0 ? (
            <p className="rounded-xl border border-border py-12 text-center text-sm text-muted-foreground">
              No traders yet. Someone&apos;s got to be #1.
            </p>
          ) : (
            <Card padding="none" className="overflow-hidden">
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
                              <Badge tone="columbia" className="shrink-0">you</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm text-muted-foreground">
                          {entry.tradeCount}
                        </td>
                        <td className={`px-4 py-3.5 text-right text-sm font-bold ${
                          entry.profit >= 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {formatCrownsSigned(entry.profit)}
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
                          <Badge tone="columbia">you</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">{myRow.tradeCount}</td>
                      <td className={`px-4 py-3 text-right text-sm font-bold ${
                        myRow.profit >= 0 ? 'text-success' : 'text-danger'
                      }`}>
                        {formatCrownsSigned(myRow.profit)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </Card>
          )}
        </section>
      </main>
    </>
  )
}
