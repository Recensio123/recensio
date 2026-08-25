import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slåUppFeed, byggKalender } from '@/lib/kalenderfeed'

/*
 * Kalendern som Google, Outlook och iPhone hämtar.
 *
 * Öppen med flit. En kalenderprenumeration kan inte logga in — den hämtar
 * adressen som vilken sida som helst, utan cookie och utan möjlighet att svara
 * på en inloggningsfråga. Hemligheten ligger därför i adressen, som är 192
 * slumpade bitar och går att byta ut när som helst.
 *
 * Två följder av det, som båda är avsiktliga:
 *
 *   Ingen indexering. Adressen ska inte kunna dyka upp i en sökmotor för att
 *   någon råkat klistra in den på en sida.
 *
 *   Samma svar på en adress som inte finns som på en som aldrig funnits. Den
 *   som provar sig fram ska inte kunna se skillnad på "fel" och "återkallad".
 */

type Params = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params

  /* Bara det format vi själva skapar. base64url, och alltid samma längd. */
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return saknas()

  const admin = createAdminClient()
  const feed  = await slåUppFeed(admin, token)
  if (!feed) return saknas()

  const ics = await byggKalender(admin, feed.companyId, feed.staffId)
  if (ics === null) return saknas()

  /* Stämpeln säger om prenumerationen lever. En salong som undrar varför inget
     syns i telefonen får svaret av den — hämtar Google alls? Skrivningen får
     inte hålla upp svaret, och ett fel på den är inte värt att avbryta för. */
  void admin
    .from('calendar_feeds')
    .update({ last_read_at: new Date().toISOString() })
    .eq('token', token)
    .then(() => undefined, () => undefined)

  return new NextResponse(ics, {
    headers: {
      'Content-Type':        'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="bokningar.ics"',
      /* Klienterna hämtar ändå på sitt eget schema. Det här hindrar bara
         mellanlagring från att servera gårdagens tider. */
      'Cache-Control':       'no-store, max-age=0',
      'X-Robots-Tag':        'noindex, nofollow',
    },
  })
}

function saknas() {
  return new NextResponse('Not found', { status: 404 })
}
