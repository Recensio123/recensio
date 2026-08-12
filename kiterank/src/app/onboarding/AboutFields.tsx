'use client'

/*
 * The questions a salon answers before we build their site.
 *
 * Every box here turns into text a visitor reads: the description and what
 * makes them special become the about page, the services become the headline
 * and the tagline, the town goes into every search phrase on the site. Six
 * short answers, one finished website — see lib/siteTemplates for what each
 * one becomes.
 */

export type AboutBusiness = {
  description: string; services: string; area: string; special: string
  years: string; team: string
}

/** The questions, rendered the same way in both setup paths. */
export function AboutFields({ about, onChange, lang = 'sv' }: {
  about:    AboutBusiness
  onChange: (next: AboutBusiness) => void
  lang?:    'sv' | 'en'
}) {
  const sv = lang === 'sv'
  const box = 'w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-mustard/50 focus:ring-1 focus:ring-mustard/30 transition-colors text-sm leading-relaxed'
  const label = 'block text-sm font-medium text-slate-300 mb-2'
  const hint = 'text-slate-500 text-xs mt-1.5'

  return (
    <div className="space-y-5">
      <div>
        <label className={label}>{sv ? 'Beskriv verksamheten' : 'Describe the business'}</label>
        <textarea
          value={about.description} rows={4} maxLength={600}
          onChange={e => onChange({ ...about, description: e.target.value })}
          placeholder={sv
            ? 'Vad gör ni? Hur länge har ni funnits? Vad är ni mest kända för? Skriv som du skulle berätta det för en ny kund.'
            : 'What do you do? How long have you been around? What are you known for?'}
          className={box}
        />
      </div>

      <div>
        <label className={label}>{sv ? 'Dina viktigaste tjänster' : 'Your main services'}</label>
        <input
          type="text" value={about.services} maxLength={120}
          onChange={e => onChange({ ...about, services: e.target.value })}
          placeholder={sv ? 'T.ex. balayage, klippning, slingor' : 'E.g. balayage, haircuts, highlights'}
          className={box}
        />
        <p className={hint}>
          {sv ? 'Orden dina kunder söker på — de vävs in där Google letar.' : 'The words your customers search for.'}
        </p>
      </div>

      <div>
        <label className={label}>{sv ? 'Ort eller område' : 'Town or area'}</label>
        <input
          type="text" value={about.area} maxLength={60}
          onChange={e => onChange({ ...about, area: e.target.value })}
          placeholder={sv ? 'T.ex. Södermalm, Stockholm' : 'E.g. Södermalm, Stockholm'}
          className={box}
        />
        <p className={hint}>
          {sv ? 'Lokala sökningar är "tjänst + ort" — orten är halva sökordet.' : 'Local searches are "service + area".'}
        </p>
      </div>

      <div>
        <label className={label}>{sv ? 'Vad gör er speciella?' : 'What makes you special?'}</label>
        <textarea
          value={about.special} rows={3} maxLength={300}
          onChange={e => onChange({ ...about, special: e.target.value })}
          placeholder={sv
            ? 'Det som får kunder att välja just er — bemötandet, erfarenheten, specialiteten…'
            : 'What makes customers choose you — the welcome, the experience, the speciality…'}
          className={box}
        />
      </div>

      {/* Two short ones that turn generic copy into their story: the figures
          go on the site as facts, so we only ever state what they told us. */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>{sv ? 'Antal år i branschen' : 'Years in business'}</label>
          <input
            type="text" value={about.years} maxLength={10}
            onChange={e => onChange({ ...about, years: e.target.value })}
            placeholder={sv ? 'T.ex. 12' : 'E.g. 12'}
            className={box}
          />
        </div>
        <div>
          <label className={label}>{sv ? 'Hur många jobbar hos er?' : 'How many work there?'}</label>
          <input
            type="text" value={about.team} maxLength={10}
            onChange={e => onChange({ ...about, team: e.target.value })}
            placeholder={sv ? 'T.ex. 4' : 'E.g. 4'}
            className={box}
          />
        </div>
      </div>
    </div>
  )
}
