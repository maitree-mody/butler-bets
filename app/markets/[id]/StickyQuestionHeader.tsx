'use client'

import { useEffect, useRef, useState } from 'react'

export default function StickyQuestionHeader({ question, yesPct }: { question: string; yesPct: number }) {
  const [pastHeading, setPastHeading] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = headingRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setPastHeading(!entry.isIntersecting),
      { rootMargin: '-56px 0px 0px 0px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <h1
        ref={headingRef}
        className="font-display mt-1 text-lg font-bold leading-snug tracking-tight text-columbia-deep sm:text-xl"
      >
        {question}
      </h1>

      <div
        aria-hidden={!pastHeading}
        className={`fixed left-1/2 top-14 z-10 w-full max-w-7xl -translate-x-1/2 px-6 transition-[opacity,transform] duration-300 ease-out ${
          pastHeading ? 'translate-y-0 opacity-100' : '-translate-y-2 pointer-events-none opacity-0'
        }`}
      >
        <div className="flex items-center gap-3 rounded-b-xl border border-t-0 border-white/10 bg-columbia-deep/95 px-4 py-2 text-white shadow-sm backdrop-blur-sm">
          <p className="min-w-0 flex-1 truncate font-display text-sm font-semibold">{question}</p>
          <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
            YES {yesPct}%
          </span>
        </div>
      </div>
    </>
  )
}
