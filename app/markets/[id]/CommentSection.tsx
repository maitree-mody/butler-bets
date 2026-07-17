'use client'

import { useRef, useState, useTransition, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Image as ImageIcon, Sticker, X, Loader2 } from 'lucide-react'
import { postComment, deleteComment } from '@/app/actions/comments'
import { createClient } from '@/lib/supabase/client'
import { linkifyText } from '@/lib/linkify'
import GifPicker from './GifPicker'

const MAX_COMMENT_LENGTH = 500
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export type CommentRow = {
  id: string
  body: string
  created_at: string
  user_id: string
  authorName: string
  attachmentUrl: string | null
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export default function CommentSection({
  marketId,
  comments,
  currentUserId,
  canModerate,
}: {
  marketId: string
  comments: CommentRow[]
  currentUserId: string
  canModerate: boolean
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [gifPickerOpen, setGifPickerOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so picking the same file again still fires onChange
    if (!file) return

    setError(null)

    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, GIF, or WEBP images are supported.')
      return
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError('Images must be 8MB or smaller.')
      return
    }

    setIsUploading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in to attach an image.')
      setIsUploading(false)
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('comment-attachments')
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      setError('Failed to upload image.')
      setIsUploading(false)
      return
    }

    const { data } = supabase.storage.from('comment-attachments').getPublicUrl(path)
    setAttachmentUrl(data.publicUrl)
    setIsUploading(false)
  }

  function handleSubmit() {
    const trimmed = body.trim()
    if (!trimmed && !attachmentUrl) return
    setError(null)
    startTransition(async () => {
      const res = await postComment(marketId, trimmed, attachmentUrl)
      if ('error' in res) {
        setError(res.error)
      } else {
        setBody('')
        setAttachmentUrl(null)
        router.refresh()
      }
    })
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      await deleteComment(commentId, marketId)
      router.refresh()
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Comments {comments.length > 0 && <span className="opacity-60">· {comments.length}</span>}
        </h2>
      </div>

      <div className="p-4">
        <textarea
          rows={2}
          maxLength={MAX_COMMENT_LENGTH}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Say something about this market…"
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-columbia"
        />

        {attachmentUrl && (
          <div className="relative mt-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachmentUrl} alt="Attachment preview" className="max-h-32 rounded-lg border border-border" />
            <button
              type="button"
              onClick={() => setAttachmentUrl(null)}
              aria-label="Remove attachment"
              className="pressable absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background shadow"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="pressable flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-columbia hover:text-columbia disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8} />}
              {isUploading ? 'Uploading…' : 'Photo'}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setGifPickerOpen((v) => !v)}
                aria-pressed={gifPickerOpen}
                className={`pressable flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  gifPickerOpen
                    ? 'border-columbia bg-columbia-soft text-columbia'
                    : 'border-border text-muted-foreground hover:border-columbia hover:text-columbia'
                }`}
              >
                <Sticker className="h-3.5 w-3.5" strokeWidth={1.8} />
                GIF
              </button>
              {gifPickerOpen && (
                <GifPicker
                  onSelect={(url) => {
                    setAttachmentUrl(url)
                    setGifPickerOpen(false)
                  }}
                  onClose={() => setGifPickerOpen(false)}
                />
              )}
            </div>

            <span className="text-[11px] text-muted-foreground/60">{body.length}/{MAX_COMMENT_LENGTH}</span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || isUploading || (body.trim().length === 0 && !attachmentUrl)}
            className="pressable rounded-lg bg-columbia px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-columbia-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? 'Posting…' : 'Post'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs font-medium text-danger" role="alert">{error}</p>}
      </div>

      {comments.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-foreground">{c.authorName}</span>
                  <span className="text-[11px] text-muted-foreground/60">{timeAgo(c.created_at)}</span>
                </div>
                {c.body && (
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {linkifyText(c.body)}
                  </p>
                )}
                {c.attachmentUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.attachmentUrl}
                    alt="Comment attachment"
                    loading="lazy"
                    className="mt-2 max-h-64 max-w-full rounded-lg border border-border"
                  />
                )}
              </div>
              {(c.user_id === currentUserId || canModerate) && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  disabled={isPending}
                  aria-label="Delete comment"
                  className="pressable shrink-0 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
