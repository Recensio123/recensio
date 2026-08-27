/*
 * JSON-LD som är säker att lägga i en <script>-tagg.
 *
 * JSON.stringify escapar inte `<`, och webbläsaren läser inte JSON — den
 * letar efter `</script>`. Ett företagsnamn eller en tjänstetext som
 * innehåller den strängen stänger taggen i förtid, och resten av innehållet
 * körs som skript hos varje besökare: lagrad XSS på vår domän, planterad via
 * ett vanligt textfält i editorn.
 *
 * `<` är samma tecken för JSON-läsaren men osynligt för tagg-letaren.
 * Google läser strukturerad data efter JSON-tolkning, så sökresultaten ser
 * ingen skillnad.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
