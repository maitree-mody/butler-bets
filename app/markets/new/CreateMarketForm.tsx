'use client'
import { useActionState } from 'react'
import { createMarket } from '@/app/actions/markets'

export function CreateMarketForm() {
  const [error, action, isPending] = useActionState(createMarket, null)

  return (
    <form action={action} className="flex flex-col gap-6">
      {error && (
        <p className="rounded-lg bg-[#C0413B]/8 px-4 py-3 text-sm text-[#C0413B]">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="question" className="text-sm font-medium text-[#18181B]">
          Question <span className="text-[#C0413B]">*</span>
        </label>
        <input
          id="question"
          name="question"
          type="text"
          required
          maxLength={200}
          placeholder="Will X happen by Y date?"
          className="rounded-lg border border-[#EAE7E1] bg-[#FBFAF8] px-4 py-3 text-sm text-[#18181B] placeholder:text-[#71717A] focus:border-[#4A86C5] focus:outline-none focus:ring-2 focus:ring-[#4A86C5]/15"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-medium text-[#18181B]">
          Description
          <span className="ml-2 text-sm font-normal text-[#71717A]">optional</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Add context, resolution criteria, sources…"
          className="rounded-lg border border-[#EAE7E1] bg-[#FBFAF8] px-4 py-3 text-sm text-[#18181B] placeholder:text-[#71717A] focus:border-[#4A86C5] focus:outline-none focus:ring-2 focus:ring-[#4A86C5]/15"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="closes_at" className="text-sm font-medium text-[#18181B]">
          Closes at <span className="text-[#C0413B]">*</span>
        </label>
        <input
          id="closes_at"
          name="closes_at"
          type="datetime-local"
          required
          className="rounded-lg border border-[#EAE7E1] bg-[#FBFAF8] px-4 py-3 text-sm text-[#18181B] focus:border-[#4A86C5] focus:outline-none focus:ring-2 focus:ring-[#4A86C5]/15"
        />
      </div>

      {/* Liquidity is a temporary advanced setting, de-emphasised until hidden pre-launch */}
      <div className="flex flex-col gap-2 border-t border-[#EAE7E1] pt-5">
        <label htmlFor="b" className="text-xs font-medium text-[#71717A]">
          Liquidity (b)
        </label>
        <input
          id="b"
          name="b"
          type="number"
          defaultValue={100}
          min={10}
          max={500}
          className="w-24 rounded-lg border border-[#EAE7E1] bg-[#FBFAF8] px-3 py-2 text-xs text-[#71717A] focus:border-[#4A86C5] focus:outline-none"
        />
        <p className="text-xs text-[#71717A]">
          Higher = more stable prices, lower = prices move faster
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#4A86C5] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isPending ? 'Creating…' : 'Create market'}
      </button>
    </form>
  )
}
