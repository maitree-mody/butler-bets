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
            className={`group relative flex min-h-11 items-center px-3 text-sm font-medium transition-colors duration-150 ${
              active ? 'text-columbia' : 'text-foreground/70 hover:text-foreground'
            } ${mobile ? 'flex-1 justify-center' : ''}`}
          >
            {link.label}
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-columbia"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
