'use server'
import { createClient } from '@/lib/supabase/server'

type TradeResult =
  | { data: { q_yes: number; q_no: number; price_yes: number; cost: number; new_crowns: number } }
  | { error: string }

export async function executeTradeAction(
  marketId: string,
  side: string,
  shares: number,
): Promise<TradeResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be logged in to trade.' }

  if (side !== 'yes' && side !== 'no') {
    return { error: "Side must be 'yes' or 'no'." }
  }

  if (!Number.isInteger(shares) || shares <= 0) {
    return { error: 'Shares must be a positive whole number.' }
  }

  const { data, error } = await supabase.rpc('execute_trade', {
    p_market_id: marketId,
    p_side: side,
    p_shares: shares,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('insufficient crowns')) {
      return { error: "You don't have enough crowns for this trade." }
    }
    if (msg.includes('not open') || msg.includes('market is not open')) {
      return { error: 'This market is closed.' }
    }
    return { error: error.message }
  }

  return { data }
}
