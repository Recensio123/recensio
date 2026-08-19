'use client'
import { SMSDashboard } from '../sms/SMSDashboard'
import { BekraftelseEditor } from './BekraftelseEditor'

/*
 * SMS lives inside Bokningar because that is what the sendouts are about:
 * confirmations, reminders and win-back messages all hang off the booking
 * calendar. A separate menu item made it look like its own product.
 *
 * The confirmation editor is handed to the page as a slot so it lands under
 * the sender names, beside the other two things the customer receives from
 * the salon — rather than floating above the page on its own.
 */
export function SmsTab({
  salonName, confirmationText, onConfirmationChange, onConfirmationSave, confirmationSaved, confirmationError,
}: {
  salonName:            string
  confirmationText:     string
  onConfirmationChange: (v: string) => void
  onConfirmationSave:   (v: string) => void
  confirmationSaved:    boolean
  confirmationError:    string
}) {
  return (
    <SMSDashboard
      salonName={salonName}
      confirmationSlot={
        <BekraftelseEditor
          value={confirmationText}
          onChange={onConfirmationChange}
          onSave={onConfirmationSave}
          saved={confirmationSaved}
          error={confirmationError}
          showSmsNote
        />
      }
    />
  )
}
