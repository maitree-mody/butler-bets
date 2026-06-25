import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreateMarketForm } from './CreateMarketForm'

export default async function NewMarketPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <h1 className="mb-8 text-2xl font-semibold text-gray-900">
          New market
        </h1>
        <CreateMarketForm />
      </div>
    </main>
  )
}
