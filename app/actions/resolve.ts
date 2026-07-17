'use server'

import { createClient } from '@/lib/supabase/server'
import { sendAdminAlertEmail } from '@/lib/email'

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

  if (resolution !== 'yes' && resolution !== 'no') {
    return { error: "Resolution must be 'yes' or 'no'." }
  }

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

const MAX_FLAG_REASON_LENGTH = 500

export async function flagResolutionAction(
  marketId: string,
  reason: string,
): Promise<{ data: null } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be logged in.' }

  const trimmed = reason.trim()
  if (!trimmed) return { error: 'A reason is required.' }
  if (trimmed.length > MAX_FLAG_REASON_LENGTH) {
    return { error: `Reason must be ${MAX_FLAG_REASON_LENGTH} characters or fewer.` }
  }

  const { data: market } = await supabase
    .from('markets')
    .select('question')
    .eq('id', marketId)
    .single()

  const { error } = await supabase.rpc('flag_market_resolution', {
    p_market_id: marketId,
    p_reason: trimmed,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already flagged')) {
      return { error: 'You already flagged this resolution.' }
    }
    if (msg.includes('only a resolved market')) {
      return { error: "Only a resolved market's outcome can be flagged." }
    }
    return { error: error.message }
  }

  // Best-effort — the in-app notification the RPC just inserted for every
  // admin is the reliable path; this is a bonus, never blocks success.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  await sendAdminAlertEmail(
    'Butler Bets: resolution flagged for review',
    `"${market?.question ?? marketId}" was flagged for review.\n\nReason: ${trimmed}\n\n${siteUrl}/markets/${marketId}`,
  )

  return { data: null }
}

export async function reresolveMarketAction(
  marketId: string,
  newResolution: string,
): Promise<ResolveResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be logged in.' }

  if (newResolution !== 'yes' && newResolution !== 'no') {
    return { error: "Resolution must be 'yes' or 'no'." }
  }

  const { data, error } = await supabase.rpc('reresolve_market', {
    p_market_id: marketId,
    p_new_resolution: newResolution,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('only admins can override')) {
      return { error: 'Only admins can override a resolution.' }
    }
    if (msg.includes('nothing to override')) {
      return { error: 'That is already the current resolution.' }
    }
    if (msg.includes('must already be resolved')) {
      return { error: 'This market must be resolved before it can be overridden.' }
    }
    return { error: error.message }
  }

  return { data }
}
