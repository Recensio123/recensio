'use client'
import { useState } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { ExternalLink } from '@/components/ExternalLink'
import { type GBPData, type GBPHoursPeriod } from './types'
import { useLang, type Lang } from '@/components/LanguageProvider'

type AuditItem = {
  label:          string
  passed:         boolean
  tip:            string
  note?:          string   // descriptive text shown below label when not passed
  editableField?: 'description' | 'phone' | 'hours' | 'services' | 'attributes'
  tabLink?:       string   // switches to this tab in the dashboard
  externalLink?:  string   // opens in new tab (Google etc.)
  btnAdd?:        string   // button label when not passed
  btnEdit?:       string   // button label when passed (omit to hide button when passed)
}

type AttrMeta = {
  attributeId:      string
  valueType:        string
  displayName:      string
  groupDisplayName: string
}

type AttrCurrent = {
  attributeId: string
  values?:     boolean[]
}

type AuditGroup = {
  id:      'impact' | 'details' | 'activity'
  heading: string
  items:   AuditItem[]
}

const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'] as const
const DAY_LABEL: Record<Lang, Record<string, string>> = {
  sv: { MONDAY:'Mån', TUESDAY:'Tis', WEDNESDAY:'Ons', THURSDAY:'Tor', FRIDAY:'Fre', SATURDAY:'Lör', SUNDAY:'Sön' },
  en: { MONDAY:'Mon', TUESDAY:'Tue', WEDNESDAY:'Wed', THURSDAY:'Thu', FRIDAY:'Fri', SATURDAY:'Sat', SUNDAY:'Sun' },
}
type DayHours = { isOpen: boolean; from: string; to: string }

const T = {
  sv: {
    completeTitle:    'Din profil är komplett',
    completeSub:      'Allt är på plats. Det som räknas nu är månadsrytmen nedan — inlägg, foton och nya recensioner håller dig före konkurrenter som satte upp sin profil en gång och slutade.',
    ofComplete:       (p: number, tot: number) => `${p} av ${tot} klara`,
    progressTooltip:  'Hur många av checklistans punkter som är på plats på din profil. Grön stapel betyder att allt är klart.',
    stillToDo:        (n: number) => `${n} punkt${n === 1 ? '' : 'er'} kvar`,
    monthlyUpkeep:    'Månadsrutin',
    loading:          'Laddar…',
    noAttributes:     'Inga egenskaper tillgängliga för din företagskategori.',
    attrLoadFailed:   'Kunde inte ladda egenskaper',
    saving:           'Sparar…',
    saveToGoogle:     'Spara till Google',
    cancel:           'Avbryt',
    saved:            'Sparat ✓',
    saveFailed:       'Kunde inte spara',
    saveHours:        'Spara öppettider',
    saveServices:     (n: number) => `Spara ${n} tjänst${n === 1 ? '' : 'er'}`,
    open:             'Öppet',
    closed:           'Stängt',
    add:              'Lägg till',
    servicesHint:     'Tryck Enter eller klicka Lägg till. Ta bort en tjänst genom att klicka ×.',
    servicePlaceholder: 't.ex. Akututryckning, Pannbyte…',
    removeService:    (svc: string) => `Ta bort ${svc}`,
    descPlaceholder:  'Beskriv ditt företag — vad ni gör, var ni finns och varför kunder ska välja er. Sikta på 250–750 tecken.',
  },
  en: {
    completeTitle:    'Your profile is complete',
    completeSub:      'Everything is set up. What matters now is the monthly rhythm below — posting, photos, and fresh reviews keep your listing ahead of competitors who set up once and stopped.',
    ofComplete:       (p: number, tot: number) => `${p} of ${tot} complete`,
    progressTooltip:  'How many checklist items are in place on your profile. A green bar means everything is done.',
    stillToDo:        (n: number) => `${n} item${n === 1 ? '' : 's'} still to do`,
    monthlyUpkeep:    'Monthly upkeep',
    loading:          'Loading…',
    noAttributes:     'No attributes available for this business category.',
    attrLoadFailed:   'Failed to load attributes',
    saving:           'Saving…',
    saveToGoogle:     'Save to Google',
    cancel:           'Cancel',
    saved:            'Saved ✓',
    saveFailed:       'Save failed',
    saveHours:        'Save hours',
    saveServices:     (n: number) => `Save ${n} service${n === 1 ? '' : 's'}`,
    open:             'Open',
    closed:           'Closed',
    add:              'Add',
    servicesHint:     'Press Enter or click Add. Remove a service by clicking ×.',
    servicePlaceholder: 'e.g. Emergency callout, Boiler installation…',
    removeService:    (svc: string) => `Remove ${svc}`,
    descPlaceholder:  'Describe your business — what you do, where you operate, and what makes you the right choice. Aim for 250–750 characters.',
  },
}

// Ordered by impact on visibility — the items that most affect how the listing
// ranks and converts come first, so a half-finished profile spends its time right.
function buildAudit(data: GBPData, lang: Lang): AuditGroup[] {
  const ownerPhotos = data.mediaItems.filter(m => m.source === 'OWNER').length
  const hasCover    = data.mediaItems.some(m => m.category === 'COVER')
  const recentPost  = data.daysSincePost <= 30
  const hasReviews  = data.totalReviews >= 5

  if (lang === 'sv') {
    return [
      {
        id:      'impact',
        heading: 'Störst effekt',
        items: [
          {
            label:         'Företagsbeskrivning',
            passed:        data.audit.hasDescription,
            tip:           'En beskrivning hjälper Google att förstå ditt företag och ger kunder en anledning att välja dig. Sikta på 250–750 tecken. Nämn din huvudtjänst och din ort på ett naturligt sätt.',
            editableField: 'description',
            btnAdd:        'Lägg till',
            btnEdit:       'Ändra',
          },
          {
            label:         'Tjänster listade',
            passed:        (data.services?.length ?? 0) > 0,
            tip:           'Att lista dina tjänster (t.ex. pannbyte, akututryckning) hjälper Google att visa dig för fler specifika sökningar.',
            editableField: 'services',
            btnAdd:        'Lägg till tjänster',
            btnEdit:       'Ändra',
          },
          {
            label:   'Omslagsfoto',
            passed:  hasCover,
            tip:     'Omslagsfotot är den första bilden kunder ser på din profil. Använd en tydlig, professionell bild av ditt arbete eller din lokal.',
            tabLink: 'photos',
            btnAdd:  'Lägg till foto',
          },
          {
            label:   'Minst 3 egna foton',
            passed:  ownerPhotos >= 3,
            tip:     'Företag med fler foton får betydligt fler vägbeskrivningar och hemsideklick. Sikta på minst 10 foton som visar ditt team, ditt arbete och din lokal.',
            tabLink: 'photos',
            btnAdd:  'Ladda upp foton',
            btnEdit: 'Lägg till fler',
          },
        ],
      },
      {
        id:      'details',
        heading: 'Företagsuppgifter',
        items: [
          {
            label:         'Telefonnummer',
            passed:        data.audit.hasPhone,
            tip:           'Ett telefonnummer på profilen gör det enkelt för kunder att ringa direkt från sökresultatet.',
            editableField: 'phone',
            btnAdd:        'Lägg till',
            btnEdit:       'Ändra',
          },
          {
            label:  'Hemsidelänk',
            passed: true,
            tip:    'En länk till din hemsida ger besökare och visar Google att företaget är etablerat.',
          },
          {
            label:         'Öppettider',
            passed:        data.audit.hasHours,
            tip:           'Öppettider hjälper kunder att veta när de kan nå dig. Du syns också i sökningar på "öppet nu".',
            editableField: 'hours',
            btnAdd:        'Lägg till öppettider',
            btnEdit:       'Ändra öppettider',
          },
          {
            label:         'Egenskaper ifyllda',
            passed:        data.audit.hasAttributes,
            tip:           'Egenskaper som betalsätt, tillgänglighet och språk visas tydligt på din profil och hjälper rätt kunder att hitta dig.',
            editableField: 'attributes',
            btnAdd:        'Fyll i',
            btnEdit:       'Ändra',
          },
        ],
      },
      {
        id:      'activity',
        heading: 'Löpande aktivitet',
        items: [
          {
            label:   'Inlägg de senaste 30 dagarna',
            passed:  recentPost,
            tip:     'Regelbundna inlägg visar Google att företaget är aktivt. Sikta på minst ett inlägg i månaden — fler under högsäsong.',
            tabLink: 'posts',
            btnAdd:  'Skapa ett inlägg',
          },
          {
            label:  'Minst 5 recensioner',
            passed: hasReviews,
            tip:    'Profiler med fler recensioner rankar högre i lokala sökningar och känns mer pålitliga. Be varje nöjd kund om en recension.',
            note:   hasReviews ? undefined : 'Be nöjda kunder om en recension efter varje jobb — ett enkelt sms eller mejl med din recensionslänk räcker.',
            tabLink: 'reviews',
            btnAdd:  'Be om recensioner',
          },
        ],
      },
    ]
  }

  return [
    {
      id:      'impact',
      heading: 'Biggest impact',
      items: [
        {
          label:         'Business description',
          passed:        data.audit.hasDescription,
          tip:           'A description helps Google understand your business and gives customers a reason to choose you. Aim for 250–750 characters, naturally including your main service and location.',
          editableField: 'description',
          btnAdd:        'Add',
          btnEdit:       'Edit',
        },
        {
          label:         'Services listed',
          passed:        (data.services?.length ?? 0) > 0,
          tip:           'Listing your specific services (e.g. boiler installation, emergency callout) helps Google match you to more specific searches.',
          editableField: 'services',
          btnAdd:        'Add services',
          btnEdit:       'Edit',
        },
        {
          label:   'Cover photo',
          passed:  hasCover,
          tip:     'Your cover photo is the first image customers see on your listing. Use a clear, professional image of your work or premises.',
          tabLink: 'photos',
          btnAdd:  'Add photo',
        },
        {
          label:   'At least 3 of your own photos',
          passed:  ownerPhotos >= 3,
          tip:     'Businesses with more photos get significantly more direction requests and website clicks. Aim for at least 10 photos showing your team, work, and premises.',
          tabLink: 'photos',
          btnAdd:  'Upload photos',
          btnEdit: 'Add more',
        },
      ],
    },
    {
      id:      'details',
      heading: 'Business details',
      items: [
        {
          label:         'Phone number',
          passed:        data.audit.hasPhone,
          tip:           'A phone number on your profile makes it easier for customers to call directly from search results.',
          editableField: 'phone',
          btnAdd:        'Add',
          btnEdit:       'Edit',
        },
        {
          label:  'Website URL',
          passed: true,
          tip:    'A website link on your profile drives traffic and signals to Google that your business is established.',
        },
        {
          label:         'Opening hours',
          passed:        data.audit.hasHours,
          tip:           'Setting your hours helps customers know when they can reach you and improves your visibility for "open now" searches.',
          editableField: 'hours',
          btnAdd:        'Add hours',
          btnEdit:       'Edit hours',
        },
        {
          label:         'Attributes set',
          passed:        data.audit.hasAttributes,
          tip:           'Attributes like accepted payment methods, accessibility features, and language support appear prominently on your profile and filter customers to you.',
          editableField: 'attributes',
          btnAdd:        'Set up',
          btnEdit:       'Edit',
        },
      ],
    },
    {
      id:      'activity',
      heading: 'Ongoing activity',
      items: [
        {
          label:   'Post in the last 30 days',
          passed:  recentPost,
          tip:     'Regular posts signal to Google that your business is active. Aim for at least one post per month — more during peak seasons.',
          tabLink: 'posts',
          btnAdd:  'Create a post',
        },
        {
          label:  '5 or more reviews',
          passed: hasReviews,
          tip:    'Profiles with more reviews rank higher in local search and earn more trust from potential customers. Ask every satisfied customer to leave a review.',
          note:   hasReviews ? undefined : 'Ask satisfied customers for a review after every job — a simple text or email with your Google review link is enough.',
          tabLink: 'reviews',
          btnAdd:  'Ask for reviews',
        },
      ],
    },
  ]
}

function initHoursState(regularHours?: GBPHoursPeriod[]): Record<string, DayHours> {
  const result: Record<string, DayHours> = {}
  for (const day of ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']) {
    const period = regularHours?.find(p => p.openDay === day)
    result[day] = period
      ? { isOpen: true, from: period.openTime, to: period.closeTime }
      : { isOpen: false, from: '09:00', to: '17:00' }
  }
  return result
}

export function ChecklistTabTest2({ data, onTabChange }: { data: GBPData; onTabChange?: (tab: string) => void }) {
  const { lang } = useLang()
  const t = T[lang]

  // Inline editing state — description / phone
  const [editingField, setEditingField] = useState<'description' | 'phone' | 'hours' | 'services' | 'attributes' | null>(null)
  const [editDraft,    setEditDraft]    = useState('')
  const [saveStatus,   setSaveStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError,    setSaveError]    = useState('')

  // Hours state
  const [hoursState,  setHoursState]  = useState<Record<string, DayHours>>(() => initHoursState(data.regularHours))
  const [hoursSaving, setHoursSaving] = useState(false)
  const [hoursError,  setHoursError]  = useState('')
  const [hoursSaved,  setHoursSaved]  = useState(false)

  // Services state
  const [servicesState,  setServicesState]  = useState<string[]>(data.services ?? [])
  const [serviceInput,   setServiceInput]   = useState('')
  const [servicesSaving, setServicesSaving] = useState(false)
  const [servicesError,  setServicesError]  = useState('')
  const [servicesSaved,  setServicesSaved]  = useState(false)

  // Attributes state
  const [attrMeta,    setAttrMeta]    = useState<AttrMeta[]>([])
  const [attrValues,  setAttrValues]  = useState<Record<string, boolean>>({})
  const [attrLoading, setAttrLoading] = useState(false)
  const [attrSaving,  setAttrSaving]  = useState(false)
  const [attrSaved,   setAttrSaved]   = useState(false)
  const [attrError,   setAttrError]   = useState('')

  async function openAttributeEditor() {
    setEditingField('attributes')
    setAttrLoading(true)
    setAttrError('')
    try {
      const res  = await fetch('/api/gbp/attributes')
      const json = await res.json() as { metadata: AttrMeta[]; current: AttrCurrent[] }
      setAttrMeta(json.metadata ?? [])
      // Seed current values from the API response
      const vals: Record<string, boolean> = {}
      for (const cur of json.current ?? []) {
        vals[cur.attributeId] = cur.values?.[0] === true
      }
      setAttrValues(vals)
    } catch {
      setAttrError(t.attrLoadFailed)
    } finally {
      setAttrLoading(false)
    }
  }

  async function saveAttributes() {
    setAttrSaving(true)
    setAttrError('')
    setAttrSaved(false)
    // Only send attributes that are explicitly true (omit false to keep payload clean)
    const attributes = Object.entries(attrValues)
      .map(([attributeId, value]) => ({ attributeId, values: [value] }))
    try {
      const res  = await fetch('/api/gbp/update-attributes', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ attributes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t.saveFailed)
      setAttrSaved(true)
      setTimeout(() => { setAttrSaved(false); setEditingField(null) }, 2000)
    } catch (err) {
      setAttrError(err instanceof Error ? err.message : t.saveFailed)
    } finally {
      setAttrSaving(false)
    }
  }

  async function saveField(field: 'description' | 'phone') {
    setSaveStatus('saving')
    setSaveError('')
    try {
      const res  = await fetch('/api/gbp/update-profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ field, value: editDraft.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t.saveFailed)
      setSaveStatus('saved')
      setTimeout(() => { setSaveStatus('idle'); setEditingField(null) }, 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t.saveFailed)
      setSaveStatus('error')
    }
  }

  async function saveHours() {
    setHoursSaving(true)
    setHoursError('')
    setHoursSaved(false)
    const periods: GBPHoursPeriod[] = DAYS
      .filter(day => hoursState[day].isOpen)
      .map(day => ({
        openDay:   day,
        openTime:  hoursState[day].from,
        closeDay:  day,
        closeTime: hoursState[day].to,
      }))
    try {
      const res  = await fetch('/api/gbp/update-hours', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ periods }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t.saveFailed)
      setHoursSaved(true)
      setTimeout(() => { setHoursSaved(false); setEditingField(null) }, 2000)
    } catch (err) {
      setHoursError(err instanceof Error ? err.message : t.saveFailed)
    } finally {
      setHoursSaving(false)
    }
  }

  async function saveServices() {
    setServicesSaving(true)
    setServicesError('')
    setServicesSaved(false)
    try {
      const res  = await fetch('/api/gbp/update-services', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ services: servicesState }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t.saveFailed)
      setServicesSaved(true)
      setTimeout(() => { setServicesSaved(false); setEditingField(null) }, 2000)
    } catch (err) {
      setServicesError(err instanceof Error ? err.message : t.saveFailed)
    } finally {
      setServicesSaving(false)
    }
  }

  const groups   = buildAudit(data, lang)
  const allItems = groups.flatMap(g => g.items)
  const passed   = allItems.filter(i => i.passed).length
  const total    = allItems.length
  const missing  = allItems.filter(i => !i.passed)
  const complete = passed === total

  // When the one-time setup is done, the checklist collapses to a complete-banner
  // and only the recurring upkeep items stay visible — so this tab keeps having
  // something new to say every month instead of going static.
  const visibleGroups = complete
    ? groups.filter(g => g.id === 'activity').map(g => ({ ...g, heading: t.monthlyUpkeep }))
    : groups

  return (
    <div className="space-y-6">

      {/* Summary bar */}
      {complete ? (
        <div className="bg-navy-800 rounded-xl border border-green-500/25 px-5 py-4 flex items-center gap-4">
          <span className="text-green-400 text-2xl shrink-0">✓</span>
          <div>
            <p className="text-sm font-medium text-white">{t.completeTitle}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.completeSub}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-navy-800 rounded-xl border border-navy-700 px-5 py-4 flex items-center gap-5">
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <Tooltip text={t.progressTooltip}>
                <p className="text-sm font-medium text-white cursor-default">
                  {t.ofComplete(passed, total)}
                </p>
              </Tooltip>
              {missing.length > 0 && (
                <p className="text-xs text-slate-500">
                  {t.stillToDo(missing.length)}
                </p>
              )}
            </div>
            <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  passed === total ? 'bg-green-500' :
                  passed / total >= 0.6 ? 'bg-mustard' : 'bg-red-500'
                }`}
                style={{ width: `${(passed / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Grouped checklist */}
      {visibleGroups.map(group => (
        <div key={group.id} className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.heading}</p>
          <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700">
            {group.items.map(item => {
              const isEditing = editingField === item.editableField
              return (
              <div key={item.label} className="px-4 sm:px-5 py-3.5">
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <span className={`shrink-0 mt-0.5 text-sm font-bold w-5 text-center ${item.passed ? 'text-green-400' : 'text-red-400'}`}>
                    {item.passed ? '✓' : '✗'}
                  </span>

                  {/* Label + note */}
                  <div className="flex-1 min-w-0">
                    <Tooltip text={item.tip}>
                      <p className={`text-sm font-medium cursor-default ${item.passed ? 'text-white' : 'text-slate-300'}`}>
                        {item.label}
                      </p>
                    </Tooltip>
                    {!item.passed && item.note && !isEditing && (
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.note}</p>
                    )}
                  </div>

                  {/* Action button */}
                  {!isEditing && (() => {
                    const label = item.passed ? (item.btnEdit ?? null) : (item.btnAdd ?? null)
                    if (!label) return null

                    const btnClass = 'shrink-0 text-xs text-slate-500 hover:text-mustard border border-navy-600 hover:border-mustard/40 px-2.5 py-1 rounded-lg transition-colors'

                    if (item.editableField) return (
                      <button
                        onClick={() => {
                          if (item.editableField === 'attributes') {
                            openAttributeEditor()
                          } else {
                            if (item.editableField === 'description') setEditDraft(data.description ?? '')
                            else if (item.editableField === 'phone')  setEditDraft(data.phone ?? '')
                            setEditingField(item.editableField!)
                            setSaveStatus('idle')
                            setSaveError('')
                          }
                        }}
                        className={btnClass}
                      >
                        {label}
                      </button>
                    )

                    if (item.tabLink) return (
                      <button onClick={() => onTabChange?.(item.tabLink!)} className={btnClass}>
                        {label}
                      </button>
                    )

                    if (item.externalLink) return (
                      <ExternalLink href={item.externalLink} className={btnClass}>
                        {label}
                      </ExternalLink>
                    )

                    return null
                  })()}
                </div>

                {/* Inline editor — description / phone */}
                {isEditing && (item.editableField === 'description' || item.editableField === 'phone') && (
                  <div className="mt-3 ml-9 space-y-2">
                    {item.editableField === 'description' ? (
                      <textarea
                        autoFocus
                        value={editDraft}
                        onChange={e => setEditDraft(e.target.value)}
                        rows={4}
                        maxLength={750}
                        placeholder={t.descPlaceholder}
                        className="w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white placeholder-slate-500 text-sm rounded-lg px-3 py-2.5 focus:outline-none resize-none"
                      />
                    ) : (
                      <input
                        autoFocus
                        type="tel"
                        value={editDraft}
                        onChange={e => setEditDraft(e.target.value)}
                        placeholder="+46 8 123 456 78"
                        className="w-64 max-w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white placeholder-slate-500 text-sm rounded-lg px-3 py-2.5 focus:outline-none"
                      />
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => saveField(item.editableField as 'description' | 'phone')}
                        disabled={!editDraft.trim() || saveStatus === 'saving'}
                        className="text-sm bg-mustard hover:bg-mustard-light disabled:opacity-40 text-navy-950 font-semibold px-4 py-1.5 rounded-lg transition-colors"
                      >
                        {saveStatus === 'saving' ? t.saving : t.saveToGoogle}
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        className="text-sm text-slate-500 hover:text-white transition-colors"
                      >
                        {t.cancel}
                      </button>
                      {saveStatus === 'saved' && <span className="text-green-400 text-sm">{t.saved}</span>}
                      {saveStatus === 'error' && <span className="text-red-400 text-sm">{saveError || t.saveFailed}</span>}
                    </div>
                  </div>
                )}

                {/* Inline editor — hours */}
                {isEditing && item.editableField === 'hours' && (
                  <div className="mt-3 ml-9 space-y-3">
                    {/* 7-row day grid */}
                    <div className="space-y-1.5">
                      {DAYS.map(day => {
                        const dh = hoursState[day]
                        return (
                          <div key={day} className="flex items-center gap-3 flex-wrap">
                            {/* Day label */}
                            <span className="text-xs text-slate-500 w-8 shrink-0">{DAY_LABEL[lang][day]}</span>
                            {/* Open/Closed toggle */}
                            <button
                              onClick={() => setHoursState(s => ({ ...s, [day]: { ...s[day], isOpen: !s[day].isOpen } }))}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all shrink-0 ${
                                dh.isOpen
                                  ? 'text-green-400 bg-green-500/10 border-green-500/20'
                                  : 'text-slate-500 bg-navy-700 border-navy-600'
                              }`}
                            >
                              {dh.isOpen ? t.open : t.closed}
                            </button>
                            {/* Time inputs — only shown when open */}
                            {dh.isOpen && (
                              <>
                                <input
                                  type="time"
                                  value={dh.from}
                                  onChange={e => setHoursState(s => ({ ...s, [day]: { ...s[day], from: e.target.value } }))}
                                  className="bg-navy-900 border border-navy-600 focus:border-mustard text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none tabular-nums"
                                />
                                <span className="text-slate-600 text-xs">–</span>
                                <input
                                  type="time"
                                  value={dh.to}
                                  onChange={e => setHoursState(s => ({ ...s, [day]: { ...s[day], to: e.target.value } }))}
                                  className="bg-navy-900 border border-navy-600 focus:border-mustard text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none tabular-nums"
                                />
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {/* Save row */}
                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      <button
                        onClick={saveHours}
                        disabled={hoursSaving}
                        className="text-sm bg-mustard hover:bg-mustard-light disabled:opacity-40 text-navy-950 font-semibold px-4 py-1.5 rounded-lg transition-colors"
                      >
                        {hoursSaving ? t.saving : t.saveHours}
                      </button>
                      <button onClick={() => setEditingField(null)} className="text-sm text-slate-500 hover:text-white transition-colors">
                        {t.cancel}
                      </button>
                      {hoursSaved  && <span className="text-green-400 text-sm">{t.saved}</span>}
                      {hoursError  && <span className="text-red-400 text-sm">{hoursError}</span>}
                    </div>
                  </div>
                )}

                {/* Inline editor — services */}
                {isEditing && item.editableField === 'services' && (
                  <div className="mt-3 ml-9 space-y-3">
                    {/* Current services as removable chips */}
                    {servicesState.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {servicesState.map(svc => (
                          <span key={svc} className="inline-flex items-center gap-1.5 bg-navy-700 border border-navy-600 text-white text-xs px-2.5 py-1 rounded-lg">
                            {svc}
                            <button
                              onClick={() => setServicesState(s => s.filter(x => x !== svc))}
                              className="text-slate-500 hover:text-white transition-colors leading-none"
                              aria-label={t.removeService(svc)}
                            >×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Add input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={serviceInput}
                        onChange={e => setServiceInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && serviceInput.trim()) {
                            if (!servicesState.includes(serviceInput.trim())) {
                              setServicesState(s => [...s, serviceInput.trim()])
                            }
                            setServiceInput('')
                          }
                        }}
                        placeholder={t.servicePlaceholder}
                        className="flex-1 bg-navy-900 border border-navy-600 focus:border-mustard text-white placeholder-slate-500 text-sm rounded-lg px-3 py-2 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (serviceInput.trim() && !servicesState.includes(serviceInput.trim())) {
                            setServicesState(s => [...s, serviceInput.trim()])
                          }
                          setServiceInput('')
                        }}
                        disabled={!serviceInput.trim()}
                        className="px-3 py-2 bg-navy-700 border border-navy-600 hover:border-navy-500 text-slate-300 hover:text-white text-sm rounded-lg transition-colors disabled:opacity-40"
                      >
                        {t.add}
                      </button>
                    </div>
                    <p className="text-slate-500 text-xs">{t.servicesHint}</p>
                    {/* Save row */}
                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      <button
                        onClick={saveServices}
                        disabled={servicesSaving || servicesState.length === 0}
                        className="text-sm bg-mustard hover:bg-mustard-light disabled:opacity-40 text-navy-950 font-semibold px-4 py-1.5 rounded-lg transition-colors"
                      >
                        {servicesSaving ? t.saving : t.saveServices(servicesState.length)}
                      </button>
                      <button onClick={() => setEditingField(null)} className="text-sm text-slate-500 hover:text-white transition-colors">
                        {t.cancel}
                      </button>
                      {servicesSaved  && <span className="text-green-400 text-sm">{t.saved}</span>}
                      {servicesError  && <span className="text-red-400 text-sm">{servicesError}</span>}
                    </div>
                  </div>
                )}

                {/* Inline editor — attributes */}
                {isEditing && item.editableField === 'attributes' && (
                  <div className="mt-3 ml-9 space-y-4">
                    {attrLoading ? (
                      <p className="text-slate-500 text-sm">{t.loading}</p>
                    ) : attrMeta.length === 0 ? (
                      <p className="text-slate-500 text-sm">{t.noAttributes}</p>
                    ) : (
                      <>
                        {/* Group by groupDisplayName */}
                        {Object.entries(
                          attrMeta.reduce<Record<string, AttrMeta[]>>((acc, attr) => {
                            ;(acc[attr.groupDisplayName] ??= []).push(attr)
                            return acc
                          }, {})
                        ).map(([group, attrs]) => (
                          <div key={group} className="space-y-2">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{group}</p>
                            {attrs.map(attr => (
                              <label key={attr.attributeId} className="flex items-center gap-3 cursor-pointer group/attr">
                                <input
                                  type="checkbox"
                                  checked={attrValues[attr.attributeId] ?? false}
                                  onChange={e => setAttrValues(v => ({ ...v, [attr.attributeId]: e.target.checked }))}
                                  className="accent-mustard w-4 h-4 shrink-0"
                                />
                                <span className="text-sm text-slate-300 group-hover/attr:text-white transition-colors">
                                  {attr.displayName}
                                </span>
                              </label>
                            ))}
                          </div>
                        ))}

                        {/* Save row */}
                        <div className="flex items-center gap-3 pt-1 flex-wrap">
                          <button
                            onClick={saveAttributes}
                            disabled={attrSaving}
                            className="text-sm bg-mustard hover:bg-mustard-light disabled:opacity-40 text-navy-950 font-semibold px-4 py-1.5 rounded-lg transition-colors"
                          >
                            {attrSaving ? t.saving : t.saveToGoogle}
                          </button>
                          <button onClick={() => setEditingField(null)} className="text-sm text-slate-500 hover:text-white transition-colors">
                            {t.cancel}
                          </button>
                          {attrSaved  && <span className="text-green-400 text-sm">{t.saved}</span>}
                          {attrError  && <span className="text-red-400 text-sm">{attrError}</span>}
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
              )
            })}
          </div>
        </div>
      ))}

    </div>
  )
}
