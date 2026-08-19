import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { encrypt, decrypt } from '@/lib/crypto'

const Schema = z.object({
  url:     z.string().url(),
  api_key: z.string().min(1),
})

async function getIds(userId: string) {
  const admin = createSupabaseAdminClient()
  const { data } = await admin.from('users').select('company_id').eq('id', userId).single()
  return { admin, companyId: data?.company_id as string | undefined }
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { admin, companyId } = await getIds(user.id)
  if (!companyId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data } = await admin
    .from('integrations')
    .select('config')
    .eq('company_id', companyId)
    .eq('type', 'webhook')
    .filter('config->>purpose', 'eq', 'discount')
    .maybeSingle()

  if (!data) return NextResponse.json({ url: '', connected: false })

  const cfg = data.config as { url: string; api_key_enc: string }
  return NextResponse.json({ url: cfg.url, connected: true })
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { admin, companyId } = await getIds(user.id)
  if (!companyId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const config = {
    purpose:     'discount',
    url:         parsed.data.url,
    api_key_enc: encrypt(parsed.data.api_key),
  }

  // Upsert — uppdatera om den finns, annars skapa ny
  const { data: existing } = await admin
    .from('integrations')
    .select('id')
    .eq('company_id', companyId)
    .eq('type', 'webhook')
    .filter('config->>purpose', 'eq', 'discount')
    .maybeSingle()

  if (existing) {
    await admin.from('integrations').update({ config, active: true }).eq('id', existing.id)
  } else {
    await admin.from('integrations').insert({ company_id: companyId, type: 'webhook', config, active: true })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { admin, companyId } = await getIds(user.id)
  if (!companyId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await admin
    .from('integrations')
    .delete()
    .eq('company_id', companyId)
    .eq('type', 'webhook')
    .filter('config->>purpose', 'eq', 'discount')

  return NextResponse.json({ ok: true })
}

// Hjälpfunktion: hämta en rabattkod från företagets API
export async function fetchDiscountCode(companyId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('integrations')
    .select('config')
    .eq('company_id', companyId)
    .eq('type', 'webhook')
    .eq('active', true)
    .filter('config->>purpose', 'eq', 'discount')
    .maybeSingle()

  if (!data) return null

  const cfg = data.config as { url: string; api_key_enc: string }
  try {
    const apiKey = decrypt(cfg.api_key_enc)
    const res = await fetch(cfg.url, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.code ?? json.discount_code ?? json.coupon ?? null
  } catch {
    return null
  }
}
