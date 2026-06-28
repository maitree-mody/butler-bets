'use client'
import { useActionState } from 'react'
import { updateDisplayNameAction } from '@/app/actions/profile'

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
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-columbia focus:outline-none focus:ring-2 focus:ring-columbia/15"
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
        className="pressable min-h-11 whitespace-nowrap rounded-lg border border-columbia/30 bg-columbia-soft px-5 text-sm font-semibold text-columbia transition-colors hover:border-columbia hover:bg-columbia hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Save name'}
      </button>
    </form>
  )
}
