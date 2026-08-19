export const MICROS = 1_000_000

export function fmtMicros(micros: number, currency = 'SEK') {
  return `${(micros / MICROS).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} ${currency}`
}

/*
 * What came back from /api/ads/update-extensions.
 *
 * The route answers `applied: false` with a reason whenever the click reached
 * us but never reached Google — no Ads account, no running campaign, or a
 * Business Profile that has not been linked yet. Returning a sentence rather
 * than a boolean keeps every card saying the same thing about the same case.
 *
 * `null` means it went through.
 */
export function extensionBlocker(
  json: { applied?: boolean; reason?: string },
  sv: boolean,
): string | null {
  if (json.applied !== false) return null
  switch (json.reason) {
    case 'no_ads_account':
      return sv
        ? 'Inget Google Ads-konto är kopplat, så ändringen sparades inte.'
        : 'No Google Ads account is connected, so nothing was saved.'
    case 'no_campaigns':
      return sv
        ? 'Du har ingen aktiv kampanj att koppla det till ännu.'
        : 'You have no running campaign to attach this to yet.'
    case 'profile_not_linked':
      return sv
        ? 'Din Google-företagsprofil är inte länkad till annonskontot ännu. Den länkningen görs inne i Google Ads, under Länkade konton.'
        : 'Your Google Business Profile is not linked to the ads account yet. That link is made inside Google Ads, under Linked accounts.'
    default:
      return sv ? 'Ändringen sparades inte.' : 'The change was not saved.'
  }
}
