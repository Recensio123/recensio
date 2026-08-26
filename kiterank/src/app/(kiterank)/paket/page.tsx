import { redirect } from 'next/navigation'

/* Sidan bytte namn till /priser. Adressen behålls som omdirigering — den kan
   ligga i någons bokmärken eller i ett mejl, och en 404 där ett pris skulle
   ha stått är en förlorad kund. */
export default function PaketPage() {
  redirect('/priser')
}
