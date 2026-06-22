import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('markets')
    .select('*', { count: 'exact', head: true })

  return (
    <main className="flex min-h-screen items-center justify-center">
      {error ? (
        <p className="text-red-500">DB error: {error.message}</p>
      ) : (
        <p className="text-2xl font-semibold">Markets in database: {count ?? 0}</p>
      )}
    </main>
  )
}
