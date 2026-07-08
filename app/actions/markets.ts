'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createMarket(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return 'You must be signed in to create a market.'

  const question = (formData.get('question') as string ?? '').trim()
  const description = (formData.get('description') as string ?? '').trim() || null
  const closesAtRaw = (formData.get('closes_at') as string ?? '').trim()
  if (!question) return 'Question is required.'
  if (question.length > 200) return 'Question must be 200 characters or fewer.'

  if (!closesAtRaw) return 'Closing date is required.'
  const closesAt = new Date(closesAtRaw)
  if (isNaN(closesAt.getTime()) || closesAt <= new Date()) {
    return 'Closing date must be in the future.'
  }

  const { data, error } = await supabase
    .from('markets')
    .insert({
      question,
      description,
      closes_at: closesAt.toISOString(),
      b: 100,
      q_yes: 0,
      q_no: 0,
      status: 'open',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return `Failed to create market: ${error.message}`

  await supabase.from('notifications').insert({
    user_id: user.id,
    type: 'market_created',
    title: 'Market live',
    body: `Your market '${question}' is live.`,
    market_id: data.id,
  })

  redirect(`/markets/${data.id}`)
}
