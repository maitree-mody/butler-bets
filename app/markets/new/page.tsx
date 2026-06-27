import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/app/components/Nav'
import { CreateMarketForm } from './CreateMarketForm'

export default async function NewMarketPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <>
      <Nav email={user.email ?? ''} />
      <main className="page-shell py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_36rem] lg:gap-16">
          <header>
            <p className="eyebrow mb-4">Market desk</p>
            <h1 className="page-title">Create a market</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-ink-soft">
              Frame a question with a clear YES or NO outcome, define how it resolves, and set the closing bell.
            </p>
            <div className="mt-8 border-y border-line-strong py-4 text-sm text-ink-soft">
              <p className="font-semibold text-ink">Write for settlement, not debate.</p>
              <p className="mt-1 leading-6">The strongest markets are specific, time-bound, and independently verifiable.</p>
            </div>
          </header>
          <CreateMarketForm />
        </div>
      </main>
    </>
  )
}
