import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ slug: string }> }

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minsToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

// GET /api/book/[slug]/slots?date=YYYY-MM-DD&duration=60
export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const date     = searchParams.get('date')
  const duration = parseInt(searchParams.get('duration') ?? '60', 10)

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Look up company by slug
  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  // Get availability for this day of week
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()

  const { data: avail } = await admin
    .from('booking_availability')
    .select('open_time, close_time, slot_duration_minutes, is_active')
    .eq('company_id', company.id)
    .eq('day_of_week', dayOfWeek)
    .single()

  // Closed if no availability row or is_active = false
  if (!avail || !avail.is_active) {
    return NextResponse.json({ slots: [] })
  }

  const openMins  = timeToMins(avail.open_time)
  const closeMins = timeToMins(avail.close_time)
  const interval  = avail.slot_duration_minutes

  // Fetch already-booked slots for this date (exclude cancelled)
  const { data: existingBookings } = await admin
    .from('bookings')
    .select('start_time, end_time')
    .eq('company_id', company.id)
    .eq('booking_date', date)
    .neq('status', 'cancelled')

  const booked = existingBookings ?? []

  // Generate slot grid
  const slots: { time: string; available: boolean }[] = []
  let cur = openMins

  while (cur + duration <= closeMins) {
    const slotStart = cur
    const slotEnd   = cur + duration

    // A slot is unavailable if any existing booking overlaps [slotStart, slotEnd)
    const blocked = booked.some(b => {
      const bStart = timeToMins(b.start_time)
      const bEnd   = timeToMins(b.end_time)
      return bStart < slotEnd && bEnd > slotStart
    })

    slots.push({ time: minsToTime(slotStart), available: !blocked })
    cur += interval
  }

  return NextResponse.json({ slots })
}
