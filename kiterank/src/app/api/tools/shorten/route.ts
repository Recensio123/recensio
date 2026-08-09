import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  const token = process.env.BITLY_TOKEN
  if (!token || token === 'your_bitly_token') {
    return NextResponse.json({ error: 'Bitly token not set up yet — add BITLY_TOKEN to your .env.local' }, { status: 500 })
  }

  const res = await fetch('https://api-ssl.bitly.com/v4/shorten', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ long_url: url }),
  })

  const json = await res.json()

  if (!res.ok) {
    const msg = res.status === 403
      ? 'Invalid Bitly token — check BITLY_TOKEN in your .env.local'
      : (json.message ?? 'Bitly error')
    return NextResponse.json({ error: msg }, { status: res.status })
  }

  return NextResponse.json({ shortUrl: json.link })
}
