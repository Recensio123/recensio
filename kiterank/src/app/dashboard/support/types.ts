// Support content model. Swedish is the primary language and always present;
// English is filled in by the translation pass and falls back to Swedish
// until it exists.
export type L = { sv: string; en?: string }

export type SupportTerm = {
  term: L   // the label/number/element as it appears on the page
  def:  L   // plain-language explanation of what it means and how to read it
}

export type SupportSection = {
  id:       string   // anchor; matches the under-tab id where applicable
  heading:  L
  body:     L[]      // paragraphs
  terms?:   SupportTerm[]
}

export type SupportTopic = {
  id:       string   // URL slug under /dashboard/support/
  title:    L
  intro:    L
  sections: SupportSection[]
}

export function pick(l: L, lang: 'sv' | 'en'): string {
  return lang === 'en' ? (l.en ?? l.sv) : l.sv
}
