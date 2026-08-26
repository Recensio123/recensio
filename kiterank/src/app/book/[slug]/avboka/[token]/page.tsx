import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { AvbokaFlow, type Info } from './AvbokaFlow'

export const metadata: Metadata = {
  title: 'Avboka tid',
  robots: { index: false, follow: false },
}

/*
 * Ordet i adressen som betyder "visa sidan, hämta ingen bokning".
 *
 * Kollisionsfritt av sig självt: riktiga koder är hexadecimala, och `exempel`
 * innehåller bokstäver som inte finns i hex. En kund kan alltså aldrig råka få
 * den här sidan, och den kan aldrig råka avboka någons tid.
 */
const EXEMPEL = 'exempel'

export const dynamic = 'force-dynamic'

/*
 * Bokningen i förhandsvisningen.
 *
 * Två dagar fram och mitt på dagen — tillräckligt långt bort för att ligga
 * utanför varje rimlig avbokningsgräns, så salongen får se knappen och inte
 * rutan om att det är för sent. Den rutan syns i sitt eget läge; det är den
 * här skärmen de kommit för.
 */
function exempelbokning(salong: string): Info {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return {
    company:      salong,
    service:      'Klippning & styling',
    date:         `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    time:         '14:00',
    status:       'confirmed',
    cancellable:  true,
    cancel_hours: 24,
  }
}

/** Salongens namn, för remsan och kortet. Fel eller okänd slug ger ett neutralt
 *  namn i stället för en tom rubrik — förhandsvisningen ska aldrig falla. */
async function salongensNamn(slug: string): Promise<string> {
  try {
    const { data } = await createAdminClient()
      .from('companies').select('name').eq('slug', slug).maybeSingle()
    return (data?.name as string | null)?.trim() || 'Din salong'
  } catch {
    return 'Din salong'
  }
}

export default async function AvbokaPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params

  if (token === EXEMPEL) {
    return <AvbokaFlow slug={slug} token={token} exempel={exempelbokning(await salongensNamn(slug))} />
  }

  return <AvbokaFlow slug={slug} token={token} />
}
