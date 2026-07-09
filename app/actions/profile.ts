'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function validate(raw: string): string | null {
  const name = raw.trim()
  if (!name) return 'Display name cannot be blank.'
  if (name.length > 30) return 'Display name must be 30 characters or fewer.'
  return null
}

export async function setDisplayNameAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const raw = (formData.get('display_name') as string) ?? ''
  const err = validate(raw)
  if (err) return err

  const ageConfirmed = formData.get('age_confirmed') === 'on'
  if (!ageConfirmed) return 'You must be 18 or older to use Butler Bets.'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'You must be logged in.'

  const { error } = await supabase
    .from('users')
    .update({ display_name: raw.trim(), consented: true })
    .eq('id', user.id)

  if (error) return `Could not save: ${error.message}`

  redirect('/')
}

export async function updateDisplayNameAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const raw = (formData.get('display_name') as string) ?? ''
  const err = validate(raw)
  if (err) return err

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'You must be logged in.'

  const { error } = await supabase
    .from('users')
    .update({ display_name: raw.trim() })
    .eq('id', user.id)

  if (error) return `Could not save: ${error.message}`

  redirect('/profile')
}
