import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import NavLinks from './NavLinks'

export default function Nav({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-canvas/95 backdrop-blur-md">
      <div className="page-shell flex h-14 items-stretch justify-between">
        <div className="flex items-stretch gap-6">
          <Link href="/" className="font-display flex min-h-11 items-center text-[1.35rem] font-medium tracking-[-0.035em] text-ink">
            butler bets<span className="text-accent">.</span>
          </Link>
          <NavLinks />
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden max-w-48 truncate text-xs text-ink-faint lg:block">{email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="min-h-11 px-1 text-xs font-semibold text-ink-soft underline decoration-transparent underline-offset-4 transition-colors hover:text-ink hover:decoration-line-strong"
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
