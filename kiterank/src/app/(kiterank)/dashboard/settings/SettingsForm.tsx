'use client'
import { useState } from 'react'
import { useTooltips } from '@/components/TooltipProvider'
import { useLang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'

// `value` is what gets saved to the API — never translate it. Labels are display only.
const COUNTRIES = [
  { value: 'sweden',      labelSv: 'Sverige',        labelEn: 'Sweden'         },
  { value: 'norway',      labelSv: 'Norge',          labelEn: 'Norway'         },
  { value: 'denmark',     labelSv: 'Danmark',        labelEn: 'Denmark'        },
  { value: 'finland',     labelSv: 'Finland',        labelEn: 'Finland'        },
  { value: 'germany',     labelSv: 'Tyskland',       labelEn: 'Germany'        },
  { value: 'switzerland', labelSv: 'Schweiz',        labelEn: 'Switzerland'    },
  { value: 'austria',     labelSv: 'Österrike',      labelEn: 'Austria'        },
  { value: 'netherlands', labelSv: 'Nederländerna',  labelEn: 'Netherlands'    },
  { value: 'uk',          labelSv: 'Storbritannien', labelEn: 'United Kingdom' },
  { value: 'australia',   labelSv: 'Australien',     labelEn: 'Australia'      },
  { value: 'us',          labelSv: 'USA',            labelEn: 'United States'  },
  { value: 'canada',      labelSv: 'Kanada',         labelEn: 'Canada'         },
]

type Props = {
  name:          string
  country:       string | null
  city:          string | null
  postalCode:    string | null
  industry:      string | null
  website:       string | null
  justConnected: boolean
}

// Fields required for personalised advice
const REQUIRED = ['name', 'country', 'industry'] as const

const T = {
  sv: {
    connectedTitle:  'Google-kontot är kopplat',
    connectedBody:   'Vi har hämtat det vi kunde från din företagsprofil. Kolla igenom uppgifterna nedan och fyll i det som saknas.',
    missingOne:      'Ett fält behöver fyllas i',
    missingMany:     (n: number) => `${n} fält behöver fyllas i`,
    missingBody:     'De markerade fälten används för att anpassa dina råd. Fyll i dem och spara, så får du råd som passar just din marknad.',
    detailsTitle:    'Företagsuppgifter',
    detailsSub:      'Används på alla sidor och i alla råd du får',
    nameLabel:       'Företagsnamn',
    required:        'Krävs',
    requiredTip:     'Fältet behövs för att råden ska anpassas till ditt företag och din marknad. Utan det blir råden allmänna.',
    namePlaceholder: 't.ex. Hägersten Rör AB',
    typeLabel:       'Typ av verksamhet',
    typePlaceholder: 't.ex. Rörmokare, Elektriker, Städfirma',
    typeHint:        'Hämtas automatiskt från din Google-företagsprofil. Används för att anpassa råden till din bransch.',
    countryLabel:    'Land',
    countryEmpty:    '— Välj land —',
    countryHint:     'Avgör vilka jämförelsetal och lokala vanor som gäller för dina råd',
    websiteLabel:    'Hemsida',
    websiteHint:     'Hämtas automatiskt från din Google-företagsprofil',
    locationTitle:   'Var du vill synas',
    locationSub:     'Hjälper oss föreslå sökord nära dig — t.ex. "rörmokare hägersten" i stället för "rörmokare stockholm"',
    districtLabel:   'Stadsdel / område',
    districtPlaceholder: 't.ex. Hägersten, Södermalm, Kungsholmen',
    districtHint:    'Hämtas automatiskt från din Google-företagsprofil',
    postalLabel:     'Postnummer',
    postalPlaceholder: 't.ex. 12660',
    displayTitle:    'Visningsval',
    displaySub:      'Ändra hur informationen visas i översikten',
    tooltipsLabel:   'Förklaringar när du håller muspekaren stilla',
    tooltipsHint:    'Håll muspekaren stilla en kort stund över en siffra eller ett avsnitt för att få en enkel förklaring',
    saving:          'Sparar…',
    save:            'Spara ändringar',
    saved:           'Ändringarna är sparade',
    saveFailed:      'Kunde inte spara. Försök igen.',
  },
  en: {
    connectedTitle:  'Google account connected',
    connectedBody:   "We've pulled in what we could from your Business Profile. Check the details below and fill in anything that's still missing.",
    missingOne:      'One field needs your attention',
    missingMany:     (n: number) => `${n} fields need your attention`,
    missingBody:     'The highlighted fields below are used to personalise your recommendations. Fill them in and save to get accurate advice for your market.',
    detailsTitle:    'Business details',
    detailsSub:      'Used across all pages and personalised advice',
    nameLabel:       'Business name',
    required:        'Required',
    requiredTip:     'This field is needed to tailor recommendations to your business and market. Without it, advice stays generic.',
    namePlaceholder: 'e.g. Hägersten Plumbing AB',
    typeLabel:       'Business type',
    typePlaceholder: 'e.g. Plumber, Electrician, House cleaning service',
    typeHint:        'Auto-filled from your Google Business Profile. Used to tailor advice to your industry.',
    countryLabel:    'Country',
    countryEmpty:    '— Select country —',
    countryHint:     'Determines which market benchmarks and local norms apply to your recommendations',
    websiteLabel:    'Website',
    websiteHint:     'Auto-filled from your Google Business Profile',
    locationTitle:   'Location targeting',
    locationSub:     'Helps suggest hyper-local keywords — e.g. "plumber hägersten" instead of "plumber stockholm"',
    districtLabel:   'District / neighbourhood',
    districtPlaceholder: 'e.g. Hägersten, Södermalm, Kungsholmen',
    districtHint:    'Auto-filled from your Google Business Profile',
    postalLabel:     'Postal code',
    postalPlaceholder: 'e.g. 12660',
    displayTitle:    'Display preferences',
    displaySub:      'Adjust how information is presented in the dashboard',
    tooltipsLabel:   'Hover explanations',
    tooltipsHint:    'Rest the mouse briefly over any metric or section to see a plain-language explanation',
    saving:          'Saving…',
    save:            'Save changes',
    saved:           'Changes saved',
    saveFailed:      'Failed to save. Try again.',
  },
}

export function SettingsForm({ name, country, city, postalCode, industry, website, justConnected }: Props) {
  const { lang } = useLang()
  const L = T[lang]
  const { enabled: tooltipsEnabled, setEnabled: setTooltipsEnabled } = useTooltips()
  const [form, setForm] = useState({
    name:        name        ?? '',
    country:     country     ?? '',
    city:        city        ?? '',
    postal_code: postalCode  ?? '',
    industry:    industry    ?? '',
    website:     website     ?? '',
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setStatus('idle')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    try {
      const res = await fetch('/api/company', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      setStatus(res.ok ? 'saved' : 'error')
      if (res.ok) setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
    }
  }

  const missing = REQUIRED.filter(f => !form[f])
  const fieldBorder = (field: string) =>
    missing.includes(field as typeof REQUIRED[number])
      ? 'border-mustard/40 focus:border-mustard'
      : 'border-navy-600 focus:border-mustard'

  return (
    <form onSubmit={save} className="space-y-6">

      {/* Connected banner */}
      {justConnected && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4 space-y-1">
          <p className="text-green-400 text-sm font-semibold">{L.connectedTitle}</p>
          <p className="text-slate-400 text-sm">
            {L.connectedBody}
          </p>
        </div>
      )}

      {/* Missing fields banner */}
      {missing.length > 0 && (
        <div className="bg-mustard/8 border border-mustard/20 rounded-xl px-5 py-4">
          <p className="text-mustard text-sm font-medium">
            {missing.length === 1 ? L.missingOne : L.missingMany(missing.length)}
          </p>
          <p className="text-slate-400 text-xs mt-1">
            {L.missingBody}
          </p>
        </div>
      )}

      {/* Business details */}
      <div className="bg-navy-800 rounded-2xl border border-navy-700 overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-navy-700">
          <p className="text-white font-medium">{L.detailsTitle}</p>
          <p className="text-slate-500 text-xs mt-0.5">{L.detailsSub}</p>
        </div>
        <div className="px-4 sm:px-6 py-5 space-y-4">

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{L.nameLabel}</label>
              {!form.name && (
                <Tooltip text={L.requiredTip}>
                  <span className="text-xs text-mustard font-medium cursor-default">{L.required}</span>
                </Tooltip>
              )}
            </div>
            <input
              type="text"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder={L.namePlaceholder}
              className={`w-full px-4 py-2.5 rounded-lg bg-navy-700 border text-white placeholder-slate-600 text-sm focus:outline-none ${fieldBorder('name')}`}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{L.typeLabel}</label>
              {!form.industry && (
                <Tooltip text={L.requiredTip}>
                  <span className="text-xs text-mustard font-medium cursor-default">{L.required}</span>
                </Tooltip>
              )}
            </div>
            <input
              type="text"
              value={form.industry}
              onChange={e => update('industry', e.target.value)}
              placeholder={L.typePlaceholder}
              className={`w-full px-4 py-2.5 rounded-lg bg-navy-700 border text-white placeholder-slate-600 text-sm focus:outline-none ${fieldBorder('industry')}`}
            />
            <p className="text-slate-500 text-xs">
              {L.typeHint}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{L.countryLabel}</label>
              {!form.country && (
                <Tooltip text={L.requiredTip}>
                  <span className="text-xs text-mustard font-medium cursor-default">{L.required}</span>
                </Tooltip>
              )}
            </div>
            <select
              value={form.country}
              onChange={e => update('country', e.target.value)}
              className={`w-full px-4 py-2.5 rounded-lg bg-navy-700 border text-sm focus:outline-none appearance-none cursor-pointer ${fieldBorder('country')}`}
              style={{ color: form.country ? 'white' : 'rgb(100 116 139)' }}
            >
              <option value="">{L.countryEmpty}</option>
              {COUNTRIES.map(c => (
                <option key={c.value} value={c.value} style={{ color: 'white' }}>{lang === 'sv' ? c.labelSv : c.labelEn}</option>
              ))}
            </select>
            <p className="text-slate-500 text-xs">
              {L.countryHint}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{L.websiteLabel}</label>
            <input
              type="url"
              value={form.website}
              onChange={e => update('website', e.target.value)}
              placeholder="https://yourwebsite.se"
              className="w-full px-4 py-2.5 rounded-lg bg-navy-700 border border-navy-600 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-mustard"
            />
            <p className="text-slate-500 text-xs">
              {L.websiteHint}
            </p>
          </div>

        </div>
      </div>

      {/* Location targeting */}
      <div className="bg-navy-800 rounded-2xl border border-navy-700 overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-navy-700">
          <p className="text-white font-medium">{L.locationTitle}</p>
          <p className="text-slate-500 text-xs mt-0.5">
            {L.locationSub}
          </p>
        </div>
        <div className="px-4 sm:px-6 py-5 space-y-4">

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{L.districtLabel}</label>
            <input
              type="text"
              value={form.city}
              onChange={e => update('city', e.target.value)}
              placeholder={L.districtPlaceholder}
              className="w-full px-4 py-2.5 rounded-lg bg-navy-700 border border-navy-600 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-mustard"
            />
            <p className="text-slate-500 text-xs">
              {L.districtHint}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{L.postalLabel}</label>
            <input
              type="text"
              value={form.postal_code}
              onChange={e => update('postal_code', e.target.value)}
              placeholder={L.postalPlaceholder}
              className="w-full px-4 py-2.5 rounded-lg bg-navy-700 border border-navy-600 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-mustard"
            />
          </div>

        </div>
      </div>

      {/* Display preferences */}
      <div className="bg-navy-800 rounded-2xl border border-navy-700 overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-navy-700">
          <p className="text-white font-medium">{L.displayTitle}</p>
          <p className="text-slate-500 text-xs mt-0.5">{L.displaySub}</p>
        </div>
        <div className="px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white font-medium">{L.tooltipsLabel}</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {L.tooltipsHint}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTooltipsEnabled(!tooltipsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                tooltipsEnabled ? 'bg-mustard' : 'bg-navy-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  tooltipsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center flex-wrap gap-4">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="bg-mustard hover:bg-mustard-light disabled:opacity-50 text-navy-950 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
        >
          {status === 'saving' ? L.saving : L.save}
        </button>
        {status === 'saved' && <span className="text-green-400 text-sm">{L.saved}</span>}
        {status === 'error' && <span className="text-red-400 text-sm">{L.saveFailed}</span>}
      </div>

    </form>
  )
}
