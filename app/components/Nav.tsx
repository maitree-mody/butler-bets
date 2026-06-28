import Link from 'next/link'
import { Crown } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { displayNameFromEmail } from '@/lib/display-name'
import NavLinks from './NavLinks'

export default function Nav({ email }: { email: string }) {
  const displayName = displayNameFromEmail(email)

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-columbia-deep" strokeWidth={1.5} />
            <span className="font-display text-[1.1rem] font-bold text-columbia-deep">
              butler bets
            </span>
          </Link>
          <NavLinks />
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground lg:block">@{displayName}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="pressable rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-columbia hover:text-columbia"
            >
              Sign out
            </button>
          </form>
          <Link
            href="/markets/new"
            className="pressable rounded-lg bg-columbia px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-columbia-deep"
          >
            + New market
          </Link>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="border-t border-border sm:hidden">
        <div className="mx-auto max-w-7xl px-6">
          <NavLinks mobile />
        </div>
      </div>
    </header>
  )
}
