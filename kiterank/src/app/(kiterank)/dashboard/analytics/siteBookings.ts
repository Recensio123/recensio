import { createAdminClient } from '@/lib/supabase/admin'

/*
 * Bookings that came through the website, and what they were worth.
 *
 * The funnel on the overview stopped at "enquiries" — the point where Analytics
 * runs out. What happened next is the only figure in the product that is money,
 * and it does not come from Google at all: it is in our own booking table.
 *
 * Only bookings made on the booking page count. A time the salon typed in at
 * the desk is a real booking but not one the website produced, and counting it
 * would flatter every number on the page.
 */

export type SiteBookings   = { count: number; valueSEK: number }
export type BookingsByPeriod = Record<'Weekly' | 'Monthly' | 'Yearly', SiteBookings> | null

/** Days back from today for each period on the overview. */
const DAYS: Record<'Weekly' | 'Monthly' | 'Yearly', number> = {
  Weekly: 7, Monthly: 30, Yearly: 365,
}

/**
 * All three windows in one read.
 *
 * The overview's period selector switches between them, so fetching only the
 * month would leave two of the three views showing a figure from a window they
 * do not cover. One query over the longest window, counted three ways.
 */
export async function siteBookings(companyId: string): Promise<BookingsByPeriod> {
  const admin = createAdminClient()
  const from  = new Date()
  from.setDate(from.getDate() - DAYS.Yearly)

  try {
    const { data, error } = await admin
      .from('bookings')
      .select('service_price_sek, source, booking_date')
      .eq('company_id', companyId)
      .gte('booking_date', from.toISOString().slice(0, 10))
      .neq('status', 'cancelled')

    if (error || !data) return null

    /* `source` marks where the booking was made. Anything the salon entered
       itself is excluded — see the note above. */
    const fromSite = data.filter(b => b.source !== 'manual')

    const within = (days: number): SiteBookings => {
      const cut = new Date()
      cut.setDate(cut.getDate() - days)
      const iso  = cut.toISOString().slice(0, 10)
      const rows = fromSite.filter(b => (b.booking_date ?? '') >= iso)
      return {
        count:    rows.length,
        valueSEK: rows.reduce((sum, b) => sum + (b.service_price_sek ?? 0), 0),
      }
    }

    return { Weekly: within(DAYS.Weekly), Monthly: within(DAYS.Monthly), Yearly: within(DAYS.Yearly) }
  } catch {
    /* No booking system on this account, or the table is not migrated — the
       funnel then simply ends where Analytics ends. */
    return null
  }
}
