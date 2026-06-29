'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from './NotificationsProvider'
import type { Notification } from './NotificationsProvider'

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function NotificationRow({ n }: { n: Notification }) {
  return (
    <div className={`px-4 py-3 transition-colors ${!n.read ? 'bg-columbia-soft' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug">{n.title}</p>
        {n.crowns_change > 0 && (
          <span className="shrink-0 text-xs font-bold text-success">
            +{n.crowns_change}&nbsp;♛
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-foreground/70 leading-relaxed">{n.body}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/60">{timeAgo(n.created_at)}</p>
    </div>
  )
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function handleToggle() {
    const next = !open
    setOpen(next)
    // Opening the panel marks everything read immediately.
    if (next) markAllRead()
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="pressable relative rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:border-columbia hover:text-columbia"
      >
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-columbia px-0.5 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-40 w-80 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          </div>

          <div className="max-h-[min(24rem,80dvh)] overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </p>
            ) : (
              notifications.map(n => <NotificationRow key={n.id} n={n} />)
            )}
          </div>
        </div>
      )}
    </div>
  )
}
