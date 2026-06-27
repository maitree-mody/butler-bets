import Link from 'next/link'
import { signOut } from '@/app/actions/auth'

export default function Nav({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[#EAE7E1] bg-[#FBFAF8]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-5">
        <Link
          href="/"
          className="font-display font-medium text-[1.6rem] leading-none tracking-tight text-[#18181B]"
        >
          butler bets
        </Link>
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            Markets
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm font-medium text-[#71717A] transition-colors hover:text-[#18181B]"
          >
            Leaderboard
          </Link>
          <span className="hidden max-w-[180px] truncate text-xs text-[#71717A] sm:block">
            {email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-[#71717A] transition-colors hover:text-[#18181B]"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
