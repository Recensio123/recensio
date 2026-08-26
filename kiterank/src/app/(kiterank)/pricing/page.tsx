import { redirect } from 'next/navigation'

/*
 * Gamla prissidan, omdirigerad.
 *
 * Här låg en engelsk jämförelse mellan Starter och Pro — två paket som inte
 * finns längre. En sida som säljer något vi inte har är värre än ingen sida
 * alls, och den låg kvar länkad från navigeringen.
 *
 * Adressen behålls som omdirigering i stället för att raderas: den kan finnas
 * i någons bokmärken, i ett mejl eller i Googles index, och en 404 för en
 * prissida är en förlorad kund.
 */
export default function PricingPage() {
  redirect('/priser')
}
