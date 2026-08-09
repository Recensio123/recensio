import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Default services per industry — seeded into booking_services on setup
const DEFAULT_SERVICES: Record<string, { name: string; description: string; duration_minutes: number; price_sek: number }[]> = {
  salon: [
    { name: 'Klippning & styling',   description: 'Professionell klippning för alla hårtyper',          duration_minutes: 60,  price_sek: 850  },
    { name: 'Balayage',              description: 'Naturliga, solkyssade highlights',                   duration_minutes: 150, price_sek: 2200 },
    { name: 'Highlights',            description: 'Klassiska highlights med folieteknik',               duration_minutes: 120, price_sek: 1800 },
    { name: 'Färgning hel',          description: 'Heltäckande hårfärg',                               duration_minutes: 90,  price_sek: 1400 },
    { name: 'Slingor och klipp',     description: 'Kombinerat paket med slingor och klippning',        duration_minutes: 180, price_sek: 2800 },
  ],
  spa: [
    { name: 'Klassisk massage',      description: 'Avslappnande helkroppsmassage',                     duration_minutes: 60,  price_sek: 950  },
    { name: 'Djupvävnadsmassage',    description: 'Intensiv massage för muskeltrötthet',               duration_minutes: 60,  price_sek: 1100 },
    { name: 'Ansiktsbehandling',     description: 'Djuprengörande och återfuktande',                   duration_minutes: 60,  price_sek: 1050 },
    { name: 'Hotstone massage',      description: 'Massage med varma vulkanstenar',                    duration_minutes: 75,  price_sek: 1350 },
  ],
  beauty: [
    { name: 'Fransförlängning',      description: 'Individuell förlängning för fylligare fransar',     duration_minutes: 120, price_sek: 1200 },
    { name: 'Manikyr',               description: 'Nagelvård och lackering',                           duration_minutes: 45,  price_sek: 450  },
    { name: 'Pedikyr',               description: 'Fotvård och lackering',                             duration_minutes: 60,  price_sek: 550  },
    { name: 'Ögonbrynsstyling',      description: 'Formning och färgning av ögonbryn',                duration_minutes: 30,  price_sek: 350  },
  ],
  fitness: [
    { name: 'Gruppass 60min',          description: 'Grupträningspass för alla nivåer',               duration_minutes: 60,  price_sek: 200  },
    { name: 'Gruppass 45min',          description: 'Kortare intensivpass i grupp',                   duration_minutes: 45,  price_sek: 150  },
    { name: 'Personlig träning',       description: 'Individuellt anpassat träningspass',             duration_minutes: 60,  price_sek: 850  },
    { name: 'Kostrådgivning',          description: 'Individuell genomgång av kost och mål',         duration_minutes: 60,  price_sek: 750  },
  ],
  craftsman: [
    { name: 'Kostnadsfri offert',      description: 'Besök och genomgång inför offert',              duration_minutes: 60,  price_sek: 0    },
    { name: 'Snickeriarbete',          description: 'Anpassat snickeriarbete per timme',             duration_minutes: 60,  price_sek: 950  },
    { name: 'Målning',                 description: 'Målningsarbete inomhus eller utomhus',          duration_minutes: 120, price_sek: 1800 },
    { name: 'VVS-service',             description: 'Reparation och installation av rör och kranar', duration_minutes: 90,  price_sek: 1500 },
    { name: 'Plattsättning & golv',    description: 'Kakel, klinker och golvläggning',               duration_minutes: 120, price_sek: 1600 },
    { name: 'Montering & installation',description: 'Möbel- eller byggmontering',                    duration_minutes: 90,  price_sek: 1200 },
  ],
}

// Default availability: Mon–Sat 09:00–18:00, Sundays closed
const DEFAULT_AVAILABILITY = [1,2,3,4,5,6].map(day => ({
  day_of_week:           day,
  open_time:             '09:00:00',
  close_time:            '18:00:00',
  slot_duration_minutes: 30,
  is_active:             true,
})).concat([{
  day_of_week:           0,
  open_time:             '09:00:00',
  close_time:            '18:00:00',
  slot_duration_minutes: 30,
  is_active:             false,
}])

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { industry, template, features, language, bizName, slug } = await req.json()

  if (!bizName?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: 'Missing bizName or slug' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Check if user already has a company (retry after partial failure)
  const { data: existingCompany } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  let company: { id: string } | null = existingCompany

  if (!existingCompany) {
    // Check slug uniqueness only when creating a new company
    const { data: slugTaken } = await admin
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (slugTaken) {
      return NextResponse.json({ error: 'Adressen är redan tagen. Välj en annan.' }, { status: 409 })
    }

    const { data: newCompany, error: companyErr } = await admin
      .from('companies')
      .insert({
        user_id:    user.id,
        name:       bizName.trim(),
        slug:       slug.trim(),
        industry,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (companyErr) return NextResponse.json({ error: companyErr.message }, { status: 500 })
    company = newCompany
  }

  if (!company) return NextResponse.json({ error: 'Kunde inte skapa företag.' }, { status: 500 })

  // Upsert site_config (safe to retry if previous attempt partially failed)
  const { error: configErr } = await admin
    .from('site_config')
    .upsert({
      company_id: company.id,
      template,
      language,
      features,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })

  if (configErr) return NextResponse.json({ error: configErr.message }, { status: 500 })

  // Seed default booking services if booking feature is enabled
  if (features?.booking) {
    const services = DEFAULT_SERVICES[industry] ?? DEFAULT_SERVICES.salon
    await admin
      .from('booking_services')
      .insert(services.map((s, i) => ({ ...s, company_id: company.id, sort_order: i })))
  }

  // Seed default weekly availability
  await admin
    .from('booking_availability')
    .insert(DEFAULT_AVAILABILITY.map(a => ({ ...a, company_id: company.id })))

  return NextResponse.json({ ok: true, companyId: company.id, slug })
}
