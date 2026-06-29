'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import ResolutionModal from './ResolutionModal'

export type Notification = {
  id: string
  type: string
  title: string
  body: string
  market_id: string | null
  crowns_change: number
  read: boolean
  created_at: string
}

type ContextValue = {
  notifications: Notification[]
  unreadCount: number
  markAllRead: () => Promise<void>
  markOneRead: (id: string) => Promise<void>
}

const NotificationsContext = createContext<ContextValue | null>(null)

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be inside NotificationsProvider')
  return ctx
}

export default function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, market_id, crowns_change, read, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNotifications(data as Notification[])
  }, [supabase])

  useEffect(() => {
    fetchNotifications()
    // Re-fetch when the tab regains focus so a resolution that happened
    // in another tab appears without a full page reload.
    window.addEventListener('focus', fetchNotifications)
    return () => window.removeEventListener('focus', fetchNotifications)
  }, [fetchNotifications])

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    // Optimistic update first so the badge and unread highlights disappear instantly.
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
  }, [notifications, supabase])

  const markOneRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }, [supabase])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAllRead, markOneRead }}>
      {children}
      <ResolutionModal />
    </NotificationsContext.Provider>
  )
}
