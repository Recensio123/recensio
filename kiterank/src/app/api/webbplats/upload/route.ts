import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/*
 * Image uploads for the website editor.
 *
 * Article photos are the reason this exists. A salon showing a summer-styling
 * series uploads a dozen photos per article, and storing those inline in the
 * site_config row would put every byte into the HTML of the published page —
 * a page that then loads megabytes before showing a word. Files live in
 * storage; the site content keeps a URL.
 */

const BUCKET   = 'site-media'
const MAX_SIZE = 8 * 1024 * 1024

/* Fonts ride the same route as images — a customer's brand font is just
   another site asset. Only real font containers are accepted. */
const FONT_TYPES: Record<string, string> = {
  woff2: 'font/woff2',
  woff:  'font/woff',
  ttf:   'font/ttf',
  otf:   'font/otf',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies').select('id').eq('user_id', user.id).single()
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file)                return NextResponse.json({ error: 'Ingen fil' },        { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Filen är för stor' }, { status: 400 })

  const fontExt = (file.name.split('.').pop() ?? '').toLowerCase()
  const isImage = file.type.startsWith('image/')
  const isFont  = fontExt in FONT_TYPES
  if (!isImage && !isFont) {
    return NextResponse.json({ error: 'Filen måste vara en bild eller en typsnittsfil (WOFF2, WOFF, TTF, OTF)' }, { status: 400 })
  }

  // Public bucket: the customer's site is public, so its assets are too
  await admin.storage
    .createBucket(BUCKET, { public: true })
    .catch(() => { /* already exists */ })

  const ext         = isFont ? fontExt : file.type === 'image/png' ? 'png' : 'jpg'
  const contentType = isFont ? FONT_TYPES[fontExt] : file.type
  const fileName    = `${company.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer      = Buffer.from(await file.arrayBuffer())

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType, cacheControl: '31536000' })

  if (error) {
    console.error('[webbplats/upload] storage error', error)
    return NextResponse.json({ error: 'Uppladdningen misslyckades' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(fileName)
  return NextResponse.json({ url: publicUrl })
}
