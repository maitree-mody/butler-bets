import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_DOMAINS = ['columbia.edu', 'barnard.edu']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=Missing+auth+code', origin))
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(new URL('/login?error=Could+not+sign+in', origin))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const domain = (user?.email ?? '').split('@')[1] ?? ''

  if (!ALLOWED_DOMAINS.includes(domain)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(
      new URL('/login?error=Only+Columbia+and+Barnard+emails+are+allowed', origin)
    )
  }

  const { data: profile } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', user!.id)
    .single()

  if (!profile?.display_name) {
    return NextResponse.redirect(new URL('/onboarding', origin))
  }

  return NextResponse.redirect(new URL('/', origin))
}
