/*
 * Shared types and example data for the bookings dashboard.
 *
 * The example set stays active while the real tables are empty (and on
 * databases where the staff migration has not run yet), so the dashboard
 * always shows what a working salon week looks like — three chairs, a full
 * day, one no-show. Example rows have ids starting with 'm' and are never
 * written to the database; status changes on them live only in the browser.
 */

export type Status = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type Source = 'online' | 'phone' | 'walk_in'

export type Booking = {
  id:           string
  customerName: string
  phone:        string
  email:        string
  service:      string
  duration:     number
  price:        number
  date:         string    // YYYY-MM-DD
  time:         string    // HH:MM
  status:       Status
  note:         string
  source:       Source
  channel:      string | null   // utm_source — where the booker came from
  staffId:      string | null
  createdAt:    string
}

export type StaffMember = {
  id:        string
  name:      string
  title:     string | null
  image:     string | null
  /** Per-weekday window, key '0'–'6' (0=Sunday). Null = follows salon hours. */
  schedule:  Record<string, { start: string; end: string } | null> | null
  is_active: boolean
}

export type Absence = {
  id:         string
  staff_id:   string | null
  date_from:  string
  date_to:    string
  start_time: string | null
  end_time:   string | null
  reason:     string | null
}

export type ServiceOption = {
  id:       string
  name:     string
  duration: number
  price:    number | null
}

export const isExample = (id: string) => id.startsWith('m')

export function daysFromToday(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

/* ── The example salon ─────────────────────────────────────────────────── */

export const MOCK_STAFF: StaffMember[] = [
  { id: 'ms1', name: 'Maria Lindqvist', title: 'Frisör & grundare',        image: '/exempel/medarbetare-1.svg', schedule: null, is_active: true },
  { id: 'ms2', name: 'Johan Berg',      title: 'Frisör och färgspecialist', image: '/exempel/medarbetare-2.svg', schedule: null, is_active: true },
  { id: 'ms3', name: 'Sara Nyström',    title: 'Frisör',                   image: '/exempel/medarbetare-3.svg',
    // Works short days — shows what a personal schedule looks like
    schedule: { '1': null, '2': { start: '10:00', end: '16:00' }, '3': { start: '10:00', end: '16:00' }, '4': { start: '10:00', end: '16:00' }, '5': { start: '10:00', end: '16:00' }, '6': { start: '09:00', end: '14:00' }, '0': null },
    is_active: true },
]

export const MOCK_ABSENCES: Absence[] = [
  { id: 'ma1', staff_id: 'ms2', date_from: daysFromToday(4), date_to: daysFromToday(8), start_time: null, end_time: null, reason: 'Semester' },
]

export const MOCK_SERVICES: ServiceOption[] = [
  { id: 'msv1', name: 'Klippning dam',        duration: 45,  price: 650  },
  { id: 'msv2', name: 'Klippning herr',       duration: 30,  price: 450  },
  { id: 'msv3', name: 'Balayage',             duration: 150, price: 2200 },
  { id: 'msv4', name: 'Slingor (helhuvud)',   duration: 150, price: 1900 },
  { id: 'msv5', name: 'Keratin-behandling',   duration: 120, price: 2500 },
  { id: 'msv6', name: 'Skägg & konturering',  duration: 25,  price: 250  },
]

export const MOCK_BOOKINGS: Booking[] = [
  // Today — a day that looks like work
  { id: 'm1',  customerName: 'Anna Karlsson',   phone: '070-123 45 67', email: 'anna@example.com',   service: 'Klippning dam',              duration: 45,  price: 650,  date: daysFromToday(0),  time: '09:00', status: 'confirmed', note: '',                              source: 'online',  channel: 'google',   staffId: 'ms1', createdAt: daysFromToday(-6) },
  { id: 'm2',  customerName: 'Sara Blom',       phone: '073-234 56 78', email: 'sara@example.com',   service: 'Balayage',                   duration: 150, price: 2200, date: daysFromToday(0),  time: '10:00', status: 'pending',   note: 'Vill bli ljusare i topparna',   source: 'online',  channel: 'google',   staffId: 'ms2', createdAt: daysFromToday(-2) },
  { id: 'm3',  customerName: 'Johan Persson',   phone: '070-345 67 89', email: '',                   service: 'Klippning herr',             duration: 30,  price: 450,  date: daysFromToday(0),  time: '11:30', status: 'confirmed', note: '',                              source: 'phone',   channel: null,       staffId: 'ms1', createdAt: daysFromToday(-4) },
  { id: 'm4',  customerName: 'Elin Åberg',      phone: '072-456 78 90', email: 'elin@example.com',   service: 'Klippning dam',              duration: 45,  price: 650,  date: daysFromToday(0),  time: '13:00', status: 'confirmed', note: '',                              source: 'online',  channel: 'facebook', staffId: 'ms3', createdAt: daysFromToday(-3) },
  { id: 'm5',  customerName: 'Oskar Nilsson',   phone: '070-567 11 22', email: '',                   service: 'Klippning herr + Skägg & konturering', duration: 55, price: 700, date: daysFromToday(0), time: '14:30', status: 'confirmed', note: '',                    source: 'walk_in', channel: null,       staffId: 'ms1', createdAt: daysFromToday(0)  },
  { id: 'm6',  customerName: 'Petra Sund',      phone: '073-678 33 44', email: 'petra@example.com',  service: 'Slingor (helhuvud)',         duration: 150, price: 1900, date: daysFromToday(0),  time: '14:00', status: 'confirmed', note: '',                              source: 'online',  channel: 'instagram', staffId: 'ms3', createdAt: daysFromToday(-1) },
  // Tomorrow and onwards
  { id: 'm7',  customerName: 'Lisa Marklund',   phone: '076-456 78 90', email: 'lisa@example.com',   service: 'Keratin-behandling',         duration: 120, price: 2500, date: daysFromToday(1),  time: '11:00', status: 'pending',   note: '',                              source: 'online',  channel: 'google',   staffId: 'ms1', createdAt: daysFromToday(-1) },
  { id: 'm8',  customerName: 'Hanna Ek',        phone: '070-890 12 34', email: '',                   service: 'Klippning dam',              duration: 45,  price: 650,  date: daysFromToday(2),  time: '09:30', status: 'confirmed', note: '',                              source: 'online',  channel: 'direct',   staffId: 'ms2', createdAt: daysFromToday(-1) },
  // History — the numbers the stats stand on
  { id: 'm9',  customerName: 'Erik Sandberg',   phone: '070-567 89 01', email: 'erik@example.com',   service: 'Skägg & konturering',        duration: 25,  price: 250,  date: daysFromToday(-2), time: '15:30', status: 'completed', note: '',                              source: 'walk_in', channel: null,       staffId: 'ms1', createdAt: daysFromToday(-9)  },
  { id: 'm10', customerName: 'Maria Öman',      phone: '073-678 90 12', email: 'maria@example.com',  service: 'Slingor (helhuvud)',         duration: 150, price: 1900, date: daysFromToday(-4), time: '10:00', status: 'completed', note: '',                              source: 'online',  channel: 'google',   staffId: 'ms3', createdAt: daysFromToday(-12) },
  { id: 'm11', customerName: 'Peter Holm',      phone: '070-789 01 23', email: 'peter@example.com',  service: 'Klippning herr',             duration: 30,  price: 450,  date: daysFromToday(-5), time: '16:00', status: 'no_show',   note: '',                              source: 'online',  channel: 'facebook', staffId: 'ms2', createdAt: daysFromToday(-11) },
]
