import { signInWithGoogle } from '@/app/actions/auth'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold">Sign in to Butler Bets</h1>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  )
}
