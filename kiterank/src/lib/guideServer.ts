import type { createAdminClient } from '@/lib/supabase/admin'
import { sajtSteg } from '@/lib/komIgang'
import { CONTENT } from '@/lib/siteExampleContent'
import { baseIndustry } from '@/lib/industries'
import { guideSteg, type GuideSteg } from '@/lib/guide'

/*
 * Uppgifterna guiden bedömer, hämtade en gång.
 *
 * Sju frågor parallellt i stället för sju i följd. Guiden ritas överst på
 * startsidan, alltså på den sida en ny kund öppnar först och oftast — den får
 * inte vara det som gör att sidan känns långsam från dag ett.
 *
 * Bokningsfrågorna ställs alltid. Vilket upplägg kunden kör vet bara
 * webbläsaren, och att först fråga efter det hade gjort guiden till något som
 * laddar innan den ritas. Två läsningar mot indexerade kolumner är billigare än
 * en extra tur och retur.
 */

type Admin = ReturnType<typeof createAdminClient>

export async function hämtaGuide(
  admin: Admin, companyId: string, bransch?: string | null,
): Promise<GuideSteg[]> {
  const [cfg, conn, dom, co, tjänster, personal, mallar] = await Promise.all([
    admin.from('site_config').select('content').eq('company_id', companyId).maybeSingle(),
    admin.from('google_connections').select('refresh_token').eq('company_id', companyId).maybeSingle(),
    admin.from('custom_domains').select('domain')
      .eq('company_id', companyId).eq('is_primary', true).not('verified_at', 'is', null).maybeSingle(),
    admin.from('companies').select('review_url').eq('id', companyId).maybeSingle(),
    admin.from('services').select('id').eq('company_id', companyId).eq('aktiv', true).limit(1),
    admin.from('staff').select('id').eq('company_id', companyId).eq('is_active', true).limit(1),
    admin.from('message_templates').select('kind').eq('company_id', companyId).eq('enabled', true).limit(1),
  ])

  /* Branschens exempeltext, så att "har de skrivit sin egen Om oss" går att
     avgöra i stället för att gissa. Samma jämförelse som startsidans notis. */
  const innehåll = (cfg.data?.content ?? {}) as Parameters<typeof sajtSteg>[0]
  const standard = CONTENT[baseIndustry(bransch ?? 'other')] ?? CONTENT.other

  return guideSteg({
    sajt:          sajtSteg(innehåll, standard.aboutBody ?? ''),
    harTjänster:   Boolean(tjänster.data?.length),
    harPersonal:   Boolean(personal.data?.length),
    googleKopplat: Boolean(conn.data?.refresh_token),
    meddelandenPå: Boolean(mallar.data?.length),
    omdömeslänk:   Boolean((co.data?.review_url as string | null)?.trim()),
    egenDomän:     Boolean(dom.data?.domain),
  })
}
