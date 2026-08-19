/* Domänraden som panelen ser den.
 *
 * Samma form som API:t skickar, så inget behöver översättas på vägen in — och
 * ändras kolumnerna är det den här filen som gör att kompilatorn hittar varje
 * ställe som behöver följa med. */

import type { MailMode } from '@/lib/mailProviders'

export type DomainRow = {
  domain:      string
  verified_at: string | null
  is_primary:  boolean

  /** 'records' — kunden håller sin DNS. 'nameservers' — vi håller den. */
  mode:        'records' | 'nameservers'
  nameservers: string[] | null

  /** Zonen som den såg ut före bytet. Skyddet mot att släcka befintlig mail. */
  imported_zone: { records: unknown[]; hasMail: boolean; nameservers: string[] } | null
  imported_at:   string | null

  mail_mode:        MailMode
  mail_forward_to:  string | null
  mail_verified_at: string | null
}
