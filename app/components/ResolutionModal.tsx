'use client'

import { useNotifications } from './NotificationsProvider'

export default function ResolutionModal() {
  const { notifications, markOneRead } = useNotifications()

  // Newest unread market_resolved notification — the one we pop up for.
  const target = notifications.find(n => n.type === 'market_resolved' && !n.read) ?? null
  if (!target) return null

  const isWin = target.crowns_change > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'oklch(0.22 0.05 260 / 0.4)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className={`w-full max-w-sm rounded-2xl border bg-card p-8 shadow-xl ${
          isWin ? 'border-success/40' : 'border-border'
        }`}
      >
        <div className="flex flex-col items-center text-center gap-3">
          {isWin ? (
            <>
              <span className="text-5xl leading-none">🎉</span>
              <h2 className="font-display text-2xl font-bold text-success">You won!</h2>
            </>
          ) : (
            <>
              <span className="text-5xl leading-none">📊</span>
              <h2 className="font-display text-2xl font-bold text-foreground">Market resolved</h2>
            </>
          )}

          {/* Body carries the full story: crowns + market question + resolution outcome */}
          <p className={`text-sm leading-relaxed ${isWin ? 'text-success/80' : 'text-foreground/75'}`}>
            {target.body}
          </p>

          <button
            onClick={() => markOneRead(target.id)}
            className={`pressable mt-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
              isWin
                ? 'bg-success hover:opacity-90'
                : 'bg-columbia hover:bg-columbia-deep'
            }`}
          >
            {isWin ? 'Collect crowns' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  )
}
