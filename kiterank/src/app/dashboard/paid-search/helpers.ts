export const MICROS = 1_000_000

export function fmtMicros(micros: number, currency = 'SEK') {
  return `${(micros / MICROS).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} ${currency}`
}
