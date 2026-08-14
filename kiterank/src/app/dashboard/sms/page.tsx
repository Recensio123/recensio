import { redirect } from 'next/navigation'

/* SMS moved into Bokningar — the sendouts belong to the calendar they serve.
 * The old address keeps working for bookmarks and old links. */
export default function SMSPage() {
  redirect('/dashboard/bokningar?flik=sms')
}
