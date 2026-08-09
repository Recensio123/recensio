'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LuxeTemplate }    from './templates/LuxeTemplate'
import { BloomTemplate }   from './templates/BloomTemplate'
import { StudioTemplate }  from './templates/StudioTemplate'
import { EarthyTemplate }  from './templates/EarthyTemplate'
import { PageEditor }      from './PageEditor'
import { ArticleListView } from './ArticleListView'

// ─── Types ────────────────────────────────────────────────────────────────────
export type TemplateName = 'luxe' | 'bloom' | 'studio' | 'earthy'
export type BlockType    = 'h2' | 'h3' | 'paragraph' | 'image'

export interface Service {
  id:          string
  name:        string
  description: string
}

export interface ContentBlock {
  id:      string
  type:    BlockType
  content: string
}

export interface Article {
  id:          string
  title:       string
  excerpt:     string
  publishedAt: string
  blocks:      ContentBlock[]
}

export interface SitePage {
  id:       string
  name:     string
  slug:     string
  articles: Article[]
}

export interface SiteConfig {
  template:       TemplateName
  slug:           string
  primaryColor:   string
  secondaryColor: string
  brandName:      string
  tagline:        string
  heroHeadline:   string
  heroSubtext:    string
  heroCta:        string
  aboutHeadline:  string
  aboutText:      string
  services:       Service[]
  phone:          string
  address:        string
  businessHours:  string
  pages:          SitePage[]
}

export interface EditHandlers {
  update<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]): void
  addService():                                                       void
  removeService(id: string):                                          void
  updateService(id: string, field: 'name' | 'description', value: string): void
  navigatePage(id: string):                                           void
  navigateArticle(pageId: string, articleId: string):                 void
}

// ─── Template metadata ───────────────────────────────────────────────────────
const TEMPLATE_DEFAULTS: Record<TemplateName, { primaryColor: string; secondaryColor: string }> = {
  luxe:   { primaryColor: '#0d0d0d', secondaryColor: '#c9a84c' },
  bloom:  { primaryColor: '#9d4f6a', secondaryColor: '#f2c4d0' },
  studio: { primaryColor: '#111111', secondaryColor: '#e63946' },
  earthy: { primaryColor: '#4a6741', secondaryColor: '#a8c5a0' },
}

const TEMPLATE_META: Record<TemplateName, { label: string; description: string }> = {
  luxe:   { label: 'Luxe',   description: 'Dark & elegant'  },
  bloom:  { label: 'Bloom',  description: 'Soft & feminine' },
  studio: { label: 'Studio', description: 'Clean & bold'    },
  earthy: { label: 'Earthy', description: 'Warm & natural'  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toSlug(name: string) {
  return name.trim()
    .toLowerCase()
    .replace(/[åä]/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <label className="relative cursor-pointer shrink-0">
        <div className="w-8 h-8 rounded-lg border border-white/20 shadow" style={{ backgroundColor: value }} />
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
      </label>
      <div>
        <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-none mb-1">{label}</p>
        <input type="text" value={value}
          onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value) }}
          className="w-20 bg-navy-700 border border-navy-600 rounded px-2 py-0.5 text-white text-xs font-mono focus:outline-none focus:border-mustard/50" />
      </div>
    </div>
  )
}

// ─── Editor shell ─────────────────────────────────────────────────────────────
export function SiteEditor({ initial, companyName }: {
  initial:     SiteConfig
  companyName: string
}) {
  const [config,       setConfig]       = useState<SiteConfig>({ ...initial, pages: initial.pages ?? [] })
  const [panel,        setPanel]        = useState<'template' | 'brand' | 'pages' | null>(null)
  const [activePage,   setActivePage]   = useState<string | null>(null)
  const [activeArticle, setActiveArticle] = useState<string | null>(null)
  const [newPageName,  setNewPageName]  = useState('')
  const [addingPage,   setAddingPage]   = useState(false)
  const [saveState,    setSaveState]    = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  function update<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }))
    setSaveState('idle')
  }

  function switchTemplate(t: TemplateName) {
    setConfig(prev => ({ ...prev, template: t, ...TEMPLATE_DEFAULTS[t] }))
    setPanel(null)
  }

  function addPage() {
    const name = newPageName.trim()
    if (!name) return
    const page: SitePage = { id: crypto.randomUUID(), name, slug: toSlug(name), articles: [] }
    update('pages', [...config.pages, page])
    setNewPageName('')
    setAddingPage(false)
    setActivePage(page.id)
    setActiveArticle(null)
    setPanel(null)
  }

  function removePage(id: string) {
    update('pages', config.pages.filter(p => p.id !== id))
    if (activePage === id) { setActivePage(null); setActiveArticle(null) }
  }

  // ─── Article management ───────────────────────────────────────────────────
  function updateArticle(updated: Article) {
    if (!activePage) return
    update('pages', config.pages.map(p =>
      p.id === activePage
        ? { ...p, articles: p.articles.map(a => a.id === updated.id ? updated : a) }
        : p
    ))
  }

  function addArticle() {
    if (!activePage) return
    const today = new Date().toISOString().split('T')[0]
    const article: Article = {
      id:          crypto.randomUUID(),
      title:       'New article',
      excerpt:     'Write a short description here...',
      publishedAt: today,
      blocks:      [],
    }
    update('pages', config.pages.map(p =>
      p.id === activePage ? { ...p, articles: [...(p.articles ?? []), article] } : p
    ))
    setActiveArticle(article.id)
  }

  function removeArticle(articleId: string) {
    if (!activePage) return
    update('pages', config.pages.map(p =>
      p.id === activePage
        ? { ...p, articles: p.articles.filter(a => a.id !== articleId) }
        : p
    ))
    if (activeArticle === articleId) setActiveArticle(null)
  }

  const handlers: EditHandlers = {
    update,
    addService: () =>
      update('services', [...config.services, { id: crypto.randomUUID(), name: 'New service', description: 'Describe this service' }]),
    removeService: id =>
      update('services', config.services.filter(s => s.id !== id)),
    updateService: (id, field, value) =>
      update('services', config.services.map(s => s.id === id ? { ...s, [field]: value } : s)),
    navigatePage:    (id) => { setActivePage(id); setActiveArticle(null); setPanel(null) },
    navigateArticle: (pageId, articleId) => { setActivePage(pageId); setActiveArticle(articleId); setPanel(null) },
  }

  async function save() {
    setSaveState('saving')
    try {
      const res = await fetch('/api/site', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      setSaveState(res.ok ? 'saved' : 'error')
      if (res.ok) setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setSaveState('error')
    }
  }

  const meta           = TEMPLATE_META[config.template] ?? TEMPLATE_META.luxe
  const currentPage    = activePage    ? config.pages.find(p => p.id === activePage)                            : null
  const currentArticle = (currentPage && activeArticle) ? currentPage.articles.find(a => a.id === activeArticle) : null

  return (
    <div className="h-screen flex flex-col">

      {/* ── Top bar ── */}
      <header className="h-11 border-b border-navy-700 bg-navy-900 flex items-center justify-between px-5 shrink-0 z-30 relative">

        {/* Left — breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/hub" className="text-slate-500 hover:text-slate-300 text-sm transition-colors shrink-0">← Hub</Link>
          <div className="h-3.5 w-px bg-navy-700 shrink-0" />
          <button
            onClick={() => { setActivePage(null); setActiveArticle(null); setPanel(null) }}
            className={`text-sm font-semibold transition-colors shrink-0 ${activePage ? 'text-slate-400 hover:text-white' : 'text-white'}`}
          >
            My Website
          </button>

          {/* Homepage: show slug */}
          {!currentPage && (
            <>
              <div className="h-3.5 w-px bg-navy-700 shrink-0" />
              <span className="text-slate-600 text-xs font-mono truncate">{config.slug}.kiterank.com</span>
            </>
          )}

          {/* Page view (article list) */}
          {currentPage && !currentArticle && (
            <>
              <span className="text-navy-700 text-sm shrink-0">/</span>
              <span className="text-white text-sm font-medium truncate max-w-[180px]">{currentPage.name}</span>
            </>
          )}

          {/* Article view */}
          {currentPage && currentArticle && (
            <>
              <span className="text-navy-700 text-sm shrink-0">/</span>
              <button
                onClick={() => setActiveArticle(null)}
                className="text-slate-400 hover:text-white text-sm transition-colors shrink-0 truncate max-w-[120px]"
              >{currentPage.name}</button>
              <span className="text-navy-700 text-sm shrink-0">/</span>
              <span className="text-white text-sm font-medium truncate max-w-[160px]">{currentArticle.title}</span>
            </>
          )}
        </div>

        {/* Right — controls */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Template + Brand — only when on homepage */}
          {!activePage && (
            <>
              <button
                onClick={() => setPanel(p => p === 'template' ? null : 'template')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${panel === 'template' ? 'bg-navy-600 text-white' : 'text-slate-400 hover:text-white hover:bg-navy-800'}`}
              >
                <span className="text-slate-500">Template:</span>
                <span className="text-white">{meta.label}</span>
                <span className="text-slate-600 text-[10px]">▾</span>
              </button>

              <button
                onClick={() => setPanel(p => p === 'brand' ? null : 'brand')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${panel === 'brand' ? 'bg-navy-600 text-white' : 'text-slate-400 hover:text-white hover:bg-navy-800'}`}
              >
                Brand
                <div className="flex gap-0.5">
                  <div className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ background: config.primaryColor }} />
                  <div className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ background: config.secondaryColor }} />
                </div>
              </button>

              <div className="h-3.5 w-px bg-navy-700 mx-0.5" />
            </>
          )}

          {/* Pages — always visible */}
          <button
            onClick={() => setPanel(p => p === 'pages' ? null : 'pages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${panel === 'pages' ? 'bg-navy-600 text-white' : 'text-slate-400 hover:text-white hover:bg-navy-800'}`}
          >
            Pages
            {config.pages.length > 0 && (
              <span className="bg-navy-600 text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {config.pages.length}
              </span>
            )}
          </button>

          <div className="h-3.5 w-px bg-navy-700 mx-0.5" />

          <button onClick={save} disabled={saveState === 'saving'}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              saveState === 'saved'  ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              saveState === 'error'  ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              saveState === 'saving' ? 'bg-mustard/40 text-navy-950 cursor-not-allowed' :
              'bg-mustard text-navy-950 hover:bg-mustard/90'
            }`}
          >
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : saveState === 'error' ? 'Error' : 'Save'}
          </button>
        </div>
      </header>

      {/* ── Template picker ── */}
      {panel === 'template' && (
        <div className="absolute inset-x-0 top-11 z-20">
          <div className="bg-navy-900/95 backdrop-blur border-b border-navy-700 px-5 py-4">
            <div className="flex items-center gap-3 max-w-2xl">
              {(Object.entries(TEMPLATE_META) as [TemplateName, typeof TEMPLATE_META[TemplateName]][]).map(([id, tmpl]) => (
                <button key={id} onClick={() => switchTemplate(id)}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all ${config.template === id ? 'border-mustard bg-mustard/5' : 'border-navy-700 bg-navy-800 hover:border-navy-600'}`}
                >
                  <div className="h-10 rounded-lg mb-2 overflow-hidden flex items-end p-1.5 gap-1"
                    style={{ background: TEMPLATE_DEFAULTS[id].primaryColor }}>
                    <div className="h-2 rounded flex-1" style={{ background: TEMPLATE_DEFAULTS[id].secondaryColor, opacity: 0.9 }} />
                    <div className="h-1.5 rounded w-1/3" style={{ background: '#fff', opacity: 0.2 }} />
                  </div>
                  <p className="text-white text-xs font-semibold leading-none">{tmpl.label}</p>
                  <p className="text-slate-600 text-[10px] mt-0.5">{tmpl.description}</p>
                  {config.template === id && <p className="text-mustard text-[10px] mt-1 font-medium">✓ Active</p>}
                </button>
              ))}
            </div>
          </div>
          <div className="fixed inset-0 -z-10" onClick={() => setPanel(null)} />
        </div>
      )}

      {/* ── Brand panel ── */}
      {panel === 'brand' && (
        <div className="absolute right-5 top-[52px] z-20">
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 w-52 shadow-2xl space-y-4">
            <ColorField label="Primary" value={config.primaryColor}   onChange={v => update('primaryColor', v)} />
            <ColorField label="Accent"  value={config.secondaryColor} onChange={v => update('secondaryColor', v)} />
          </div>
          <div className="fixed inset-0 -z-10" onClick={() => setPanel(null)} />
        </div>
      )}

      {/* ── Pages panel ── */}
      {panel === 'pages' && (
        <div className="absolute right-5 top-[52px] z-20">
          <div className="bg-navy-800 border border-navy-700 rounded-xl shadow-2xl overflow-hidden w-64">
            <div className="px-4 py-3 border-b border-navy-700 flex items-center justify-between">
              <p className="text-white text-xs font-semibold">Pages</p>
              <button onClick={() => setPanel(null)} className="text-slate-500 hover:text-white text-sm transition-colors">✕</button>
            </div>

            {/* Homepage row */}
            <div className="px-4 py-3 border-b border-navy-700 flex items-center justify-between">
              <div>
                <p className="text-white text-xs font-medium">Homepage</p>
                <p className="text-slate-600 text-[10px] font-mono mt-0.5">/{config.slug}</p>
              </div>
              <button
                onClick={() => { setActivePage(null); setActiveArticle(null); setPanel(null) }}
                className="text-xs text-mustard hover:underline transition-colors"
              >Edit</button>
            </div>

            {/* Extra pages */}
            {config.pages.map(page => (
              <div key={page.id} className="px-4 py-3 border-b border-navy-700 flex items-center justify-between group/row">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-medium truncate">{page.name}</p>
                  <p className="text-slate-600 text-[10px] font-mono mt-0.5">/{page.slug}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={() => { setActivePage(page.id); setActiveArticle(null); setPanel(null) }}
                    className="text-xs text-mustard hover:underline transition-colors"
                  >Edit</button>
                  <button
                    onClick={() => removePage(page.id)}
                    className="text-xs text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover/row:opacity-100"
                  >×</button>
                </div>
              </div>
            ))}

            {/* Add page */}
            <div className="px-4 py-3">
              {addingPage ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newPageName}
                    onChange={e => setNewPageName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addPage()}
                    placeholder="Page name (e.g. Tips & Råd)"
                    autoFocus
                    className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-mustard/50"
                  />
                  {newPageName && (
                    <p className="text-slate-600 text-[10px] font-mono">/{toSlug(newPageName)}</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={addPage}
                      className="flex-1 py-1.5 bg-mustard text-navy-950 text-xs font-semibold rounded-lg hover:bg-mustard/90 transition-colors">
                      Create page
                    </button>
                    <button onClick={() => { setAddingPage(false); setNewPageName('') }}
                      className="px-3 py-1.5 text-slate-500 hover:text-white text-xs transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingPage(true)}
                  className="w-full py-2 border border-dashed border-navy-600 rounded-lg text-slate-500 text-xs hover:text-white hover:border-navy-500 transition-colors">
                  + Add page
                </button>
              )}
            </div>
          </div>
          <div className="fixed inset-0 -z-10" onClick={() => { setPanel(null); setAddingPage(false); setNewPageName('') }} />
        </div>
      )}

      {/* ── Canvas ── */}
      <div className="flex-1 overflow-y-auto">
        {currentArticle ? (
          <PageEditor article={currentArticle} onUpdate={updateArticle} />
        ) : currentPage ? (
          <ArticleListView
            page={currentPage}
            config={config}
            onNavigateArticle={setActiveArticle}
            onAddArticle={addArticle}
            onRemoveArticle={removeArticle}
          />
        ) : (
          <>
            {config.template === 'luxe'   && <LuxeTemplate   config={config} h={handlers} />}
            {config.template === 'bloom'  && <BloomTemplate  config={config} h={handlers} />}
            {config.template === 'studio' && <StudioTemplate config={config} h={handlers} />}
            {config.template === 'earthy' && <EarthyTemplate config={config} h={handlers} />}
          </>
        )}
      </div>

    </div>
  )
}
