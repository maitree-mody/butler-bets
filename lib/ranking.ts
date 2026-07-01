import { displayNameFromEmail } from '@/lib/display-name'

const STARTING_CROWNS = 1000

export type RankableUser = {
  id: string
  email: string | null
  crowns: number | string
  display_name: string | null
}

export type RankedUser = {
  id: string
  email: string | null
  crowns: number | string
  display_name: string | null
  displayName: string
  profit: number
  tradeCount: number
}

/**
 * Ranks users by profit from the 1,000-crown starting balance, tie-broken
 * by trade count then display name. Verbatim extraction of the sort used
 * on the leaderboard page — keep both in sync via this shared helper.
 */
export function rankUsers(users: RankableUser[], tradeCounts: Map<string, number>): RankedUser[] {
  return users
    .map((entry) => ({
      ...entry,
      displayName: entry.display_name ?? displayNameFromEmail(entry.email),
      profit: Number(entry.crowns) - STARTING_CROWNS,
      tradeCount: tradeCounts.get(entry.id) ?? 0,
    }))
    .sort((a, b) => b.profit - a.profit || b.tradeCount - a.tradeCount || a.displayName.localeCompare(b.displayName))
}
