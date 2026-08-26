/*
 * Markdown, i den delmängd vi faktiskt använder.
 *
 * Rubriker, stycken, listor, tabeller, fet stil och avdelare. Ett bibliotek
 * hade tagit hand om resten också, men texterna skrivs i en textruta i admin
 * och ingen skriver bilder eller kodblock i ett avtal eller en månadsrapport.
 *
 * Ingenting går genom dangerouslySetInnerHTML — allt renderas som React-noder,
 * så en klistrad html-tagg i en text blir text och inte kod.
 *
 * Delas av villkorssidorna och kundrapporterna. Två renderare för samma
 * textformat är två sätt att visa samma dokument olika, och den dagen någon
 * lägger till en tabell i en rapport ska den se ut som tabellerna i avtalen.
 */

export function Markdown({ text }: { text: string }) {
  const rader = text.split(/\r?\n/)
  const ut: React.ReactNode[] = []
  let i = 0

  while (i < rader.length) {
    const rad = rader[i]

    if (!rad.trim())            { i++; continue }
    if (/^---+$/.test(rad.trim())) {
      ut.push(<hr key={i} className="border-white/10 my-8" />)
      i++; continue
    }

    if (rad.startsWith('# ')) {
      ut.push(<h1 key={i} className="text-2xl font-bold mb-6 text-white">{rad.slice(2)}</h1>)
      i++; continue
    }
    if (rad.startsWith('## ')) {
      ut.push(<h2 key={i} className="text-lg font-bold mt-9 mb-3 text-white">{rad.slice(3)}</h2>)
      i++; continue
    }
    if (rad.startsWith('### ')) {
      ut.push(<h3 key={i} className="text-base font-semibold mt-6 mb-2 text-white">{rad.slice(4)}</h3>)
      i++; continue
    }

    /* Tabell: rubrikrad, skiljerad, och sedan innehåll tills raderna tar slut. */
    if (rad.startsWith('|') && rader[i + 1]?.trim().startsWith('|')) {
      const celler = (r: string) => r.split('|').slice(1, -1).map(c => c.trim())
      const rubrik = celler(rad)
      let j = i + 2
      const kropp: string[][] = []
      while (j < rader.length && rader[j].trim().startsWith('|')) { kropp.push(celler(rader[j])); j++ }

      ut.push(
        <div key={i} className="my-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {rubrik.map((c, k) => (
                  <th key={k} className="text-left font-semibold text-white/80 border-b border-white/15 py-2 pr-4 align-top">
                    <Rad text={c} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kropp.map((r, k) => (
                <tr key={k}>
                  {r.map((c, l) => (
                    <td key={l} className="border-b border-white/5 py-2 pr-4 text-white/55 align-top">
                      <Rad text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      i = j; continue
    }

    /* Punktlista */
    if (/^[-*] /.test(rad)) {
      const poster: string[] = []
      while (i < rader.length && /^[-*] /.test(rader[i])) { poster.push(rader[i].slice(2)); i++ }
      ut.push(
        <ul key={`ul${i}`} className="space-y-1.5 my-4 ml-1">
          {poster.map((p, k) => (
            <li key={k} className="flex gap-2.5 text-white/55 leading-relaxed">
              <span className="text-[#f0b429] shrink-0">·</span>
              <span><Rad text={p} /></span>
            </li>
          ))}
        </ul>,
      )
      continue
    }

    /* Numrerad lista */
    if (/^\d+\. /.test(rad)) {
      const poster: string[] = []
      while (i < rader.length && /^\d+\. /.test(rader[i])) { poster.push(rader[i].replace(/^\d+\.\s/, '')); i++ }
      ut.push(
        <ol key={`ol${i}`} className="space-y-1.5 my-4 ml-1">
          {poster.map((p, k) => (
            <li key={k} className="flex gap-2.5 text-white/55 leading-relaxed">
              <span className="text-[#f0b429] shrink-0 tabular-nums">{k + 1}.</span>
              <span><Rad text={p} /></span>
            </li>
          ))}
        </ol>,
      )
      continue
    }

    ut.push(
      <p key={i} className="text-white/55 leading-relaxed my-3">
        <Rad text={rad} />
      </p>,
    )
    i++
  }

  return <>{ut}</>
}

/** Fet stil inuti en rad. Allt annat lämnas som text. */
function Rad({ text }: { text: string }) {
  const delar = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {delar.map((d, i) =>
        d.startsWith('**') && d.endsWith('**')
          ? <strong key={i} className="text-white font-semibold">{d.slice(2, -2)}</strong>
          : <span key={i}>{d}</span>,
      )}
    </>
  )
}
