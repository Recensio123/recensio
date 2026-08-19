'use client'
import type { Template } from '@/lib/templates'
import type { SiteContent } from '@/components/site/PreviewSite'
import { ServicePage } from '@/components/site/ServicePage'
import { SectionPageBody } from '@/components/SectionPageBody'
import { BlocksBody } from '@/components/ArticleBody'
import { sectionPageTitle, sectionPageBlocks, type SectionPageId } from '@/lib/sectionPages'

/*
 * The own pages, inside the editor's preview.
 *
 * Half the site lives on its own pages — the price page, om oss, the
 * articles — and until this, the editor only ever showed the start page.
 * Rendered by the same components the public pages use, so what the tab
 * shows is what a visitor gets, and every picture and heading on it answers
 * to the same click-to-edit as the start page.
 */

const F = 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'

export function SubpagePreview({ page, template, content, industry, siteRoot }: {
  page:     Exclude<SectionPageId, never>
  template: Template
  content:  SiteContent
  industry: string
  siteRoot?: string
}) {
  const c = template.colors

  /* The price page is a whole composition of its own — reuse it outright. */
  if (page === 'pricelist') {
    return (
      <div data-edit="pricelist" style={{ display: 'contents' }}>
        <ServicePage template={template} industry={industry} content={content} basePath={siteRoot} />
      </div>
    )
  }

  const title = sectionPageTitle(content, page)
  const extra = sectionPageBlocks(content, page, industry)
  const panel = page === 'blog' ? 'articles' : page

  return (
    <div data-edit={panel} style={{ display: 'contents' }}>
      <div style={{ background: c.bg, minHeight: 720, fontFamily: F }}>
        {/* The same slim bar the public subpages carry */}
        <nav style={{ background: c.nav, padding: '18px 8%', borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
          <span style={{ color: c.h, fontWeight: 800, fontSize: 16, fontFamily: F }}>{content.businessName}</span>
        </nav>
        <main style={{ maxWidth: page === 'blog' ? 1000 : 760, margin: '0 auto', padding: '64px 24px 96px' }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: c.h, letterSpacing: -1, marginBottom: 24, fontFamily: F }}>
            {title}
          </h1>
          {page === 'blog' ? (
            <>
              {extra.length > 0 && <div style={{ maxWidth: 760, marginBottom: 40 }}><BlocksBody blocks={extra} c={c} altFallback={content.businessName} /></div>}
              <SectionPageBody id="blog" c={c} content={content} industry={industry} />
            </>
          ) : (
            <>
              <SectionPageBody id={page} c={c} content={content} industry={industry} />
              {extra.length > 0 && <BlocksBody blocks={extra} c={c} altFallback={content.businessName} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
