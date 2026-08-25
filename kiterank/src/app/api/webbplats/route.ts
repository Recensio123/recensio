import { NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { buildSiteDraft } from '@/lib/siteTemplates'
import { clearSiteCache } from '@/app/s/[slug]/site-data'
import { isClosed } from '@/lib/accountStatus'
import { arkiveraPublicering } from '@/lib/sidarkiv'

export async function PATCH(req: Request) {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin   = c.admin
  const company = { id: c.id }
/* Avslutat avtal skriver ingenting. Den här routen hämtar företaget på egen
     hand i stället för genom currentAccess, så grinden måste stå här också —
     annars kan en kvarglömd session spara i en panel som inte går att öppna. */
  if (await isClosed(admin, company.id)) {
    return NextResponse.json({ error: 'Avtalet är avslutat' }, { status: 403 })
  }

  const body = await req.json()
  const { content, template, about, industry } = body

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
  /* Inget adressbyte här.
   *
   * Panelen slutade erbjuda det när adressen blev tillfällig och noindexerad,
   * men routen fortsatte ta emot ett slug-fält — så regeln fanns bara i
   * gränssnittet. En regel som bara finns i gränssnittet är ingen regel: ett
   * anrop förbi panelen kunde döpa om sajten ändå och bryta varje länk kunden
   * redan delat. Adressen sätts av servern vid registreringen och ändras inte. */

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
   * varje undersida bär samma etikett. */
  clearSiteCache(company.id)

  /*
   * En kopia av den nyss publicerade versionen.
   *
   * Sparningen här är publiceringen — sajten ligger live på samma innehåll —
   * så det här är enda tillfället då vi säkert vet hur en liveversion såg ut.
   * Kopian gör två saker: den ger kunden en väg tillbaka från en sparning de
   * ångrar, och den betyder att formgivning vi utfört aldrig kan gå förlorad
   * genom att någon skriver över den.
   *
   * Efter svaret hade varit snyggare, men en serverlös funktion får inte
   * fortsätta arbeta efter att den svarat. Kostnaden är några tiondelar på en
   * sparning; alternativet är kopior som ibland uteblir.
   */
  await arkiveraPublicering(admin, company.id)

  return NextResponse.json({ ok: true })
}