'use client'

export function PreviewBar({ templateName }: { templateName: string }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 52,
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(8px)',
      borderTop: '1px solid rgba(30, 41, 59, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 9999,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <span style={{ color: '#94a3b8', fontSize: 13 }}>
        Förhandsgranskar: <strong style={{ color: 'white' }}>{templateName}</strong>
      </span>
      <button
        onClick={() => window.close()}
        style={{
          background: 'transparent',
          border: '1px solid #334155',
          borderRadius: 8,
          color: '#94a3b8',
          padding: '7px 16px',
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: 'inherit',
        }}
      >
        ← Tillbaka till mallval
      </button>
    </div>
  )
}
