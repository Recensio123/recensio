import { JuridiskSida } from '@/components/JuridiskSida'

export const metadata = {
  title:       'Abonnemangsvillkor | Kiterank',
  description: 'Villkoren för abonnemanget hos Kiterank: paket, priser, betalning, byten och uppsägning.',
}

/* Texten kan ändras i admin när som helst, så sidan får inte cachas för
   evigt. Fem minuter räcker för att slippa en databasfråga per besök. */
export const revalidate = 300

export default function VillkorPage() {
  return <JuridiskSida slug="abonnemangsvillkor" />
}
