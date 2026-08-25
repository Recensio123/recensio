import { redirect } from 'next/navigation'

/* SMS-fliken blev Kommande och flyttade in i Bokningar: listan handlar om
 * bokningarna den tjänar, inte om kanalen. Den gamla adressen fungerar kvar för
 * bokmärken och gamla länkar. */
export default function SMSPage() {
  redirect('/dashboard/bokningar?flik=kommande')
}
