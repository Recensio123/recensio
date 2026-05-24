export default function KopplingarPage() {
  return (
    <>
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.1rem', marginBottom: '1.1rem' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1410', marginBottom: '.85rem' }}>Manuell kundläggning</div>
        <IntRow name="✍️ Lägg till en i taget" sub="Under fliken Kundhistorik" right={<span style={{ fontSize: 11, color: '#2e6649', fontWeight: 500 }}>Alltid aktiv</span>} />
        <IntRow name="📁 CSV-import" sub="Kolumner: namn, telefon, plattform" right={<ConnBtn>Importera fil</ConnBtn>} />
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.1rem', marginBottom: '1.1rem' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1410', marginBottom: '.85rem' }}>Affärssystem och kalender</div>
        <IntRow name="📅 Google Kalender" sub="OAuth2-integration" right={<ConnBtn>Anslut</ConnBtn>} />
        <IntRow name="📆 Outlook" sub="Trigger: möte slutar" right={<ConnBtn>Anslut</ConnBtn>} />
        <IntRow name="🔧 Hantverksdata" sub="Trigger: jobb avslutat" right={<ConnBtn>Anslut</ConnBtn>} />
        <IntRow name="⚡ Annat system" sub="5 000+ appar tillgängliga" right={<ConnBtn>Bläddra</ConnBtn>} last />
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.1rem' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1410', marginBottom: '.85rem' }}>Direkt API</div>
        <div style={{ background: '#f7f3ec', borderRadius: 8, padding: '.65rem .85rem', fontFamily: 'monospace', fontSize: 11, color: '#5c5445', marginBottom: '.4rem' }}>
          POST api.recensio.se/v1/trigger/[company-id]
        </div>
        <p style={{ fontSize: 12, color: '#9c9285', marginTop: '.5rem' }}>
          Skicka <code>Authorization: Bearer [api-key]</code> och body med <code>name</code>, <code>phone</code>.
        </p>
      </div>
    </>
  )
}

function IntRow({ name, sub, right, last }: { name: string; sub: string; right: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.6rem 0', borderBottom: last ? 'none' : '1px solid #f0ece6' }}>
      <div>
        <div style={{ fontSize: 13, color: '#0e1410', display: 'flex', alignItems: 'center', gap: 6 }}>{name}</div>
        <div style={{ fontSize: 11, color: '#9c9285', marginTop: 1 }}>{sub}</div>
      </div>
      {right}
    </div>
  )
}

function ConnBtn({ children }: { children: React.ReactNode }) {
  return (
    <button style={{ fontSize: 11, color: '#2e6649', background: '#deeae3', border: '1px solid #c2d9cb', borderRadius: 5, padding: '3px 11px', cursor: 'pointer', fontFamily: 'inherit' }}>
      {children}
    </button>
  )
}
