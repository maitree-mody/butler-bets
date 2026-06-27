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

  const myRank = users ? users.findIndex((u) => u.id === user.id) + 1 : 0
  const myRow = users ? users.find((u) => u.id === user.id) : null
  const myProfit = myRow ? Number(myRow.crowns) - STARTING_CROWNS : 0

  const podiumStyle: Record<number, string> = {
    1: 'bg-[#FDF8EC] border-[#F0D080]/40',
    2: 'bg-[#F5F5F5] border-[#C8C4BE]/40',
    3: 'bg-[#FDF4EE] border-[#D4A882]/40',
  }

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="mx-auto max-w-5xl px-8 py-16">
        {/* Header */}
        <div className="mb-14">
          <h1 className="font-display text-7xl leading-none text-[#18181B]">Leaderboard</h1>
          <p className="mt-4 text-base text-[#71717A]">Ranked by current crown balance.</p>
        </div>

        {/* Your rank banner */}
        {myRow && !error && (
          <div className="mb-8 flex items-center justify-between rounded-2xl border border-[#4A86C5]/20 bg-[#4A86C5]/5 px-8 py-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-[#4A86C5]">Your standing</p>
              <p className="mt-1 text-2xl font-semibold text-[#18181B]">
                #{myRank} of {users?.length ?? 0}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-widest text-[#71717A]">Balance</p>
              <p className="mt-1 text-2xl font-semibold text-[#18181B]">
                {Number(myRow.crowns).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-widest text-[#71717A]">Profit</p>
              <p className={`mt-1 text-2xl font-semibold ${myProfit >= 0 ? 'text-[#2E7D5B]' : 'text-[#C0413B]'}`}>
                {myProfit >= 0 ? '+' : ''}{myProfit.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {error ? (
          <p className="text-sm text-[#C0413B]">Failed to load leaderboard: {error.message}</p>
        ) : !users || users.length === 0 ? (
          <p className="text-[#71717A]">No players yet.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#EAE7E1]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EAE7E1] bg-white">
                  <th className="w-20 px-8 py-5 text-left text-xs font-semibold uppercase tracking-widest text-[#71717A]">Rank</th>
                  <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-widest text-[#71717A]">Player</th>
                  <th className="px-8 py-5 text-right text-xs font-semibold uppercase tracking-widest text-[#71717A]">Crowns</th>
                  <th className="px-8 py-5 text-right text-xs font-semibold uppercase tracking-widest text-[#71717A]">Profit</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const rank = i + 1
                  const isMe = u.id === user.id
                  const profit = Number(u.crowns) - STARTING_CROWNS
                  const isPodium = rank <= 3
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-[#EAE7E1] last:border-0 transition-colors ${
                        isMe
                          ? 'bg-[#4A86C5]/5'
                          : isPodium
                            ? podiumStyle[rank]
                            : 'bg-white hover:bg-[#FBFAF8]'
                      }`}
                    >
                      <td className={`px-8 py-6 ${isMe ? 'border-l-4 border-[#4A86C5]' : ''}`}>
                        <span className={`font-display text-3xl font-light ${
                          rank === 1 ? 'text-[#C4A000]'
                          : rank === 2 ? 'text-[#8A8A8A]'
                          : rank === 3 ? 'text-[#B5713A]'
                          : 'text-[#C8C4BE]'
                        }`}>
                          {String(rank).padStart(2, '0')}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`truncate text-sm ${
                              isMe ? 'font-semibold text-[#4A86C5]' : 'font-medium text-[#18181B]'
                            }`}
                          >
                            {u.email ?? '—'}
                          </span>
                          {isMe && (
                            <span className="shrink-0 rounded-full bg-[#4A86C5] px-2.5 py-0.5 text-xs font-semibold text-white">
                              you
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className="text-sm font-semibold text-[#18181B]">
                          {Number(u.crowns).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className={`text-sm font-semibold ${profit >= 0 ? 'text-[#2E7D5B]' : 'text-[#C0413B]'}`}>
                          {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
