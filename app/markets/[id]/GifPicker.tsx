'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'

type Gif = { id: string; title: string; previewUrl: string; fullUrl: string }

export default function GifPicker({
  onSelect,
  onClose,
}: {
  onSelect: (url: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<Gif[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Debounced search-as-you-type; empty query falls back to trending
  // (handled server-side by /api/gifs).
  useEffect(() => {
    const handle = setTimeout(() => {
      let cancelled = false
      setIsLoading(true)
      setError(null)
      fetch(`/api/gifs?q=${encodeURIComponent(query)}`)
        .then(async (res) => {
          const json = await res.json()
          if (cancelled) return
          if (!res.ok) {
            setError(json.error ?? 'Failed to load GIFs.')
            setGifs([])
          } else {
            setGifs(json.gifs)
          }
        })
        .catch(() => {
          if (!cancelled) setError('Failed to load GIFs.')
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
      return () => {
        cancelled = true
      }
    }, 350)
    return () => clearTimeout(handle)
  }, [query])

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIPHY…"
          className="w-full bg-transparent text-sm text-foreground outline-none"
        />
      </div>
      <div className="h-64 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
          </div>
        ) : error ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">{error}</p>
        ) : gifs.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">No GIFs found.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {gifs.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelect(g.fullUrl)}
                className="pressable overflow-hidden rounded-lg border border-border transition-colors hover:border-columbia"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.previewUrl} alt={g.title} loading="lazy" className="h-20 w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground/50">Powered by GIPHY</p>
    </div>
  )
}
