'use client'
import { useMedia } from './MediaLibrary'
import { F } from './fields'

/*
 * Panelens byggstenar.
 *
 * Sju delar som redigeraren sätter ihop sina sektioner av: bildplatser, en
 * kryssruta, ett val och sektionsramen själv. De togs ur PanelEditor för att
 * den filen var 2 936 rader, och en fil i den storleken går inte att ändra i
 * utan att träffa något annat — jag klippte sönder en ternär, halva en
 * kommentar och ett reguljärt uttryck i den under en enda dag.
 *
 * De här sju var lättast att flytta eftersom de inte rör redigerarens
 * tillstånd alls: allt de behöver kommer in som props. Resten av sektionerna
 * gör det inte ännu, och de flyttar när de kan göra det utan tjugo props var.
 */
/* The layout's own picture. Stored as a file, not inside the page content, so
   a big photo doesn't end up embedded in the HTML of every visit. */
export function SlotImage({ label, hint, value, onChange }: {
  label: string; hint: string; value: string; onChange: (url: string) => void
}) {
  const media = useMedia()
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', fontFamily: F, margin: '0 0 5px' }}>{label}</p>
      <button
        onClick={async () => { const url = await media?.pickImage(); if (url) onChange(url) }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" style={{ width: 84, height: 60, objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <span style={{ width: 84, height: 60, borderRadius: 8, border: '2px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 20 }}>+</span>
        )}
        <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: F, lineHeight: 1.5 }}>
          {value ? 'Byt bild' : hint}
        </span>
      </button>
      {value && (
        <button onClick={() => onChange('')} style={{ marginTop: 6, fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: F, padding: 0 }}>
          Ta bort bilden
        </button>
      )}
    </div>
  )
}

/* Logo and team photos. Stored as files like every other picture — inline
   image data would ride along in the HTML of every single page view. */
/* Bild med etikett bredvid — loggan och sidornas bilder. Runda porträtt hade
   ett eget läge här tills teamet fick sina egna rader; det togs bort samtidigt
   så ingen ärver ett val som inte längre används någonstans. */
export function ImageUpload({ value, onChange, label }: {
  value: string; onChange: (url: string) => void; label: string
}) {
  const media = useMedia()
  return (
    <button
      onClick={async () => { const url = await media?.pickImage(); if (url) onChange(url) }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
    >
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />
      ) : (
        <span style={{ width: 56, height: 56, borderRadius: 8, border: '2px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 20 }}>+</span>
      )}
      <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: F }}>{label}</span>
    </button>
  )
}

/* Personens foto som en knapp i radens vänsterkant. Samma bildbibliotek som
   allt annat, men utan etikett bredvid — raden har ingen plats för ord som
   säger vad en bild är. */
export function TeamPhoto({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const media = useMedia()
  return (
    <button
      onClick={async () => { const url = await media?.pickImage(); if (url) onChange(url) }}
      title={value ? 'Byt foto' : 'Välj foto'}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, lineHeight: 0 }}
    >
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <span style={{ width: 44, height: 44, borderRadius: '50%', border: '2px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 18 }}>+</span>
      )}
    </button>
  )
}

/* Ett kryss med en mening bredvid.
 *
 * Reglagen i panelen svarar på "på eller av" men aldrig på "av vad" — den som
 * inte byggt en hemsida förut vet inte vad reglaget i en rubrik gäller. Ett
 * kryss med en rad text under gör frågan läsbar utan att ta mer plats. */
export function Kryss({ on, onChange, title, hint, disabled }: {
  on: boolean; onChange: (v: boolean) => void
  title: string; hint?: string; disabled?: boolean
}) {
  return (
    <button
      onClick={() => { if (!disabled) onChange(!on) }}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', textAlign: 'left',
        background: 'none', border: 'none', padding: 0, cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
        border: `1px solid ${on ? '#eab308' : '#334155'}`,
        background: on ? '#eab308' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#0f172a', fontSize: 12, fontWeight: 900, lineHeight: 1,
      }}>{on ? '✓' : ''}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', fontFamily: F }}>{title}</span>
        {hint && <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, marginTop: 2 }}>{hint}</span>}
      </span>
    </button>
  )
}

/* Samma rad som Kryss, men rund — och därmed "välj en" i stället för "på
 * eller av".
 *
 * Formen är hela skillnaden, och den är värd att hålla isär: en fyrkant är ett
 * val som står för sig självt, en cirkel ett som utesluter de andra. Blandas de
 * ihop blir varje ruta en gissning om vad ett klick gör med resten. */
export function Val({ on, onChange, title, hint, märke }: {
  on: boolean; onChange: () => void
  title: string; hint?: string
  /** "Vanligast" — det de flesta väljer, för den som inte kan gissa. */
  märke?: string
}) {
  return (
    <button
      onClick={() => { if (!on) onChange() }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', textAlign: 'left',
        background: 'none', border: 'none', padding: 0, cursor: on ? 'default' : 'pointer',
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        border: `1px solid ${on ? '#eab308' : '#334155'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {on && <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#eab308' }} />}
      </span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: on ? '#eab308' : '#e2e8f0', fontFamily: F }}>
          {title}
          {märke && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', fontFamily: F, marginLeft: 6 }}>
              ({märke})
            </span>
          )}
        </span>
        {hint && <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, marginTop: 2 }}>{hint}</span>}
      </span>
    </button>
  )
}

/* One collapsible part of the page. Open one at a time keeps the panel calm. */
export function Section({ id, title, hint, open, onToggle, children, enabled, onEnabledChange, onMoveUp, onMoveDown, flash }: {
  id: string; title: string; hint?: string
  open: boolean; onToggle: () => void
  children: React.ReactNode
  enabled?: boolean; onEnabledChange?: (v: boolean) => void
  /** Movable sections: up/down here moves the section on the page itself. */
  onMoveUp?: () => void; onMoveDown?: () => void
  /** Just arrived here from a click on the page — mark it briefly. */
  flash?: boolean
}) {
  const arrow = (dir: '↑' | '↓', fn?: () => void) => (
    <button
      onClick={e => { e.stopPropagation(); fn?.() }}
      disabled={!fn}
      title={fn ? (dir === '↑' ? 'Flytta upp på sidan' : 'Flytta ner på sidan') : undefined}
      style={{ background: 'none', border: 'none', padding: '0 2px', fontSize: 13, lineHeight: 1, cursor: fn ? 'pointer' : 'default', color: fn ? '#64748b' : '#1e293b' }}
    >
      {dir}
    </button>
  )
  return (
    // flexShrink 0: the panel is a fixed-height flex column — without this,
    // overflowing sections get squeezed and clipped instead of scrolling.
    // data-panel-section is how goTo() finds this to scroll it into view.
    <div
      data-panel-section={id}
      style={{
        border: `1px solid ${flash ? '#eab308' : '#1e293b'}`,
        boxShadow: flash ? '0 0 0 3px rgba(234,179,8,0.15)' : 'none',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        borderRadius: 12, overflow: 'hidden', background: '#0f172a', flexShrink: 0, scrollMarginTop: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', cursor: 'pointer' }} onClick={onToggle}>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 700, color: '#f1f5f9', fontFamily: F }}>
            {title}
            {/* Names the connection out loud: this is the piece you clicked */}
            {flash && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', background: '#eab308', borderRadius: 999, padding: '2px 8px', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
                Vald på sidan
              </span>
            )}
          </span>
          {hint && <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: F, marginTop: 2 }}>{hint}</span>}
        </span>
        {(onMoveUp || onMoveDown) && (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {arrow('↑', onMoveUp)}
            {arrow('↓', onMoveDown)}
          </span>
        )}
        {onEnabledChange && (
          <button
            onClick={e => { e.stopPropagation(); onEnabledChange(!enabled) }}
            title={enabled ? 'Visas på sidan — klicka för att dölja' : 'Dold — klicka för att visa'}
            style={{
              width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: enabled ? '#eab308' : '#334155', position: 'relative', transition: 'background 0.15s',
            }}
          >
            <span style={{ position: 'absolute', top: 2, left: enabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
          </button>
        )}
        <span style={{ color: '#64748b', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '4px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }} data-section={id}>
          {/* The arrows in the header are two small glyphs; a rookie has no
              reason to guess what they move. Say it once, while it is open. */}
          {(onMoveUp || onMoveDown) && (
            <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, margin: 0 }}>
              Pilarna ↑↓ högst upp flyttar den här delen på sidan.
            </p>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
