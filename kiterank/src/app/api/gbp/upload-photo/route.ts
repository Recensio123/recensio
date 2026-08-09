import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken, createMediaItem } from '@/lib/google'

const BUCKET = 'gbp-photos'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies').select('id').eq('user_id', user.id).single()
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  const { data: conn } = await admin
    .from('google_connections').select('gbp_location_id').eq('company_id', company.id).single()

  // Parse multipart form data
  const formData = await req.formData()
  const file     = formData.get('file')     as File   | null
  const category = formData.get('category') as string | null

  if (!file)                          return NextResponse.json({ error: 'File required' },           { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' },  { status: 400 })
  if (!category?.trim())              return NextResponse.json({ error: 'Category required' },        { status: 400 })

  // Mock mode — no real GBP connection yet
  if (!conn?.gbp_location_id) return NextResponse.json({ ok: true, mock: true })

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'Invalid token — reconnect Google' }, { status: 401 })

  // Ensure bucket exists (public so Google can fetch the staged URL)
  await admin.storage
    .createBucket(BUCKET, { public: true })
    .catch(() => { /* already exists */ })

  // Upload to Supabase Storage — unique path per company to avoid collisions
  const ext      = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const fileName = `${company.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error: storageError } = await admin.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: file.type })

  if (storageError) {
    console.error('[upload-photo] storage error', storageError)
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(fileName)

  try {
    // Hand the public URL to GBP — Google fetches and stores it on their servers
    const result = await createMediaItem(token, conn.gbp_location_id, publicUrl, category.trim())
    return NextResponse.json({ ok: true, item: result })
  } catch (err) {
    console.error('[upload-photo] GBP error', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'GBP upload failed' },
      { status: 500 },
    )
  } finally {
    // Google has already fetched the image — delete the staging file immediately
    await admin.storage.from(BUCKET).remove([fileName])
  }
}
