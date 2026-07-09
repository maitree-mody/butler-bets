'use client'

import { useActionState } from 'react'
import { createMarket } from '@/app/actions/markets'
import Alert from '@/app/components/ui/Alert'

const inputStyles = 'min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-columbia focus:outline-none focus:ring-2 focus:ring-columbia/15'

const DESCRIPTION_EMPTY_MESSAGE = 'Describe exactly what counts as YES.'

export function CreateMarketForm() {
  const [error, action, isPending] = useActionState(createMarket, null)

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    e.target.setCustomValidity(e.target.value.trim() === '' ? DESCRIPTION_EMPTY_MESSAGE : '')
  }

  return (
    <form action={action} className="mt-6 space-y-5">
      {error && <Alert tone="danger" role="alert">{error}</Alert>}

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-4">
          <label htmlFor="question" className="text-sm font-semibold text-foreground">Market question</label>
          <span className="text-xs font-semibold text-danger">Required</span>
        </div>
        <input
          id="question"
          name="question"
          type="text"
          required
          maxLength={200}
          placeholder="Will the University Senate approve the proposal by May 1?"
          className={inputStyles}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">Phrase it so the outcome can resolve unambiguously.</p>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-4">
          <label htmlFor="description" className="text-sm font-semibold text-foreground">How will this resolve?</label>
          <span className="text-xs font-semibold text-danger">Required</span>
        </div>
        <p className="mb-1.5 text-xs text-muted-foreground">
          Describe exactly what counts as YES, so there&apos;s no argument later.
        </p>
        <textarea
          id="description"
          name="description"
          rows={4}
          required
          onChange={handleDescriptionChange}
          placeholder="Specify the source of truth and what counts as YES or NO."
          className={`${inputStyles} resize-y py-2.5 leading-6`}
        />
      </div>

      <div>
        <label htmlFor="closes_at" className="mb-1.5 block text-sm font-semibold text-foreground">Closing date</label>
        <input id="closes_at" name="closes_at" type="datetime-local" required className={`${inputStyles} font-numeric`} />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-5">
        <p className="text-xs text-muted-foreground">Opens at 50¢ YES / 50¢ NO.</p>
        <button
          type="submit"
          disabled={isPending}
          className="pressable rounded-lg bg-columbia px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-columbia-deep disabled:cursor-not-allowed disabled:bg-columbia/40 disabled:text-white/80"
        >
          {isPending ? 'Opening…' : 'Open market →'}
        </button>
      </div>
    </form>
  )
}
