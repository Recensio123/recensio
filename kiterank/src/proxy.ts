import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isOwnHost } from '@/lib/siteHost'

/*
 * Two jobs, decided by which address the request came in on.
 *
 * A salon's own domain: salongen.se arrives with that host and the path the
 * visitor typed — `/`, `/kontakt`, `/tjanster/balayage`. The site itself lives
 * at `/s/<slug>`, so the request is rewritten there internally. A rewrite and
 * not a redirect: the address bar keeps saying salongen.se, which is the whole
 * point of them having bought it. The host travels as the segment rather than
 * the slug, and the lookup that resolves it happens where every other site
 * lookup happens — cached, once per request — instead of putting a database
 * call in front of every asset on every page.
 *
 * Our own address: the signed-in half of the product stays behind the login.
 */

/** Paths that belong to the platform rather than to a customer's site. */
const PASS_THROUGH = [
  '/api', '/_next', '/book', '/auth', '/dashboard', '/onboarding',
  '/hub', '/site-editor', '/preview', '/favicon.ico',
]

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''

  /* ── A salon's own domain ─────────────────────────────────────────────── */
  if (host && !isOwnHost(host)) {
    const { pathname } = request.nextUrl
    const platform = PASS_THROUGH.some(p => pathname === p || pathname.startsWith(p + '/'))
    /* robots and sitemap answer per host and already know which; /s/ means the
       request has been rewritten already, or someone typed our internal
       address on their domain. */
    if (platform || pathname.startsWith('/s/') || pathname === '/robots.txt' || pathname === '/sitemap.xml') {
      return NextResponse.next()
    }
    const url = request.nextUrl.clone()
    url.pathname = `/s/${host.split(':')[0].toLowerCase()}${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  /* ── Our own address ──────────────────────────────────────────────────── */

  /* A customer page on the temporary address: tag the request with the path
     it asked for, so the site layout can 301 to the same page on the salon's
     own domain once one is verified. Public pages — no session work needed. */
  if (request.nextUrl.pathname.startsWith('/s/')) {
    const reqHeaders = new Headers(request.headers)
    reqHeaders.set('x-pathname', request.nextUrl.pathname)
    return NextResponse.next({ request: { headers: reqHeaders } })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  /* Everything except the files Next serves itself — a customer domain can
     ask for any path, so the host check above has to see them all. The Supabase
     session work still only happens on our own host. */
  matcher: ['/((?!_next/static|_next/image).*)'],
}
