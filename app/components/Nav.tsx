import Link from 'next/link'
import { Crown, ChevronDown, LogOut, User } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { displayNameFromEmail } from '@/lib/display-name'
import NavLinks from './NavLinks'
import NotificationBell from './NotificationBell'

export default function Nav({ email }: { email: string }) {
  const displayName = displayNameFromEmail(email)
  const initial = displayName[0]?.toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">

        {/* Left: brand + nav links */}
        <div className="flex items-stretch">
          <Link
            href="/"
            className="flex items-center gap-2 border-r border-border pr-6 mr-0"
          >
            <Crown className="h-[1.05rem] w-[1.05rem] shrink-0 text-columbia-deep" strokeWidth={2.25} />
            <span className="font-display text-[1.05rem] font-bold leading-none tracking-tight text-columbia-deep">
              butler bets
            </span>
          </Link>
          <NavLinks />
        </div>

        {/* Right: CTA + user dropdown */}
        <div className="flex items-center gap-2">
          <Link
            href="/markets/new"
            className="pressable rounded-lg bg-primary px-4 py-[0.45rem] text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            + New market
          </Link>

          <NotificationBell />

          {/* User menu — native details/summary, no JS needed */}
          <details className="group relative">
            <summary className="flex cursor-pointer select-none list-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-columbia-soft text-[0.7rem] font-bold text-columbia">
                {initial}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180" />
            </summary>

            <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <div className="border-b border-border px-3.5 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Signed in as
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                  {displayName}
                </p>
              </div>
              <div className="p-1">
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 font-sans text-sm font-normal leading-none text-foreground transition-colors hover:bg-muted"
                >
                  <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  Profile
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-sans text-sm font-normal leading-none text-foreground transition-colors hover:bg-muted"
                  >
                    <LogOut className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Mobile nav strip */}
      <div className="border-t border-border sm:hidden">
        <div className="mx-auto max-w-7xl px-6">
          <NavLinks mobile />
        </div>
      </div>
    </header>
  )
}
