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
        <div className="mx-auto max-w-xl">
          <header className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">New market</p>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink">Create a market</h1>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Frame a clear YES/NO question, define how it resolves, and set the closing date.
            </p>
          </header>
          <CreateMarketForm />
        </div>
      </main>
    </>
  )
}
