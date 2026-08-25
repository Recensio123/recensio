import { JuridiskSida } from '@/components/JuridiskSida'

export const metadata = {
  title:       'Integritetspolicy | Kiterank',
  description: 'Hur Kiterank behandlar personuppgifter, vilka leverantörer som anlitas och vilka rättigheter du har.',
}

export const revalidate = 300

export default function IntegritetspolicyPage() {
  return <JuridiskSida slug="integritetspolicy" />
}
