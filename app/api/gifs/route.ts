import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GIPHY_BASE = 'https://api.giphy.com/v1/gifs'

type GiphyImage = { url: string }
type GiphyGif = {
  id: string
  title: string
  images: {
    fixed_width_small?: GiphyImage
    fixed_width?: GiphyImage
    original?: GiphyImage
  }
}

// Proxies GIPHY search/trending server-side so the API key never reaches the
// browser bundle. Requires a session (not a public endpoint) purely to keep
// our free Giphy quota from being burned by anonymous scripted requests.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 })
  }

  const apiKey = process.env.GIPHY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GIF search is not configured yet.' }, { status: 503 })
  }

  const query = request.nextUrl.searchParams.get('q')?.trim()
  const params = new URLSearchParams({ api_key: apiKey, limit: '24', rating: 'pg-13' })
  if (query) params.set('q', query)
  const endpoint = `${GIPHY_BASE}/${query ? 'search' : 'trending'}?${params.toString()}`

  const res = await fetch(endpoint)
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch GIFs.' }, { status: 502 })
  }

  const json = (await res.json()) as { data: GiphyGif[] }
  const gifs = json.data.map((g) => ({
    id: g.id,
    title: g.title,
    previewUrl: g.images.fixed_width_small?.url ?? g.images.fixed_width?.url ?? g.images.original?.url ?? '',
    fullUrl: g.images.original?.url ?? g.images.fixed_width?.url ?? '',
  }))

  return NextResponse.json({ gifs })
}
