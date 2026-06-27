'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Markets' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
]

export default function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Primary" className={mobile ? 'flex h-11 items-stretch' : 'hidden items-stretch sm:flex'}>
      {links.map((link) => {
        const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex min-h-11 items-center px-4 text-[0.8125rem] font-semibold transition-colors ${
              active ? 'text-ink' : 'text-ink-soft hover:text-ink'
            } ${mobile ? 'flex-1 justify-center' : ''}`}
          >
            {link.label}
            <span
              aria-hidden="true"
              className={`absolute inset-x-4 bottom-0 h-px bg-accent transition-transform ${
                active ? 'scale-x-100' : 'scale-x-0'
              }`}
            />
          </Link>
        )
      })}
    </nav>
  )
}
