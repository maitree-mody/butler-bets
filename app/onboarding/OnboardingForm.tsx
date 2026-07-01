'use client'
import { useActionState } from 'react'
import { setDisplayNameAction } from '@/app/actions/profile'
import Alert from '@/app/components/ui/Alert'

const inputCls = 'min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-columbia focus:outline-none focus:ring-2 focus:ring-columbia/15'

export default function OnboardingForm() {
  const [error, action, isPending] = useActionState(setDisplayNameAction, null)

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      {error && <Alert tone="danger" role="alert">{error}</Alert>}

      <div>
        <label htmlFor="display_name" className="mb-1.5 block text-sm font-semibold text-foreground">
          Your name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          maxLength={30}
          autoFocus
          placeholder="e.g. Alex C."
          className={inputCls}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Max 30 characters. Visible on the leaderboard.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="pressable rounded-lg bg-columbia py-3 text-sm font-semibold text-white transition-colors hover:bg-columbia-deep disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? 'Saving…' : 'Continue →'}
      </button>
    </form>
  )
}
