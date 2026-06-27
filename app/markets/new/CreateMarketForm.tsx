'use client'

import { useActionState } from 'react'
import { createMarket } from '@/app/actions/markets'

const inputStyles = 'min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-accent focus:outline-none'

export function CreateMarketForm() {
  const [error, action, isPending] = useActionState(createMarket, null)

  return (
    <form action={action} className="mt-6 space-y-5">
      {error && <p className="rounded-lg border border-danger bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">{error}</p>}

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-4">
          <label htmlFor="question" className="text-sm font-semibold text-ink">Market question</label>
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
        <p className="mt-1.5 text-xs text-ink-soft">Phrase it so the outcome can resolve unambiguously.</p>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-4">
          <label htmlFor="description" className="text-sm font-semibold text-ink">Resolution criteria</label>
          <span className="text-xs text-ink-soft">Optional</span>
        </div>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Specify the source of truth and what counts as YES or NO."
          className={`${inputStyles} resize-y py-2.5 leading-6`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="closes_at" className="mb-1.5 block text-sm font-semibold text-ink">Closing date</label>
          <input id="closes_at" name="closes_at" type="datetime-local" required className={`${inputStyles} font-numeric`} />
        </div>
        <div>
          <label htmlFor="b" className="mb-1.5 block text-sm font-semibold text-ink">Liquidity</label>
          <input id="b" name="b" type="number" defaultValue={100} min={10} max={500} className={`${inputStyles} font-numeric`} />
          <p className="mt-1.5 text-xs text-ink-soft">Higher values reduce price movement.</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-ink-soft">Opens at 50¢ YES / 50¢ NO.</p>
        <button
          type="submit"
          disabled={isPending}
          className="pressable rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? 'Opening…' : 'Open market →'}
        </button>
      </div>
    </form>
  )
}
