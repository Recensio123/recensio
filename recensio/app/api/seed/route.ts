import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  const { data: userData } = await admin.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const companyId = userData.company_id
  const now = Date.now()
  const t = (hoursAgo: number) => new Date(now - hoursAgo * 3600 * 1000).toISOString()
  const ahead = (hoursAhead: number) => new Date(now + hoursAhead * 3600 * 1000).toISOString()

  // Rensa befintliga data (loggar måste raderas innan kunder pga FK)
  await admin.from('sms_log').delete().eq('company_id', companyId)
  await admin.from('review_responses').delete().eq('company_id', companyId)
  await admin.from('customers').delete().eq('company_id', companyId)

  // Hämta första aktiva kampanjen (för referral-exemplet)
  const { data: campaigns } = await admin.from('campaigns').select('id, name').eq('company_id', companyId).eq('active', true).limit(1)
  const campaignId = campaigns?.[0]?.id ?? null
  const campaignName = campaigns?.[0]?.name ?? 'Kampanj'

  const SMS_TPL = 'Hej {förnamn}! Tack för att du anlitade {företag}. Nöjd med jobbet? 30 sek 🙏\n\n→ recensio.se/r/{kod}'

  const rendered = (name: string, company: string) =>
    SMS_TPL.replace('{förnamn}', name.split(' ')[0]).replace('{företag}', company).replace('{kod}', 'abc123')

  const { data: company } = await admin.from('companies').select('name').eq('id', companyId).single()
  const companyName = company?.name ?? 'ditt företag'

  const customerRows = [
    // Kommande (pending)
    { name: 'Sofia Ek',        phone: '0701234567', platform: 'google',      status: 'pending',  stars: null, review_text: null, scheduled_for: ahead(1),  sms_sent_at: null, outbound_sms: null,                              followup_cancelled: false, followup_scheduled_at: null, followup_message: null },
    { name: 'Lars Henriksson', phone: '0762345678', platform: 'google',      status: 'pending',  stars: null, review_text: null, scheduled_for: ahead(4),  sms_sent_at: null, outbound_sms: null,                              followup_cancelled: false, followup_scheduled_at: null, followup_message: null },
    { name: 'Maja Björk',      phone: '0723456789', platform: 'reco',        status: 'pending',  stars: null, review_text: null, scheduled_for: ahead(24), sms_sent_at: null, outbound_sms: null,                              followup_cancelled: false, followup_scheduled_at: null, followup_message: null },
    { name: 'Tobias Lund',     phone: '0734567890', platform: 'google',      status: 'pending',  stars: null, review_text: null, scheduled_for: ahead(48), sms_sent_at: null, outbound_sms: null,                              followup_cancelled: false, followup_scheduled_at: null, followup_message: null },
    // Skickat
    { name: 'Britta Nilsson',  phone: '0725678901', platform: 'google',      status: 'sent',     stars: null, review_text: null, scheduled_for: null,       sms_sent_at: t(8), outbound_sms: rendered('Britta Nilsson', companyName), followup_cancelled: false, followup_scheduled_at: null, followup_message: null },
    // Recensioner
    { name: 'Anna Lindgren',   phone: '0706789012', platform: 'google',      status: 'reviewed', stars: 5, review_text: null, scheduled_for: null, sms_sent_at: t(26), outbound_sms: rendered('Anna Lindgren', companyName),  redirect_platform: 'google', followup_scheduled_at: ahead(2),  followup_cancelled: false, followup_campaign_id: campaignId, followup_message: `Hej {förnamn}! Vad kul att du var nöjd 🌟 Tipsa gärna en vän om {företag} – det betyder mycket för oss. Tack!` },
    { name: 'Per Karlsson',    phone: '0737890123', platform: 'reco',        status: 'reviewed', stars: 5, review_text: null, scheduled_for: null, sms_sent_at: t(50), outbound_sms: rendered('Per Karlsson', companyName),   redirect_platform: 'reco',   followup_scheduled_at: ahead(6),  followup_cancelled: false, followup_campaign_id: campaignId, followup_message: `Hej {förnamn}! Tack för att du tog dig tid att lämna en recension 🙏 Vi hoppas vi ses igen hos {företag}!` },
    { name: 'Karin Ström',     phone: '0708901234', platform: 'reco',        status: 'reviewed', stars: 4, review_text: null, scheduled_for: null, sms_sent_at: t(72), outbound_sms: rendered('Karin Ström', companyName),    redirect_platform: 'reco',   followup_scheduled_at: ahead(22), followup_cancelled: true,  followup_campaign_id: campaignId, followup_message: `Hej {förnamn}! Tack för din recension ⭐ Vi ser fram emot att välkomna dig igen hos {företag}.` },
    { name: 'Erik Magnusson',  phone: '0739012345', platform: 'hittaproffs', status: 'reviewed', stars: 5, review_text: null, scheduled_for: null, sms_sent_at: t(96), outbound_sms: rendered('Erik Magnusson', companyName), redirect_platform: 'google', followup_scheduled_at: ahead(46), followup_cancelled: false, followup_campaign_id: campaignId, followup_message: `Hej {förnamn}! Tack för din fina recension 🌟 Dela gärna {företag} med en vän – ni får båda 200 kr rabatt på nästa besök.` },
    // Privat
    { name: 'Johan Berg',      phone: '0760123456', platform: 'google',      status: 'private',  stars: 2, review_text: 'Kom för sent och kommunicerade inte det.',      scheduled_for: null, sms_sent_at: t(30), outbound_sms: rendered('Johan Berg', companyName), followup_cancelled: false, followup_scheduled_at: null, followup_message: null },
  ].map(c => ({ ...c, company_id: companyId, source: 'manual' }))

  const { data: inserted, error: custErr } = await admin.from('customers').insert(customerRows).select()
  if (custErr) return NextResponse.json({ error: custErr.message }, { status: 500 })

  // Lägg till sms_log-poster för icke-pending kunder
  const nonPending = inserted?.filter(c => c.status !== 'pending') ?? []
  const logRows = nonPending.map(c => ({
    company_id:      companyId,
    customer_id:     c.id,
    type:            'outbound',
    message:         c.outbound_sms,
    recipient_phone: c.phone,
    status:          'sent',
    sent_at:         c.sms_sent_at,
  }))

  // Anna Lindgren får även en kampanj-logg (referral)
  const anna = inserted?.find(c => c.name === 'Anna Lindgren')
  if (anna) {
    logRows.push({
      company_id:      companyId,
      customer_id:     anna.id,
      campaign_id:     campaignId,
      type:            'campaign',
      message:         `Hej Anna! Vad kul att du var nöjd ⭐ Tipsa en vän och ni får båda 200 kr rabatt.\n\nDin länk: recensio.se/referral/al12x`,
      recipient_phone: anna.phone,
      status:          'sent',
      sent_at:         new Date(now - 2 * 3600 * 1000).toISOString(),
    } as never)
  }

  if (logRows.length) {
    const { error: logErr } = await admin.from('sms_log').insert(logRows as never[])
    if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, customers: inserted?.length, logs: logRows.length })
}
