/*
 * The pieces the SMS page and its customer list both need.
 *
 * Kept apart so the list at the top of the page and the template editors
 * below it read from one definition of a booking, one personaliser and one
 * segment counter — three things that must never disagree about what a
 * message will actually look like.
 */

export type Mode = 'auto' | 'manual'
export type TimeUnit = 'h' | 'd'

/** Which of the two sendouts a row is talking about. */
export type Flow = 'reminder' | 'review'

export const PLACEHOLDERS = ['{namn}', '{datum}', '{tid}', '{tjänst}', '{länk}']

/* Sample bookings — mirrors the bookings table while it is empty in
   development. hasPhone: false demonstrates the email fallback. */
export type Row = {
  id: string; name: string; service: string; when: string
  dateLabel: string; timeLabel: string; hasPhone: boolean
  /** What the visit is worth — the salon reads the list differently when a
   *  2 200 kr colour is the one about to go unreminded. */
  price: number
  /** Upcoming visits await a reminder; finished ones await a review request. */
  stage: 'upcoming' | 'completed'
}

export const UPCOMING: Row[] = [
  { id: 'u1', name: 'Anna Karlsson', service: 'Klippning dam', when: 'Idag kl 10:00',    dateLabel: 'idag',    timeLabel: '10:00', price: 650,  hasPhone: true,  stage: 'upcoming' },
  { id: 'u2', name: 'Sara Blom',     service: 'Balayage',      when: 'Idag kl 13:00',    dateLabel: 'idag',    timeLabel: '13:00', price: 2200, hasPhone: true,  stage: 'upcoming' },
  { id: 'u3', name: 'Johan Persson', service: 'Herrklippning', when: 'Imorgon kl 09:30', dateLabel: 'imorgon', timeLabel: '09:30', price: 450,  hasPhone: false, stage: 'upcoming' },
]

export const COMPLETED: Row[] = [
  { id: 'c1', name: 'Erik Sandberg',   service: 'Skägg & kontur',     when: 'I förrgår',     dateLabel: '', timeLabel: '', price: 250,  hasPhone: true,  stage: 'completed' },
  { id: 'c2', name: 'Maria Lindqvist', service: 'Slingor (helhuvud)', when: '4 dagar sedan', dateLabel: '', timeLabel: '', price: 1900, hasPhone: false, stage: 'completed' },
]

export function formatPrice(sek: number): string {
  return `${sek.toLocaleString('sv-SE')} kr`
}

/** Every booking in one list — upcoming first, the way a week reads. */
export const ALL_ROWS: Row[] = [...UPCOMING, ...COMPLETED]

export function smsSegments(text: string): number {
  return text.length === 0 ? 0 : Math.ceil(text.length / 160)
}

/* Fill the template with this customer's details — the starting point for a
   personalised message. {länk} stays; the review link is inserted at send time. */
export function personalize(template: string, row: Row): string {
  return template
    .replaceAll('{namn}', row.name.split(' ')[0])
    .replaceAll('{tjänst}', row.service.toLowerCase())
    .replaceAll('{datum}', row.dateLabel || row.when)
    .replaceAll('{tid}', row.timeLabel)
    .replace(/\s+kl\s*[.!,]/g, m => m.replace(/\s+kl\s*/, '')) // tidy if {tid} was empty
}
