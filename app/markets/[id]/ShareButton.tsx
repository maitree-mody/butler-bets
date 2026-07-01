'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // user cancelled or share failed — fall through to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — nothing more we can do without a backend
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="pressable inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-columbia hover:text-columbia"
      aria-live="polite"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
          Copied link
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          Share
        </>
      )}
    </button>
  )
}
