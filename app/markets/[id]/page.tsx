import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { priceYes } from '@/lib/lmsr'

export default async function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: market } = await supabase
    .from('markets')
    .select('id, question, description, closes_at, status, b, q_yes, q_no')
    .eq('id', id)
    .single()

  if (!market) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-lg text-gray-500">Market not found.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-blue-500 hover:underline">
          Back to markets
        </Link>
      </main>
    )
  }

  const yesProb = priceYes(Number(market.q_yes), Number(market.q_no), Number(market.b))
  const yesPct = Math.round(yesProb * 100)
  const noPct = 100 - yesPct
  const closeDate = new Date(market.closes_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link href="/" className="mb-6 inline-block text-sm text-gray-400 hover:text-gray-600">
        ← All markets
      </Link>

      <h1 className="mb-2 text-2xl font-semibold">{market.question}</h1>

      {market.description && (
        <p className="mb-6 text-gray-600">{market.description}</p>
      )}

      <div className="mb-6 flex gap-4">
        <div className="flex-1 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{yesPct}%</p>
          <p className="mt-1 text-sm text-green-700">YES</p>
        </div>
        <div className="flex-1 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-3xl font-bold text-red-500">{noPct}%</p>
          <p className="mt-1 text-sm text-red-600">NO</p>
        </div>
      </div>

      <div className="mb-8 flex items-center gap-4 text-sm text-gray-500">
        <span
          className={
            market.status === 'open'
              ? 'font-medium text-green-500'
              : market.status === 'closed'
                ? 'font-medium text-yellow-500'
                : 'font-medium text-gray-400'
          }
        >
          {market.status}
        </span>
        <span>Closes {closeDate}</span>
      </div>

      <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-400">
        <span className="mr-4">q_yes: {market.q_yes}</span>
        <span className="mr-4">q_no: {market.q_no}</span>
        <span>b: {market.b}</span>
      </div>
    </main>
  )
}
