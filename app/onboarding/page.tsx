import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', user.id)
    .single()

  if (profile?.display_name) redirect('/')

  return (
    <main className="flex min-h-screen items-start justify-center px-4 pt-24 sm:items-center sm:pt-0">
      <div className="w-full max-w-sm">
        <p className="font-display text-[1.35rem] font-medium tracking-[-0.035em] text-foreground">
          butler bets<span className="text-columbia">.</span>
        </p>

        <h1 className="page-title mt-8">Choose your display name.</h1>

        <p className="mt-4 text-base leading-7 text-muted-foreground">
          This is your trading identity on Butler Bets. It appears next to your
          balance on the leaderboard and can be changed later from your profile.
        </p>

        <OnboardingForm />
      </div>
    </main>
  )
}
