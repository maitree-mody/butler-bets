'use client'
import { useActionState } from 'react'
import { setDisplayNameAction } from '@/app/actions/profile'

const inputCls = 'min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-accent focus:outline-none'

export default function OnboardingForm() {
  const [error, action, isPending] = useActionState(setDisplayNameAction, null)

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-danger bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="display_name" className="mb-1.5 block text-sm font-semibold text-ink">
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
        <p className="mt-1.5 text-xs text-ink-soft">
          Max 30 characters. Visible on the leaderboard.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="pressable rounded-lg bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? 'Saving…' : 'Continue →'}
      </button>
    </form>
  )
}
