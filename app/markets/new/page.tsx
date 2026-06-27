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
      <main className="mx-auto max-w-xl px-8 py-16">
        <h1 className="font-display mb-12 text-6xl text-[#18181B]">New market</h1>
        <CreateMarketForm />
      </main>
    </>
  )
}
