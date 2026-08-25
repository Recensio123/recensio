import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { platformAdmin } from '@/lib/admin'
import { arkiveraSajt, återställSajt } from '@/lib/sidarkiv'
import { clearSiteEverywhere } from '@/app/s/[slug]/site-data'

/*
 * Arkivera och återställ en kunds sajt.
 *
 * Bara plattformsadmin. Arkivet är ditt register över utfört arbete, och en
 * återställning skriver över något kundens besökare ser — det är ingen
 * inställning en salong ska kunna nå.
 */

export async function POST(req: NextRequest) {
  if (!(await platformAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const b = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  if (b.återställ) {
    const svar = await återställSajt(admin, String(b.återställ))
    if (!svar.ok) return NextResponse.json({ error: svar.skäl }, { status: 409 })

    /* Sajten är cachad. Utan det här ligger den gamla versionen kvar tills
       dygnsskyddet löper ut, och återställningen ser ut att inte ha hänt. */
    await clearSiteEverywhere(svar.companyId)
    return NextResponse.json({ ok: true, läge: 'återställd' })
  }

  if (!b.companyId) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const id = await arkiveraSajt(admin, String(b.companyId), {
    etikett:   typeof b.etikett === 'string' ? b.etikett : undefined,
    anledning: 'Sparad för hand',
  })

  if (!id) return NextResponse.json({ error: 'ingen_sajt' }, { status: 409 })
  return NextResponse.json({ ok: true, id })
}
