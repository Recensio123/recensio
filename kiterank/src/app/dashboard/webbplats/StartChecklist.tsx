'use client'
import { F } from './fields'

/*
 * The way in. The panel shows everything a customer CAN do; this shows what
 * to do NEXT. Six steps, each one click from its own section, each ticking
 * off by itself as the work gets done. A site is "klar" when the row says so
 * — without this, no rookie ever knows.
 *
 * The first steps arrive already checked (the company name came from
 * onboarding, the price list ships filled in). That head start is deliberate:
 * a list that starts at 2 of 6 gets finished, one that starts at zero gets
 * closed.
 */

export type ChecklistItem = {
  id:      string
  label:   string
  /** One short line of why/where — shown under the label while undone. */
  hint?:   string
  done:    boolean
  /** The panel section a click opens. */
  section: string
}

export function StartChecklist({ items, onGo }: {
  items: ChecklistItem[]
  onGo:  (section: string) => void
}) {
  const doneCount = items.filter(i => i.done).length
  const allDone   = doneCount === items.length

  /* Finished: shrink to one quiet line. The list did its job — it should not
     keep occupying the best spot in the panel forever. */
  if (allDone) {
    return (
      <div style={{ border: '1px solid #1e293b', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: '#4ade80' }}>✓</span>
        <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: F }}>Alla stegen klara — din sida är komplett.</span>
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid #1e293b', borderRadius: 10, padding: 14, background: '#0f172a' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <p style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#f1f5f9', fontFamily: F, margin: 0 }}>Kom igång</p>
        <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: F }}>{doneCount} av {items.length} klart</span>
      </div>

      {/* Progress — the bar is what makes "5 av 6" feel like almost-there */}
      <div style={{ height: 4, borderRadius: 2, background: '#1e293b', marginBottom: 12 }}>
        <div style={{ height: 4, borderRadius: 2, background: '#eab308', width: `${Math.round(100 * doneCount / items.length)}%`, transition: 'width 0.3s' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onGo(item.section)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left', width: '100%',
              background: 'none', border: 'none', padding: '6px 2px', cursor: 'pointer', borderRadius: 6,
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
              background: item.done ? 'rgba(74,222,128,0.15)' : 'transparent',
              border: item.done ? 'none' : '1.5px solid #334155',
              color: '#4ade80',
            }}>
              {item.done ? '✓' : ''}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                display: 'block', fontSize: 13, fontFamily: F,
                color: item.done ? '#64748b' : '#e2e8f0',
                textDecoration: item.done ? 'line-through' : 'none',
              }}>
                {item.label}
              </span>
              {!item.done && item.hint && (
                <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: F, marginTop: 1 }}>{item.hint}</span>
              )}
            </span>
            {!item.done && <span style={{ fontSize: 12, color: '#eab308', fontFamily: F, whiteSpace: 'nowrap', marginTop: 1 }}>Öppna →</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
