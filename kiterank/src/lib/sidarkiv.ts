import type { createAdminClient } from '@/lib/supabase/admin'

/*
 * Arkivet över byggda sidor.
 *
 * En kopia av hela sajten — mall, språk, funktioner och innehåll — tagen vid
 * en tidpunkt och sparad för sig. Kopian och inte en referens: hela poängen är
 * att den ska överleva att originalet ändras eller raderas.
 *
 * Formgivning är arbete som utförts en gång. Att en kund ska behöva höra "den
 * är borta" om något de betalat för är ett sämre svar än vad det kostar att
 * spara en rad i en tabell.
 */

type Admin = ReturnType<typeof createAdminClient>

export type Arkivrad = {
  id:        string
  etikett:   string | null
  anledning: string | null
  template:  string | null
  skapad:    string
}

/**
 * Sparar hur sajten ser ut just nu.
 *
 * Returnerar id:t på kopian, eller null om företaget inte har någon sajt att
 * kopiera. Kastar aldrig — ett arkiv som fäller den händelse som utlöste det
 * vore sämre än inget arkiv.
 */
export async function arkiveraSajt(
  admin: Admin, companyId: string, om: { etikett?: string; anledning?: string } = {},
): Promise<string | null> {
  try {
    const { data: sajt } = await admin
      .from('site_config')
      .select('template, language, features, content')
      .eq('company_id', companyId)
      .maybeSingle()

    /* Ingen sajt, eller en tom — inget att spara. Att arkivera tomhet gör
       bara listan svårare att läsa den dag den behövs. */
    if (!sajt || !sajt.content) return null

    const { data, error } = await admin
      .from('site_arkiv')
      .insert({
        company_id: companyId,
        etikett:    om.etikett?.slice(0, 120) ?? null,
        anledning:  om.anledning?.slice(0, 200) ?? null,
        template:   sajt.template,
        language:   sajt.language,
        features:   sajt.features,
        content:    sajt.content,
      })
      .select('id')
      .single()

    if (error) return null
    return data.id as string
  } catch {
    return null
  }
}

/** Anledningen som markerar en automatisk kopia av en publicerad version. */
export const PUBLICERING = 'publicering'

/** Hur många publiceringskopior som sparas per kund. */
export const PUBLICERINGAR_KVAR = 5

/** Kortare tid än så mellan två sparningar räknas som samma redigering. */
const SESSION_MS = 30 * 60 * 1000

/**
 * Sparar den publicerade versionen efter en sparning i webbplatspanelen.
 *
 * Två saker håller antalet nere utan att göra historiken oanvändbar.
 *
 * Sparningar som ligger tätt räknas som samma redigering och skriver över
 * varandra. Någon som justerar en rubrik fem gånger på tio minuter gjorde en
 * ändring, inte fem, och fem rader i arkivet av det gör listan omöjlig att
 * läsa den dag den behövs.
 *
 * Äldre kopior gallras till de fem senaste. Kvar finns alltid minst ett steg
 * bakåt — vilket är hela poängen: den som råkat skriva över sin startsida ska
 * kunna få tillbaka gårdagens.
 *
 * Handsparade kopior och de som tas vid nedgradering rörs aldrig av gallringen.
 * De är avsiktliga, och det som är avsiktligt ska inte försvinna av sig självt.
 */
export async function arkiveraPublicering(admin: Admin, companyId: string): Promise<void> {
  try {
    const { data: sajt } = await admin
      .from('site_config')
      .select('template, language, features, content')
      .eq('company_id', companyId)
      .maybeSingle()
    if (!sajt?.content) return

    const nu = new Date()
    const kopia = {
      template: sajt.template, language: sajt.language,
      features: sajt.features, content: sajt.content,
      skapad: nu.toISOString(),
    }

    const { data: senaste } = await admin
      .from('site_arkiv')
      .select('id, skapad')
      .eq('company_id', companyId)
      .eq('anledning', PUBLICERING)
      .order('skapad', { ascending: false })
      .limit(1)
      .maybeSingle()

    const färsk = senaste
      && nu.getTime() - new Date(senaste.skapad as string).getTime() < SESSION_MS

    if (färsk) {
      await admin.from('site_arkiv').update(kopia).eq('id', senaste.id)
      return
    }

    await admin.from('site_arkiv').insert({
      company_id: companyId,
      etikett:    `Publicerad ${nu.toLocaleDateString('sv-SE')} ${nu.toLocaleTimeString('sv-SE').slice(0, 5)}`,
      anledning:  PUBLICERING,
      ...kopia,
    })

    /* Gallra till de senaste fem. Läses id:na först och raderas sedan explicit
       — en delete med offset finns inte, och en som räknar fel raderar fel. */
    const { data: alla } = await admin
      .from('site_arkiv')
      .select('id')
      .eq('company_id', companyId)
      .eq('anledning', PUBLICERING)
      .order('skapad', { ascending: false })

    const gamla = (alla ?? []).slice(PUBLICERINGAR_KVAR).map(r => r.id as string)
    if (gamla.length) await admin.from('site_arkiv').delete().in('id', gamla)
  } catch {
    /* Arkivet får aldrig fälla en sparning. Kunden som just tryckte Spara bryr
       sig om sin sida, inte om vår historik. */
  }
}

/**
 * Versionen kunden publicerade före den nuvarande.
 *
 * Den nyaste kopian är vad som ligger live just nu — den togs i samma ögonblick
 * som senaste sparningen. Ett steg bakåt är alltså den näst nyaste.
 */
export async function föregåendePublicering(
  admin: Admin, companyId: string,
): Promise<{ id: string; skapad: string } | null> {
  try {
    const { data } = await admin
      .from('site_arkiv')
      .select('id, skapad')
      .eq('company_id', companyId)
      .eq('anledning', PUBLICERING)
      .order('skapad', { ascending: false })
      .limit(2)

    const rad = (data ?? [])[1]
    return rad ? { id: rad.id as string, skapad: rad.skapad as string } : null
  } catch {
    return null
  }
}

/**
 * Skriver tillbaka en arkiverad version över kundens nuvarande sajt.
 *
 * Tar först en kopia av det som skrivs över. Den som återställer fel version
 * ska kunna ångra sig — annars byter man ett förlorat arbete mot ett annat.
 */
export async function återställSajt(
  admin: Admin, arkivId: string, om: { säkerhetskopia?: string } = {},
): Promise<{ ok: true; companyId: string } | { ok: false; skäl: string }> {
  const { data: kopia, error } = await admin
    .from('site_arkiv')
    .select('company_id, template, language, features, content')
    .eq('id', arkivId)
    .maybeSingle()

  if (error || !kopia) return { ok: false, skäl: 'hittades_inte' }
  const companyId = kopia.company_id as string

  /* Kunden som ångrar sin publicering gör i praktiken en ny publicering, och
     den kopian ska gallras som alla andra. Din återställning i admin är
     avsiktlig och sparas för alltid. */
  await arkiveraSajt(admin, companyId, {
    etikett:   'Före återställning',
    anledning: om.säkerhetskopia ?? 'Automatisk kopia av det som skrevs över',
  })

  const { error: skrivfel } = await admin
    .from('site_config')
    .update({
      template:   kopia.template,
      language:   kopia.language,
      features:   kopia.features,
      content:    kopia.content,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', companyId)

  if (skrivfel) return { ok: false, skäl: skrivfel.message }
  return { ok: true, companyId }
}
