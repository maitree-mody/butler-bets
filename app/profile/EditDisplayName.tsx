'use client'
import { useActionState } from 'react'
import { updateDisplayNameAction } from '@/app/actions/profile'

const inputCls = 'min-h-12 w-full border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none'

export default function EditDisplayName({ current }: { current: string | null }) {
  const [error, action, isPending] = useActionState(updateDisplayNameAction, null)

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          maxLength={30}
          defaultValue={current ?? ''}
          placeholder="Your display name"
          aria-label="Display name"
          className={inputCls}
        />
        {error && (
          <p className="mt-1.5 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="min-h-12 whitespace-nowrap border border-line-strong bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:text-ink-faint"
      >
        {isPending ? 'Saving…' : 'Save name'}
      </button>
    </form>
  )
}
