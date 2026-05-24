import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase'
import { encrypt } from '@/lib/crypto'

const ConfigSchema = z.object({
  elks_username: z.string().optional(),
  elks_password: z.string().optional(),
  postmark_token: z.string().optional(),
  active: z.boolean().optional(),
  plan: z.enum(['starter', 'pro', 'growth']).optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const parsed = ConfigSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const updates: Record<string, unknown> = {}

  if (parsed.data.elks_username) updates.elks_username = parsed.data.elks_username
  if (parsed.data.elks_password) updates.elks_password_enc = encrypt(parsed.data.elks_password)
  if (parsed.data.postmark_token) updates.postmark_token_enc = encrypt(parsed.data.postmark_token)
  if (parsed.data.active !== undefined) updates.active = parsed.data.active
  if (parsed.data.plan) updates.plan = parsed.data.plan

  const { data, error } = await admin
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
