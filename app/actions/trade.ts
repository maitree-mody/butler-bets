'use server'

/**
 * executeTradeAction — validation checklist (auditable):
 *  1. User is authenticated via Supabase session (no parameter trust).
 *  2. `side` must be exactly 'yes' or 'no'.
 *  3. `shares` must be a positive integer (rejects fractions, zero, negatives).
 *  4. `shares` must not exceed MAX_SHARES (100 000) — guards against DoS via
 *     huge LMSR cost computation and implausibly large position sizes.
 *  5. Market must have status 'open' — enforced atomically inside execute_trade
 *     SQL function (server action error-maps the rejection message).
 *  6. User balance ≥ trade cost — enforced atomically inside execute_trade SQL
 *     function with SELECT … FOR UPDATE row-locking (prevents race conditions).
 */

import { createClient } from '@/lib/supabase/server'

const MAX_SHARES = 100_000

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

  if (shares > MAX_SHARES) {
    return { error: `Share count cannot exceed ${MAX_SHARES.toLocaleString()} per trade.` }
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
      return { error: 'This market is not open for trading.' }
    }
    if (msg.includes('share count cannot exceed')) {
      return { error: `Share count cannot exceed ${MAX_SHARES.toLocaleString()} per trade.` }
    }
    return { error: error.message }
  }

  return { data }
}

type SellResult =
  | { data: { q_yes: number; q_no: number; price_yes: number; payout: number; new_crowns: number } }
  | { error: string }

export async function sellSharesAction(
  marketId: string,
  side: string,
  shares: number,
): Promise<SellResult> {
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

  if (shares > MAX_SHARES) {
    return { error: `Share count cannot exceed ${MAX_SHARES.toLocaleString()} per trade.` }
  }

  const { data, error } = await supabase.rpc('sell_shares', {
    p_market_id: marketId,
    p_side: side,
    p_shares: shares,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('insufficient shares')) {
      return { error: "You don't have enough shares to sell." }
    }
    if (msg.includes('not open') || msg.includes('market is not open')) {
      return { error: 'This market is not open for trading.' }
    }
    if (msg.includes('share count cannot exceed')) {
      return { error: `Share count cannot exceed ${MAX_SHARES.toLocaleString()} per trade.` }
    }
    return { error: error.message }
  }

  return { data }
}
