import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSiteDraft } from '@/lib/siteTemplates'
import { clearSiteCache, clearSiteAddress } from '@/app/s/[slug]/site-data'
import { isClosed } from '@/lib/accountStatus'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  /* Avslutat avtal skriver ingenting. Den här routen hämtar företaget på egen
     hand i stället för genom currentAccess, så grinden måste stå här också —
     annars kan en kvarglömd session spara i en panel som inte går att öppna. */
  if (await isClosed(admin, company.id)) {
    return NextResponse.json({ error: 'Avtalet är avslutat' }, { status: 403 })
  }

  const body = await req.json()
  const { content, template, slug, about, industry } = body

  /* The setup flow sends the customer's answers rather than a whole site.
   * Merged here, on the server, where the current content is known: their
   * words fill the fields they have not already written themselves, so
   * running setup again can never overwrite real editing work. */
  if (about && !content) {
    const { data: cfg } = await admin
      .from('site_config')
      .select('content')
      .eq('company_id', company.id)
      .maybeSingle()

    const current = (cfg?.content ?? {}) as Record<string, unknown>
    const { data: co } = await admin.from('companies').select('name').eq('id', company.id).single()
    const seeded = buildSiteDraft(about, industry ?? 'salon', co?.name ?? '')
    const merged: Record<string, unknown> = { ...current }
    for (const [key, value] of Object.entries(seeded)) {
      if (value && !current[key]) merged[key] = value
    }

    const { error } = await admin
      .from('site_config')
      .update({ content: merged, updated_at: new Date().toISOString() })
      .eq('company_id', company.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, seeded: Object.keys(seeded) })
  }

  /* Address change: the slug is the site's identity on Google, so a rename
   * must be deliberate — validated, unique, and with the old address kept
   * for permanent redirects. */
  let newSlug: string | undefined
  if (typeof slug === 'string' && slug.trim()) {
    const normalized = slug
      .toLowerCase()
      .replace(/[åä]/g, 'a').replace(/ö/g, 'o')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (normalized.length < 3) {
      return NextResponse.json({ error: 'Adressen måste vara minst 3 tecken (a–z, 0–9 och bindestreck)' }, { status: 400 })
    }
    const { data: current } = await admin
      .from('companies').select('slug').eq('id', company.id).single()

    if (current && normalized !== current.slug) {
      const { data: taken } = await admin
        .from('companies').select('id').eq('slug', normalized).neq('id', company.id).maybeSingle()
      if (taken) {
        return NextResponse.json({ error: 'Adressen är upptagen — välj en annan' }, { status: 409 })
      }
      const { error: slugError } = await admin
        .from('companies').update({ slug: normalized }).eq('id', company.id)
      if (slugError) return NextResponse.json({ error: slugError.message }, { status: 500 })
      newSlug = normalized

      // Remember the old address for redirects. Best effort: on databases
      // where the migration hasn't run yet, the rename still succeeds.
      try {
        const { data: prev } = await admin
          .from('companies').select('old_slugs').eq('id', company.id).single()
        const oldSlugs: string[] = Array.isArray(prev?.old_slugs) ? prev.old_slugs : []
        if (current.slug && !oldSlugs.includes(current.slug)) {
          await admin.from('companies')
            .update({ old_slugs: [...oldSlugs.filter(s => s !== normalized), current.slug] })
            .eq('id', company.id)
        }
      } catch { /* old_slugs column not migrated yet — redirects start working after */ }
    } else {
      newSlug = current?.slug
    }
  }

  const { error } = await admin
    .from('site_config')
    .update({
      content,
      // Only when the editor sends one — a missing field must never blank it
      ...(typeof template === 'string' && template ? { template } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', company.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  /*
   * Sajten är cachad. Utan det här anropet ligger den gamla versionen kvar
   * tills dygnsskyddet löper ut, och kunden ser sin sparning först nästa dag.
   *
   * Ett anrop räcker för alla deras adresser — /s/<slug>, deras egen domän och
   * varje undersida bär samma etikett. Bytte de adress rensas den gamla också,
   * annars svarar den kvar med sajten i stället för att skicka vidare. */
  clearSiteCache(company.id)
  if (newSlug) clearSiteAddress(newSlug)

  return NextResponse.json({ ok: true, ...(newSlug ? { slug: newSlug } : {}) })
}
