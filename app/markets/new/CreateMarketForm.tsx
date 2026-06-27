'use client'

import { useActionState } from 'react'
import { createMarket } from '@/app/actions/markets'

const inputStyles = 'min-h-12 w-full border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none'

export function CreateMarketForm() {
  const [error, action, isPending] = useActionState(createMarket, null)

  return (
    <form action={action} className="border-t border-line-strong">
      {error && <p className="mt-5 border-l-2 border-danger bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">{error}</p>}

      <div className="border-b py-5">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <label htmlFor="question" className="text-sm font-semibold">Market question</label>
          <span className="eyebrow text-danger">Required</span>
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
        <p className="mt-2 text-xs text-ink-faint">Phrase it so the outcome can resolve unambiguously.</p>
      </div>

      <div className="border-b py-5">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <label htmlFor="description" className="text-sm font-semibold">Resolution criteria</label>
          <span className="eyebrow">Optional</span>
        </div>
        <textarea
          id="description"
          name="description"
          rows={5}
          placeholder="Specify the source of truth and what counts as YES or NO."
          className={`${inputStyles} resize-y py-3 leading-6`}
        />
      </div>

      <div className="grid border-b sm:grid-cols-2">
        <div className="border-b py-5 sm:border-b-0 sm:border-r sm:pr-5">
          <label htmlFor="closes_at" className="mb-2 block text-sm font-semibold">Closing bell</label>
          <input id="closes_at" name="closes_at" type="datetime-local" required className={`${inputStyles} font-numeric`} />
        </div>
        <div className="py-5 sm:pl-5">
          <label htmlFor="b" className="mb-2 block text-sm font-semibold">Liquidity</label>
          <input id="b" name="b" type="number" defaultValue={100} min={10} max={500} className={`${inputStyles} font-numeric`} />
          <p className="mt-2 text-xs text-ink-faint">Higher values reduce price movement.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xs text-xs leading-5 text-ink-faint">New markets open at 50¢ YES / 50¢ NO.</p>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-12 bg-ink px-5 text-sm font-bold text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-faint"
        >
          {isPending ? 'Opening market…' : 'Open market →'}
        </button>
      </div>
    </form>
  )
}
