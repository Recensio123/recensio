'use client'
import { useState } from 'react'
import type { Template } from '@/lib/templates'
import { templateImageSlots } from '@/components/site/PreviewSite'
import { SITE_FONTS } from '@/lib/siteFonts'
import { uploadFont } from '@/lib/uploadImage'
import { Field, F } from './fields'
import { ImageUpload, SlotImage } from './panelDelar'
import { hexIsDark, contrastRatio } from './farger'
import { useSajt } from './sajtInnehall'

/*
 * Branding: loggan, färgerna, typsnittet och temat.
 *
 * Allt som gör att sidan ser ut som kundens företag i stället för som mallen,
 * i en fil. Innehållet kommer ur kontexten; mallen och dess byte kommer
 * utifrån, eftersom vilken design som är vald är panelens sak och inte
 * innehållets — den avgör hur sidan ritas, inte vad som står på den.
 */

export function BrandingSektion({ design, templates }: {
  design:    Template
  /** Alla mallar branschen kan välja mellan. Tom lista döljer temaraden. */
  templates: Template[]
}) {
  const { content, setContent, patch, touch, logo, setLogo,
          setAccent, setBackground, setTextColor, resetColors } = useSajt()

  /* Typsnittsuppladdningen är sektionens eget tillstånd — ingen annan del av
     panelen behöver veta att en fil är på väg upp. */
  const [fontBusy,  setFontBusy]  = useState(false)
  const [fontError, setFontError] = useState('')

  /* Which picture the chosen design uses, and what it does with it.
   *
   * The panel asks for one picture whatever the design; only the sentence
   * under it changes. A design that stands on a surface writes to the surface
   * instead of to a slot in a section — same field, same place, different job.
   * That is what keeps the panel still when a customer tries another card. */
  const designImageSlot: 'heroImage' | 'featureImage' | 'aboutImage' | 'backdropImage' =
    design.backdrop ? 'backdropImage'
    : (templateImageSlots(design.layout)[0] ?? 'heroImage')
  
  const designImageHint = {
    backdropImage: 'Ytan hela sidan står på — ett foto av ert rum slår vår textur',
    heroImage:     'Visas bredvid rubriken högst upp',
    featureImage:  'Visas bredvid den framlyfta tjänsten',
    aboutImage:    'Visas i Om oss-delen',
  }[designImageSlot]

  return (
    <>
          <ImageUpload value={logo} onChange={url => { setLogo(url); touch() }} label={logo ? 'Byt logga (visas i stället för namnet)' : 'Ladda upp logga (annars visas namnet)'} />
          {logo && <button onClick={() => { setLogo(''); touch() }} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: F }}>Ta bort loggan</button>}
          {/* The one text kept in the panel. With a logo uploaded the name
              is gone from the top of the page, and what is left of it sits
              small in the footer — too little to find by clicking. It also
              travels further than the page: the browser tab, the search
              result and the business card Google keeps all read from here. */}
          <Field label="Företagsnamn" value={content.businessName} onChange={v => patch('businessName', v)} max={40} />
          {/* Båda lägena sägs, inte bara det ena. Utan logga är namnet det
              besökaren möter högst upp, och det gäller varje design — namn
              och logga ritas av samma del i alla fjorton. Att bara nämna
              saken när en logga finns lämnar den vanligaste kunden utan
              svar på varför deras namn står i toppen. */}
          <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '-8px 0 0' }}>
            {logo
              ? 'Syns inte högst upp så länge loggan ligger kvar — men står kvar i sidfoten, i webbläsarfliken och på Google.'
              : 'Visas högst upp på sidan i alla designer tills du laddar upp en logga.'}
          </p>
            {/* The design's own picture.
              *
              * Every layout has at most one, and where it lands is the
              * layout's business: beside the heading, next to the featured
              * service, in the about block, or as the surface the whole
              * opening stands on. It sits here rather than in the section it
              * happens to appear in, so switching design never moves a field
              * around in the panel — the picture belongs to the design, and
              * this is where the design is chosen. */}
            <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Designens bild</p>
            <SlotImage
              label=""
              hint={designImageHint}
              value={content[designImageSlot] ?? ''}
              onChange={v => patch(designImageSlot, v)}
            />
  
            <div style={{ height: 1, background: '#1e293b' }} />
            <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Färger</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {([
                ['Accentfärg', 'Knappar, länkar och detaljer', content.colorOverrides?.a ?? design.colors.a, setAccent],
                ['Bakgrund', content.textColorPicked ? 'Din valda textfärg behålls' : 'Textfärgen anpassas tills du valt en egen', content.colorOverrides?.bg ?? design.colors.bg, setBackground],
                ['Textfärg', 'Rubriker — brödtexten följer med, mjukare', content.colorOverrides?.h ?? design.colors.h, setTextColor],
              ] as const).map(([label, hint, value, onPick]) => (
                <div key={label}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F, margin: '0 0 5px' }}>{label}</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: '1px solid #334155', borderRadius: 8, padding: '7px 10px', background: '#1e293b' }}>
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
                      onChange={e => onPick(e.target.value)}
                      style={{ width: 26, height: 26, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 12, color: '#f1f5f9', fontFamily: F }}>{value}</span>
                  </label>
                  <p style={{ fontSize: 10, color: '#64748b', fontFamily: F, margin: '4px 0 0', lineHeight: 1.4 }}>{hint}</p>
                </div>
              ))}
            </div>
            {/* A pale accent on a pale page means pale buttons — say it here,
                while both pickers are in view, instead of changing their
                brand color behind their back */}
            {contrastRatio(
              content.colorOverrides?.a ?? design.colors.a,
              content.colorOverrides?.bg ?? design.colors.bg
            ) < 2.5 && (
              <p style={{ fontSize: 11, color: '#eab308', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                Accentfärgen syns dåligt mot bakgrunden — knappar och länkar blir otydliga. Välj en {hexIsDark(content.colorOverrides?.bg ?? design.colors.bg) ? 'ljusare' : 'mörkare'} accentfärg.
              </p>
            )}
            {/* A kept text choice can collide with a new background — the
                customer decides, but never without being told */}
            {contrastRatio(
              content.colorOverrides?.h ?? design.colors.h,
              content.colorOverrides?.bg ?? design.colors.bg
            ) < 2.5 && (
              <p style={{ fontSize: 11, color: '#eab308', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
                Textfärgen syns dåligt mot bakgrunden — rubrikerna blir svårlästa. Välj en {hexIsDark(content.colorOverrides?.bg ?? design.colors.bg) ? 'ljusare' : 'mörkare'} textfärg.
              </p>
            )}
            {content.colorOverrides && Object.keys(content.colorOverrides).length > 0 && (
              <button onClick={resetColors} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: F, padding: 0 }}>
                Återställ mallens färger
              </button>
            )}
  
            <div style={{ height: 1, background: '#1e293b' }} />
            <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Typsnitt</p>
            {!content.customFont?.url && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['', 'Geist', 'Mallens standard', undefined] as const,
                  ...Object.entries(SITE_FONTS).map(([id, f]) => [id, f.name, f.hint, f.family] as const)
                ].map(([id, name, hint, family]) => {
                  const active = (content.fontPreset ?? '') === id
                  return (
                    <button
                      key={id || 'default'}
                      onClick={() => { patch('fontPreset', id); }}
                      style={{
                        textAlign: 'left', padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                        background: active ? 'rgba(234,179,8,0.08)' : '#1e293b',
                        border: `1px solid ${active ? '#eab308' : '#334155'}`,
                      }}
                    >
                      {/* The name set in its own face — the picker is the preview */}
                      <span style={{ display: 'block', fontSize: 14, color: '#f1f5f9', fontFamily: family ?? F }}>{name}</span>
                      <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', fontFamily: F, marginTop: 2 }}>{hint}</span>
                    </button>
                  )
                })}
              </div>
            )}
            <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
              Ladda upp ett eget typsnitt. Kontrollera att licensen tillåter användning på webben.
            </p>
            {content.customFont?.url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: 13, color: '#f1f5f9', fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {content.customFont.name}
                </span>
                <button
                  onClick={() => { setContent(p => ({ ...p, customFont: undefined })); touch() }}
                  style={{ fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}
                >
                  Ta bort — använd mallens
                </button>
              </div>
            ) : (
              <label style={{ display: 'block', textAlign: 'center', border: '1px dashed #334155', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: fontBusy ? '#64748b' : '#eab308', cursor: 'pointer', fontFamily: F }}>
                {fontBusy ? 'Laddar upp…' : '+ Ladda upp typsnitt (WOFF2, TTF eller OTF)'}
                <input type="file" accept=".woff2,.woff,.ttf,.otf" style={{ display: 'none' }} onChange={async e => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  setFontError(''); setFontBusy(true)
                  try {
                    const url = await uploadFont(file)
                    setContent(p => ({ ...p, customFont: { url, name: file.name } })); touch()
                  } catch (err) {
                    setFontError(err instanceof Error ? err.message : 'Uppladdningen misslyckades')
                  } finally {
                    setFontBusy(false)
                  }
                }} />
              </label>
            )}
            {fontError && <p style={{ fontSize: 11, color: '#f87171', fontFamily: F, margin: 0 }}>{fontError}</p>}
  
            {templates && templates.length > 1 && (<>
            <div style={{ height: 1, background: '#1e293b' }} />
            <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>Tema</p>
            <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '-8px 0 0' }}>
              Byter sidans layout. Texter, priser, bilder och artiklar följer med — färger och bakgrund börjar om från den nya designen.
            </p>
            {/* Miniatyrerna visade en teckning av temat, inte temat. Ett val
                som byter hela sidans komposition förtjänar att ses i
                verklig storlek och med kundens egen text i sig — därför en
                egen sida i stället för tolv frimärken i en spalt på 400 px. */}
            <a
              href="/dashboard/webbplats/teman"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                border: '1px solid #334155', borderRadius: 10, padding: '11px 13px',
                textDecoration: 'none', background: '#1e293b',
              }}
            >
              <span>
                <span style={{ display: 'block', fontSize: 13, color: '#f1f5f9', fontFamily: F, fontWeight: 600 }}>
                  {design.name}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: F, marginTop: 2 }}>
                  {templates.length} teman att välja mellan
                </span>
              </span>
              <span style={{ fontSize: 12, color: '#eab308', fontFamily: F, fontWeight: 600, whiteSpace: 'nowrap' }}>
                Se våra teman →
              </span>
            </a>
            </>)}
    </>
  )
}
