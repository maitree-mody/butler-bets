import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="mb-6 inline-block text-sm text-gray-400 hover:text-gray-600">
        ← All markets
      </Link>

      <h1 className="mb-6 text-2xl font-semibold">Leaderboard</h1>

      {error ? (
        <p className="text-red-500">Failed to load leaderboard: {error.message}</p>
      ) : !users || users.length === 0 ? (
        <p className="text-gray-400">No players yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Player</th>
                <th className="px-4 py-3 text-right font-medium">Crowns</th>
                <th className="px-4 py-3 text-right font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const isMe = u.id === user.id
                const profit = Number(u.crowns) - STARTING_CROWNS
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-gray-100 last:border-0 ${
                      isMe ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className={isMe ? 'font-semibold text-blue-700' : 'text-gray-700'}>
                        {u.email ?? '—'}
                      </span>
                      {isMe && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {Number(u.crowns).toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        profit >= 0 ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {profit >= 0 ? '+' : ''}
                      {profit.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
