import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import { displayNameFromEmail } from '@/lib/display-name'
import NavLinks from './NavLinks'

export default function Nav({ email }: { email: string }) {
  const displayName = displayNameFromEmail(email)

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white">
      <div className="page-shell flex h-14 items-stretch justify-between">
        <div className="flex items-stretch gap-6">
          <Link href="/" className="font-display flex min-h-11 items-center text-[1.25rem] font-medium tracking-[-0.02em] text-ink">
            butler bets
          </Link>
          <NavLinks />
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden max-w-40 truncate text-xs text-ink-soft lg:block">@{displayName}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
      <div className="border-t sm:hidden">
        <div className="page-shell">
          <NavLinks mobile />
        </div>
      </div>
    </header>
  )
}
