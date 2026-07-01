'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useNotifications } from './NotificationsProvider'

export default function NotificationBell() {
  const { unreadCount } = useNotifications()

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      className="pressable relative rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:border-columbia hover:text-columbia"
    >
      <Bell className="h-4 w-4" strokeWidth={1.5} />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-columbia px-0.5 text-[10px] font-bold leading-none text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
