import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import '../../globals.css'
import { getPublishedSite } from './site-data'
import { siteOrigin, viaOwnDomain } from '@/lib/siteHost'
import { Matning } from '@/components/site/Matning'

/*
 * The customer's site — its own document, not a page inside ours.
 *
 * This is a second root layout. Everything under /s/<slug> hangs off it and
 * nothing above it, which is what lets the salon's own language sit on <html>
 * where a browser looks for it, and what gives these pages their own indexing
 * rule instead of inheriting ours.
 *
 * That rule: /s/<slug> is a temporary address. It works from the minute the
 * site exists — bookable, linked from the Google profile, shareable — but it
 * is not offered to the index. Rankings attach to the address Google found
 * them on, and value built on a temporary address is value that has to
 * migrate; built on the salon's own domain it is theirs from the first crawl.
 * So indexing is what connecting a domain switches on, and the moment one is
 * verified this address stops being a place at all: every request 301s to the
 * domain, carrying visitors and anything Google already knew straight there.
 */

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  return {
    /* Relative canonicals resolve against this, so it has to be the address
       the request came in on — a salon on their own domain whose canonicals
       resolved against kiterank.se would be pointing Google at us. */
    metadataBase: new URL(siteOrigin(slug)),
    /* On our address: temporary, so noindex. On theirs: nothing declared,
       which is what allows indexing. Set here once, inherited by every page
       under the site — no template can opt out by forgetting it. */
    ...(viaOwnDomain(slug) ? {} : { robots: { index: false, follow: false } }),
  }
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params:   Promise<{ slug: string }>
}) {
  const { slug } = await params
  /* The published record is read by the page too; both go through the same
     cached lookup, so this costs no second round trip. */
  const site = await getPublishedSite(slug)

  /* 301:an till salongens egen domän ligger inte längre här utan i varje sida,
     som `redirectToOwnDomain`. Den behövde sökvägen, och den fanns bara i en
     request-header — ett anrop som gjorde varenda kundsida omöjlig att cacha.
     Sidan vet sin egen väg utan att fråga. */

  return (
    <html
      lang={site?.content.siteLang || 'sv'}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full">
        {children}
        {/* Mätningen ligger i layouten och inte i sidorna, så den följer med
            varje sida salongen har utan att någon mall kan glömma den. Utan
            koppling till Google finns inget id, och då mäts ingenting alls —
            hellre det än en tagg som skriver till fel property.

            `bookingUrl` och inte `ctaHref`: den senare räknas ut inne i mallen
            och finns inte i sajtdatan, så den hade varit tom här och
            bokningsklicket aldrig mätts. `bookingUrl` sätter site-data alltid,
            och det är den adress varje boka-knapp i varje mall går till. */}
        {site?.mätId && (
          <Matning mätId={site.mätId} bokaHref={site.content.bookingUrl} />
        )}
      </body>
    </html>
  )
}
