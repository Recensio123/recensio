'use client'
import { useEffect, useState } from 'react'
import { fill, datumText, CONFIRM_MAX } from '@/lib/bookingText'
import { bodyFor, type TemplateRow } from '@/lib/messageTemplates'
import type { Booking } from './data'

/*
 * Avbokningen salongen gör själv.
 *
 * En tid salongen ställer in har ett skäl — sjukdom, en stängd dag, en
 * medarbetare som slutat — och mallens "din tid är avbokad" läser kallt när det
 * inte var kunden som ändrade sig. Därför visas texten här, färdigt ifylld med
 * den här kundens tid, och salongen kan skriva om den innan den går.
 *
 * Omskrivningen gäller bara det här mailet. Nästa avbokning använder mallen
 * igen — en text skriven i stunden om en sjuk medarbetare ska inte tysta
 * mallen för alla kommande kunder.
 *
 * Att avboka utan att skicka något är också ett val. En kund som redan fått
 * beskedet i telefon ska inte få ett mail som upprepar det.
 */

export function AvbokaDialog({ booking, staffName, onClose, onDone }: {
  booking:    Booking
  staffName:  string | null
  onClose:    () => void
  /** Genomför avbokningen. `message` null betyder att inget mail går ut. */
  onDone:     (message: string | null) => void
}) {
  const [text,   setText]   = useState('')
  const [laddad, setLaddad] = useState(false)

  /* Mallen som utgångspunkt, ifylld med den här kundens uppgifter. */
  useEffect(() => {
    let stoppad = false
    ;(async () => {
      let rows: TemplateRow[] = []
      try {
        const res = await fetch('/api/message-templates')
        if (res.ok) rows = (await res.json()).templates ?? []
      } catch { /* utan svar används standardtexten */ }
      if (stoppad) return
      setText(fill(bodyFor(rows, 'cancellation'), {
        '{namn}':        booking.customerName,
        '{behandling}':  booking.service,
        '{datum}':       datumText(booking.date),
        '{tid}':         booking.time,
        '{medarbetare}': staffName ?? '',
        '{salong}':      '',
      }))
      setLaddad(true)
    })()
    return () => { stoppad = true }
  }, [booking, staffName])

  const harMail = Boolean(booking.email?.trim())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-white font-semibold text-base mb-1">{T.title}</h3>
        <p className="text-slate-400 text-sm mb-4">
          {booking.customerName} · {booking.service} · {datumText(booking.date)} kl {booking.time}
        </p>

        {harMail ? (
          <>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">{T.label}</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              maxLength={CONFIRM_MAX}
              disabled={!laddad}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-100 text-sm p-2.5 resize-y"
            />
            <p className="text-slate-500 text-xs mt-1.5">{T.help(booking.email)}</p>
          </>
        ) : (
          /* Ingen adress är inget fel — men salongen ska veta det innan de
             trycker, inte undra efteråt varför kunden inte hörde något. */
          <p className="text-slate-400 text-sm rounded-lg border-l-2 border-slate-600 pl-3">
            {T.noEmail}
          </p>
        )}

        <div className="flex items-center gap-3 mt-5 flex-wrap">
          {harMail && (
            <button
              onClick={() => onDone(text)}
              disabled={!laddad || !text.trim()}
              className={`text-xs font-bold rounded-lg px-4 py-2 ${
                laddad && text.trim() ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {T.sendAndCancel}
            </button>
          )}
          <button
            onClick={() => onDone(null)}
            className="text-xs font-bold rounded-lg px-4 py-2 bg-slate-800 text-slate-200"
          >
            {harMail ? T.silent : T.justCancel}
          </button>
          <span className="flex-1" />
          <button onClick={onClose} className="text-xs text-slate-400 underline">{T.abort}</button>
        </div>
      </div>
    </div>
  )
}

const T = {
  title:         'Avboka tiden',
  label:         'Meddelande till kunden',
  help:          (mail: string) => `Skickas till ${mail}. Ändringen gäller bara den här kunden — din mall är oförändrad.`,
  noEmail:       'Kunden har ingen mailadress, så inget besked kan skickas. Ring dem gärna i stället.',
  sendAndCancel: 'Avboka och skicka',
  silent:        'Avboka utan att skicka',
  justCancel:    'Avboka tiden',
  abort:         'Ångra',
}
