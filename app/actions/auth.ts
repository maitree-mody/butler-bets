'use server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signInWithGoogle() {
  const supabase = await createClient()

  // NEXT_PUBLIC_SITE_URL must be set in Vercel env vars (e.g. https://butler-bets.vercel.app).
  // Falls back to the incoming Host header for local dev.
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    const headersList = await headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    siteUrl = `${protocol}://${host}`
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl}/auth/callback` },
  })

  if (error || !data.url) {
    redirect('/login?error=Could+not+authenticate+with+Google')
  }

  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
