'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const MAX_COMMENT_LENGTH = 500

// Attachments come from one of two places, and this action never receives
// raw file bytes for either: (1) a photo uploaded client-side straight to
// our own Supabase Storage bucket (CommentSection.tsx), or (2) a GIF picked
// from the GIPHY search popover (GifPicker.tsx), which is just a CDN URL —
// GIPHY hosts the file, we never touch it. Either way we only get a URL
// string here, and we allow-list it to our own bucket or GIPHY's CDN so a
// client can't pass an arbitrary external image URL and have it auto-render
// inline (unlike a plain text link, an attachment renders without a click,
// so it gets a narrower trust boundary).
const ATTACHMENT_URL_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/comment-attachments/`
const GIPHY_HOST_SUFFIX = '.giphy.com'

function isAllowedAttachmentUrl(url: string): boolean {
  if (url.startsWith(ATTACHMENT_URL_PREFIX)) return true
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === 'https:' && (hostname === 'giphy.com' || hostname.endsWith(GIPHY_HOST_SUFFIX))
  } catch {
    return false
  }
}

type ActionResult = { data: null } | { error: string }

export async function postComment(
  marketId: string,
  body: string,
  attachmentUrl?: string | null,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be logged in to comment.' }

  const trimmed = body.trim()
  if (!trimmed && !attachmentUrl) return { error: 'Comment cannot be empty.' }
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return { error: `Comments must be ${MAX_COMMENT_LENGTH} characters or fewer.` }
  }
  if (attachmentUrl && !isAllowedAttachmentUrl(attachmentUrl)) {
    return { error: 'Invalid attachment.' }
  }

  const { error } = await supabase.from('comments').insert({
    market_id: marketId,
    user_id: user.id,
    body: trimmed,
    attachment_url: attachmentUrl ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/markets/${marketId}`)
  return { data: null }
}

export async function deleteComment(commentId: string, marketId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be logged in.' }

  // RLS (delete_own_or_admin_comments) enforces the real permission check;
  // this call simply no-ops if the row isn't visible to this user's policy.
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) return { error: error.message }

  revalidatePath(`/markets/${marketId}`)
  return { data: null }
}
