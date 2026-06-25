'use client'
import { useActionState } from 'react'
import { createMarket } from '@/app/actions/markets'

export function CreateMarketForm() {
  const [error, action, isPending] = useActionState(createMarket, null)

  return (
    <form action={action} className="flex flex-col gap-5">
      {error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="question" className="text-sm font-medium text-gray-800">
          Question <span className="text-red-500">*</span>
        </label>
        <input
          id="question"
          name="question"
          type="text"
          required
          maxLength={200}
          placeholder="Will X happen by Y date?"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-gray-800">
          Description
          <span className="ml-1 text-xs font-normal text-gray-400">optional</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Add context, resolution criteria, sources…"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="closes_at" className="text-sm font-medium text-gray-800">
          Closes at <span className="text-red-500">*</span>
        </label>
        <input
          id="closes_at"
          name="closes_at"
          type="datetime-local"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
        />
      </div>

      {/* Liquidity is a temporary advanced setting, de-emphasised until hidden pre-launch */}
      <div className="flex flex-col gap-1 border-t border-gray-100 pt-4">
        <label htmlFor="b" className="text-xs font-medium text-gray-400">
          Liquidity (b)
        </label>
        <input
          id="b"
          name="b"
          type="number"
          defaultValue={100}
          min={10}
          max={500}
          className="w-24 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-400 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
        />
        <p className="text-xs text-gray-400">
          Higher = more stable prices, lower = prices move faster
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {isPending ? 'Creating…' : 'Create market'}
      </button>
    </form>
  )
}
