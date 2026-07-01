import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/app/components/Nav'
import Card from '@/app/components/ui/Card'
import { markAllNotificationsRead } from '@/app/actions/notifications'

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

type NotificationRow = {
  id: string
  type: string
  title: string
  body: string
  market_id: string | null
  crowns_change: number
  read: boolean
  created_at: string
  markets: { id: string; question: string }[] | null
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, body, market_id, crowns_change, read, created_at, markets(id, question)')
    .order('created_at', { ascending: false })

  const rows = (notifications ?? []) as NotificationRow[]
  const unreadCount = rows.filter((n) => !n.read).length

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-6 py-8">

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-columbia" strokeWidth={1.5} />
              <h1 className="font-display text-2xl font-bold text-columbia-deep">Notifications</h1>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-columbia px-1.5 text-[11px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <form action={markAllNotificationsRead}>
                <button
                  type="submit"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-columbia hover:text-columbia"
                >
                  Mark all read
                </button>
              </form>
            )}
          </div>

          <Card padding="none" className="overflow-hidden">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40" strokeWidth={1} />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((n) => (
                  <li key={n.id} className={`px-5 py-4 transition-colors ${!n.read ? 'bg-columbia-soft/40' : ''}`}>
                    <div className="flex items-start gap-3">
                      {/* Unread dot */}
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.read ? 'bg-columbia' : 'bg-transparent'}`} />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{n.title}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {n.crowns_change > 0 && (
                              <span className="text-xs font-bold text-success">+{n.crowns_change}&nbsp;♛</span>
                            )}
                            <span className="text-[11px] text-muted-foreground/60">{timeAgo(n.created_at)}</span>
                          </div>
                        </div>

                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{n.body}</p>

                        {n.market_id && n.markets?.[0] && (
                          <Link
                            href={`/markets/${n.market_id}`}
                            className="mt-1.5 inline-block text-xs font-medium text-columbia underline-offset-2 hover:underline"
                          >
                            {n.markets[0].question}
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </>
  )
}
