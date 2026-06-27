'use server'

import { createClient } from '@/lib/supabase/server'

type ResolveResult = { data: unknown } | { error: string }

export async function resolveMarketAction(
  marketId: string,
  resolution: string,
): Promise<ResolveResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be logged in.' }

  const { data, error } = await supabase.rpc('resolve_market', {
    p_market_id: marketId,
    p_resolution: resolution,
  })

  if (error) {
    if (error.message.toLowerCase().includes('only admins can resolve markets')) {
      return { error: 'Only admins can resolve markets.' }
    }
    return { error: error.message }
  }

  return { data }
}
