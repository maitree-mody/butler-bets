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
          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-8">
            <header className="mb-7">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">New market</p>
              <h1 className="font-display mt-2 text-2xl font-bold tracking-tight text-columbia-deep sm:text-3xl">
                Create a market
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Frame a clear YES/NO question, define resolution criteria, and set the closing date.
              </p>
            </header>
            <CreateMarketForm />
          </div>
        </div>
      </main>
    </>
  )
}
