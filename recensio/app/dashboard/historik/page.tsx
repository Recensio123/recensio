'use client'
import { useState, useEffect } from 'react'

type Customer = {
  id: string; name: string; phone: string; platform: string; status: string
  stars: number | null; review_text: string | null; created_at: string
}

const statusLabel: Record<string, { label: string; bg: string; color: string }> = {
  reviewed: { label: 'Recension', bg: '#deeae3', color: '#2e6649' },
  private:  { label: 'Privat',    bg: '#fdf0ee', color: '#c0392b' },
  sent:     { label: 'Skickat',   bg: '#f0ece6', color: '#7a776e' },
  pending:  { label: 'Väntar',    bg: '#fef3cd', color: '#8a6000' },
  stopped:  { label: 'Stoppad',   bg: '#f0ece6', color: '#9c9285' },
}

export default function HistorikPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [platform, setPlatform] = useState('google')
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    const res = await fetch('/api/customers')
    if (res.ok) setCustomers(await res.json())
    setLoading(false)
  }

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    setAdding(true)
    await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, platform }),
    })
    setName(''); setPhone(''); setAdding(false); setShowAdd(false)
    fetchCustomers()
  }

  const sent = customers.filter(c => c.status === 'sent').length
  const reviewed = customers.filter(c => c.status === 'reviewed').length
  const conversion = customers.length ? Math.round((reviewed / customers.length) * 100) + '%' : '–'

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Kunder totalt', val: customers.length },
          { label: 'SMS skickade', val: sent },
          { label: 'Konvertering', val: conversion },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 12, padding: '1rem' }}>
            <div style={{ fontSize: 11, color: '#9c9285', fontWeight: 500, marginBottom: '.3rem' }}>{m.label}</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: '2rem', color: '#0e1410', lineHeight: 1 }}>{m.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14, padding: '1.1rem' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1410', marginBottom: '.85rem', display: 'flex', justifyContent: 'space-between' }}>
          Kundhistorik ({customers.length})
          <button onClick={() => setShowAdd(v => !v)} style={{ fontSize: 11, color: '#4d8c68', background: 'none', border: 'none', cursor: 'pointer' }}>+ Lägg till</button>
        </div>

        {showAdd && (
          <form onSubmit={addCustomer} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 60px', gap: 6, marginBottom: '.75rem', paddingBottom: '.75rem', borderBottom: '1px solid #e5dfd4' }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Kundens namn" style={inStyle} required />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07X-XXX XX XX" style={inStyle} />
            <select value={platform} onChange={e => setPlatform(e.target.value)} style={inStyle}>
              <option value="google">Google</option>
              <option value="reco">Reco.se</option>
              <option value="hittaproffs">Hittaproffs</option>
            </select>
            <button type="submit" disabled={adding} style={{ background: '#1a3d2b', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              {adding ? '...' : 'Lägg till'}
            </button>
          </form>
        )}

        {loading ? <p style={{ fontSize: 12, color: '#9c9285' }}>Laddar...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>{['', 'Namn', 'Plattform', 'Status', 'Datum'].map(h => (
                <th key={h} style={{ fontSize: 10, color: '#9c9285', textAlign: 'left', padding: '.35rem .65rem', borderBottom: '1px solid #f0ece6', fontWeight: 500 }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const s = statusLabel[c.status] ?? statusLabel.stopped
                return (
                  <tr key={c.id} style={{ cursor: 'pointer' }}>
                    <td style={{ padding: '.6rem .65rem' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#deeae3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#2e6649' }}>
                        {c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    </td>
                    <td style={{ padding: '.6rem .65rem', color: '#5c5445' }}>{c.name}</td>
                    <td style={{ padding: '.6rem .65rem', color: '#5c5445' }}>{c.platform}</td>
                    <td style={{ padding: '.6rem .65rem' }}>
                      <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                    <td style={{ padding: '.6rem .65rem', color: '#9c9285' }}>{new Date(c.created_at).toLocaleDateString('sv-SE')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

const inStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', background: '#fff', border: '1px solid #e5dfd4',
  borderRadius: 7, fontFamily: 'inherit', fontSize: 12, color: '#0e1410', outline: 'none',
}
