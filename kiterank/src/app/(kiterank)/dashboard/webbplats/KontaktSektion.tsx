'use client'
import type { ReactNode } from 'react'
import { SOCIAL_FIELDS } from '@/lib/siteSocial'
import { Field, F } from './fields'
import { useSajt } from './sajtInnehall'

/*
 * Kontaktuppgifterna och de sociala länkarna.
 *
 * Första sektionen som flyttat ut ur redigeraren, och den finns här för att
 * visa formen: innehållet hämtas ur kontexten med useSajt(), inte genom props.
 * Skillnaden är hela poängen med uppdelningen — den här sektionen rör sju fält
 * i innehållet, och som props hade det blivit sju rader i anropet och sju i
 * signaturen varje gång något ändras.
 *
 * Den enda propen är `visasVar`. Den ritar rutan som säger var sektionen syns,
 * och den hör till panelens sidhantering snarare än till innehållet — därför
 * kommer den utifrån i stället för ur kontexten.
 */

export function KontaktSektion({ visasVar }: {
  visasVar: () => ReactNode
}) {
  const { content, patch, patchSocial } = useSajt()

  return (
    <>
      {/*
        * Uppgifterna skrivs här, inte i sidfoten.
        *
        * De stod tidigare bara att ändra genom att klicka i förhandsvisningen —
        * men de gäller varje sida, inte platsen de råkar visas på. Och den som
        * letar efter sitt telefonnummer i en panel som heter Kontakt &
        * öppettider ska hitta det där.
        */}
      <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: 0 }}>
        Visas i sidfoten på varje sida{content.address?.trim() ? ', med en Hitta hit-länk till kartan' : ''}.
      </p>
      <Field label="Telefon"    value={content.phone}        onChange={v => patch('phone', v)}   placeholder="070 123 45 67" max={20} />
      <Field label="E-post"     value={content.email ?? ''}  onChange={v => patch('email', v)}   placeholder="hej@dinsalong.se" max={60} />
      <Field label="Adress"     value={content.address}      onChange={v => patch('address', v)} placeholder="Södermalm, Stockholm" max={60} />
      <Field label="Öppettider" value={content.hours}        onChange={v => patch('hours', v)}   placeholder="Mån–Fre 09–19 · Lör 10–17" max={80} />

      <div style={{ height: 1, background: '#1e293b' }} />
      <p style={{ fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: F, margin: 0 }}>
        Sociala medier
      </p>
      <p style={{ fontSize: 11, color: '#64748b', fontFamily: F, lineHeight: 1.5, margin: '-8px 0 0' }}>
        De du fyller i visas under galleriet, i menyn och längst ner på varje sida.
      </p>
      {/* Adressen städas när den renderas, så "@dinsalong" räcker. */}
      {SOCIAL_FIELDS.map(f => (
        <Field
          key={f.key}
          label={f.name}
          value={content.social?.[f.key] ?? ''}
          onChange={v => patchSocial(f.key, v)}
          placeholder={f.placeholder}
        />
      ))}
      {visasVar()}
    </>
  )
}
