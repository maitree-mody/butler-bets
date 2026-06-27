'use client'
import { useActionState } from 'react'
import { setDisplayNameAction } from '@/app/actions/profile'

const inputCls = 'min-h-12 w-full border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none'

export default function OnboardingForm() {
  const [error, action, isPending] = useActionState(setDisplayNameAction, null)

  return (
    <form action={action} className="mt-7 flex flex-col gap-4">
      {error && (
        <p className="border-l-2 border-danger bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="display_name" className="mb-2 block text-sm font-semibold">
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
        <p className="mt-2 text-xs text-ink-faint">
          Max 30 characters. This is what other traders see on the leaderboard.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-12 bg-ink px-5 text-sm font-bold text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-faint"
      >
        {isPending ? 'Saving…' : 'Continue →'}
      </button>
    </form>
  )
}
