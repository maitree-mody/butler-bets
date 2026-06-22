import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { count, error } = await supabase
    .from('markets')
    .select('*', { count: 'exact', head: true })

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <p className="text-gray-600">Signed in as {user.email}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
          >
            Sign out
          </button>
        </form>
        {error ? (
          <p className="text-red-500">DB error: {error.message}</p>
        ) : (
          <p className="text-2xl font-semibold">Markets in database: {count ?? 0}</p>
        )}
      </div>
    </main>
  )
}
