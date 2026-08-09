'use client'
import { useState, useEffect } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { ExternalLink } from '@/components/ExternalLink'
import { type MediaItem } from '@/lib/google'
import { useLang, type Lang } from '@/components/LanguageProvider'

type CategoryDef = {
  id: string; label: string; labelSv: string; description: string; descriptionSv: string; icon: string
  priority: 'Required' | 'Highly recommended' | 'Recommended'
}

const CATEGORIES: CategoryDef[] = [
  { id: 'COVER',    label: 'Cover photo',   labelSv: 'Omslagsfoto',       description: 'The first photo people see on your profile',                descriptionSv: 'Det första fotot folk ser på din profil',                      icon: '🖼',  priority: 'Required'           },
  { id: 'PROFILE',  label: 'Logo',          labelSv: 'Logotyp',           description: 'Your business logo or profile image',                       descriptionSv: 'Din logotyp eller profilbild',                                 icon: '◎',  priority: 'Recommended'        },
  { id: 'EXTERIOR', label: 'Exterior',      labelSv: 'Utsidan',           description: 'Your building from the outside so people can find you',     descriptionSv: 'Din lokal utifrån så att folk hittar dig',                     icon: '🏢',  priority: 'Highly recommended' },
  { id: 'INTERIOR', label: 'Interior',      labelSv: 'Insidan',           description: 'Inside your premises — builds trust and sets expectations', descriptionSv: 'Inuti din lokal — bygger förtroende och sätter förväntningar', icon: '🪑', priority: 'Highly recommended' },
  { id: 'AT_WORK',  label: 'Team at work',  labelSv: 'Teamet i arbete',   description: 'Your team doing what they do — humanises your business',   descriptionSv: 'Ditt team i arbete — ger företaget ett ansikte',               icon: '👷', priority: 'Highly recommended' },
  { id: 'PRODUCT',  label: 'Work/products', labelSv: 'Arbeten/produkter', description: 'Examples of your work, services or products',              descriptionSv: 'Exempel på dina arbeten, tjänster eller produkter',            icon: '🔧',  priority: 'Recommended'        },
]

const CAT_LABEL: Record<Lang, Record<string, string>> = {
  sv: Object.fromEntries(CATEGORIES.map(c => [c.id, c.labelSv])),
  en: Object.fromEntries(CATEGORIES.map(c => [c.id, c.label])),
}
const CAT_ICON: Record<string, string> = { COVER: '🖼', PROFILE: '◎', EXTERIOR: '🏢', INTERIOR: '🪑', AT_WORK: '👷', PRODUCT: '🔧' }

const PRIORITY_LABEL: Record<Lang, Record<CategoryDef['priority'], string>> = {
  sv: { 'Required': 'Krävs', 'Highly recommended': 'Rekommenderas starkt', 'Recommended': 'Rekommenderas' },
  en: { 'Required': 'Required', 'Highly recommended': 'Highly recommended', 'Recommended': 'Recommended' },
}

const T = {
  sv: {
    general:          'Övrigt',
    close:            '✕ Stäng',
    customerPhoto:    'Kundfoto',
    views:            'visningar',
    toAddTooltip:     'De fototyper Google rekommenderar för din profil. En komplett uppsättning foton gör att din profil sticker ut i sökresultat och på Maps.',
    toAddTitle:       'Foton att lägga till',
    priorityTooltip:  'Hur viktig fototypen är för en komplett profil. Börja med de röda — de påverkar mest.',
    viewsTooltip:     'Antal gånger fotot har visats för personer på Google.',
    upload:           'Ladda upp',
    totalTooltip:     'Hur många foton du har på din Google-profil just nu.',
    totalTitle:       'Antal foton',
    missingTooltip:   'Fototyper du inte laddat upp än. En komplett profil rankar högre på Google Maps.',
    missingTitle:     'Fototyper som saknas',
    freshTooltip:     'Hur länge sedan du senast lade till ett foto. Google gillar aktiva profiler — sikta på minst ett nytt foto i månaden.',
    freshTitle:       'Senaste fotot',
    today:            'Idag',
    daysAgo:          'dagar sedan',
    yourTooltip:      'Alla foton du laddat upp till din Google-profil, sorterade efter visningar — översta raden fungerar bäst. Klicka på ett foto för att se det i full storlek.',
    yourTitle:        'Dina foton',
    yourSuffix:       (n: number) => `${n} uppladdade · sorterade efter visningar`,
    uploadPhoto:      '+ Ladda upp foto',
    uploadFormTitle:  'Ladda upp ett foto till din Google-profil',
    photo:            'Foto',
    choosePhoto:      'Välj ett foto…',
    preview:          'Förhandsvisning',
    category:         'Kategori',
    uploading:        'Laddar upp…',
    uploadToGoogle:   'Ladda upp till Google',
    uploaded:         'Fotot uppladdat ✓',
    uploadFailed:     'Uppladdningen misslyckades',
    emptyOwner:       'Inga foton uppladdade än — använd knappen ovan för att lägga till ditt första foto.',
    removePhoto:      'Ta bort foto',
    confirmRemove1:   'Ta bort från',
    confirmRemove2:   'Google-profilen?',
    removing:         'Tar bort…',
    remove:           'Ta bort',
    keep:             'Behåll',
    noViewsYet:       'Inga visningar än',
    customerTooltip:  'Foton som kunder och Google-användare lagt till på din profil. Klicka för att se i full storlek. För att anmäla eller ta bort ett foto måste du göra det direkt hos Google.',
    customerTitle:    'Kundfoton',
    customerSuffix:   (n: number) => `${n} uppladdade av kunder`,
    noCustomerPhotos: 'Inga kundfoton på din profil.',
    flagNote:         'För att anmäla eller ta bort ett kundfoto måste det göras hos Google.',
    flagLink:         'Anmäl hos Google ↗',
  },
  en: {
    general:          'General',
    close:            '✕ Close',
    customerPhoto:    'Customer photo',
    views:            'views',
    toAddTooltip:     'The types of photos Google recommends for your listing. A complete set of photos makes your profile stand out in search and on Maps.',
    toAddTitle:       'Photos to add',
    priorityTooltip:  'How important this photo type is for a complete listing. Start with the red ones — they matter most.',
    viewsTooltip:     'How many times this photo has been shown to people on Google.',
    upload:           'Upload',
    totalTooltip:     'How many photos you currently have on your Google business listing.',
    totalTitle:       'Total photos',
    missingTooltip:   'Types of photos you have not uploaded yet. A complete listing ranks higher on Google Maps.',
    missingTitle:     'Photo types missing',
    freshTooltip:     'How long ago you last added a photo. Google rewards active listings — aim for at least one new photo per month.',
    freshTitle:       'Last photo added',
    today:            'Today',
    daysAgo:          'days ago',
    yourTooltip:      "All photos you have uploaded to your Google listing, sorted by views — the top row is what's working best for you. Click any photo to view full size.",
    yourTitle:        'Your photos',
    yourSuffix:       (n: number) => `${n} uploaded · sorted by views`,
    uploadPhoto:      '+ Upload photo',
    uploadFormTitle:  'Upload a photo to your Google listing',
    photo:            'Photo',
    choosePhoto:      'Choose a photo…',
    preview:          'Preview',
    category:         'Category',
    uploading:        'Uploading…',
    uploadToGoogle:   'Upload to Google',
    uploaded:         'Photo uploaded ✓',
    uploadFailed:     'Upload failed',
    emptyOwner:       'No photos uploaded yet — use the button above to add your first photo.',
    removePhoto:      'Remove photo',
    confirmRemove1:   'Remove from',
    confirmRemove2:   'Google listing?',
    removing:         'Removing…',
    remove:           'Remove',
    keep:             'Keep',
    noViewsYet:       'No views yet',
    customerTooltip:  'Photos that customers and Google users have added to your listing. Click to view full size. To flag or remove a photo, you need to do that on Google directly.',
    customerTitle:    'Customer photos',
    customerSuffix:   (n: number) => `${n} uploaded by customers`,
    noCustomerPhotos: 'No customer-uploaded photos on your profile.',
    flagNote:         'To flag or remove a customer photo, that has to be done through Google.',
    flagLink:         'Flag in Google ↗',
  },
}

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

/* ── Lightbox ──────────────────────────────────────────────────────────────── */
function Lightbox({
  photos, startIndex, onClose,
}: { photos: MediaItem[]; startIndex: number; onClose: () => void }) {
  const { lang } = useLang()
  const t = T[lang]
  const [idx, setIdx] = useState(startIndex)
  const photo = photos[idx]

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     onClose()
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIdx(i => Math.min(photos.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length, onClose])

  const label = CAT_LABEL[lang][photo.category] ?? t.general
  const date  = photo.createTime
    ? new Date(photo.createTime).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>

        {/* Counter + close */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/40 text-sm tabular-nums">{idx + 1} / {photos.length}</span>
          <button onClick={onClose} className="text-white/50 hover:text-white text-sm transition-colors">
            {t.close}
          </button>
        </div>

        {/* Image */}
        <div className="bg-navy-950 rounded-xl overflow-hidden flex items-center justify-center min-h-64">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.googleUrl || photo.thumbnailUrl}
            alt={label}
            className="max-w-full max-h-[72vh] object-contain"
          />
        </div>

        {/* Caption */}
        <div className="flex items-center justify-between mt-3 px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium">{label}</span>
            {photo.source === 'CUSTOMER' && (
              <span className="text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{t.customerPhoto}</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-xs">
            {date && <span>{date}</span>}
            {photo.viewCount > 0 && <span>{photo.viewCount.toLocaleString('sv-SE')} {t.views}</span>}
          </div>
        </div>

        {/* Prev */}
        {idx > 0 && (
          <button
            onClick={() => setIdx(i => i - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors"
          >
            ‹
          </button>
        )}
        {/* Next */}
        {idx < photos.length - 1 && (
          <button
            onClick={() => setIdx(i => i + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors"
          >
            ›
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Trash icon ────────────────────────────────────────────────────────────── */
function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

/* ── Main tab ─────────────────────────────────────────────────────────────── */
export function PhotosTabTest2({ displayItems: initial }: { displayItems: MediaItem[] }) {
  const { lang } = useLang()
  const t = T[lang]
  const [items,          setItems]          = useState<MediaItem[]>(initial)
  const [lightbox,       setLightbox]       = useState<{ photos: MediaItem[]; idx: number } | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState<string | null>(null)
  const [deleting,       setDeleting]       = useState<string | null>(null)
  const [showUpload,     setShowUpload]     = useState(false)
  const [uploadFile,     setUploadFile]     = useState<File | null>(null)
  const [previewUrl,     setPreviewUrl]     = useState('')
  const [uploadCategory, setUploadCategory] = useState('AT_WORK')
  const [uploadStatus,   setUploadStatus]   = useState<UploadStatus>('idle')
  const [uploadError,    setUploadError]    = useState('')

  const ownerPhotos    = items.filter(m => m.source === 'OWNER').sort((a, b) => b.viewCount - a.viewCount)
  const customerPhotos = items.filter(m => m.source === 'CUSTOMER')

  const categoriesPresent = new Set(items.map(m => m.category))
  const missingCats       = CATEGORIES.filter(c => !categoriesPresent.has(c.id))

  const latestOwner = ownerPhotos.filter(m => m.createTime)[0]
  const daysSincePhoto = latestOwner
    ? Math.floor((Date.now() - new Date(latestOwner.createTime).getTime()) / 86_400_000)
    : null
  const freshnessStatus =
    daysSincePhoto === null ? 'critical' :
    daysSincePhoto <= 30   ? 'good'     :
    daysSincePhoto <= 90   ? 'warning'  : 'critical'

  function startUploadFor(category: string) {
    setUploadCategory(category)
    setShowUpload(true)
    setUploadStatus('idle')
    setUploadError('')
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setUploadFile(file); setPreviewUrl(URL.createObjectURL(file))
    setUploadStatus('idle'); setUploadError('')
  }

  function resetUpload() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setUploadFile(null); setPreviewUrl(''); setUploadStatus('idle'); setUploadError('')
  }

  async function uploadPhoto() {
    if (!uploadFile || uploadStatus === 'uploading') return
    setUploadStatus('uploading'); setUploadError('')
    try {
      const body = new FormData()
      body.append('file', uploadFile); body.append('category', uploadCategory)
      const res  = await fetch('/api/gbp/upload-photo', { method: 'POST', body })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t.uploadFailed)
      setUploadStatus('done'); resetUpload()
      setTimeout(() => { setUploadStatus('idle'); setShowUpload(false) }, 2500)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t.uploadFailed)
      setUploadStatus('error')
    }
  }

  async function deletePhoto(name: string) {
    // Mock items — remove locally only
    if (name.startsWith('mock/')) {
      setItems(prev => prev.filter(m => m.name !== name))
      setConfirmDelete(null)
      return
    }
    setDeleting(name)
    try {
      const res = await fetch('/api/gbp/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) setItems(prev => prev.filter(m => m.name !== name))
    } finally {
      setDeleting(null); setConfirmDelete(null)
    }
  }

  return (
    <div className="space-y-6">

      {lightbox && (
        <Lightbox photos={lightbox.photos} startIndex={lightbox.idx} onClose={() => setLightbox(null)} />
      )}

      {/* Photos to add — the to-do list, first thing on the tab */}
      {missingCats.length > 0 && (
        <div>
          <Tooltip text={t.toAddTooltip}>
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">{t.toAddTitle}</h2>
          </Tooltip>
          <div className="bg-navy-800 rounded-xl border border-mustard/25 divide-y divide-navy-700 overflow-hidden">
            {missingCats.map(cat => (
              <div key={cat.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <span className="text-lg shrink-0">{cat.icon}</span>
                <div className="flex-1 min-w-[140px]">
                  <p className="text-slate-300 text-sm font-medium">{lang === 'sv' ? cat.labelSv : cat.label}</p>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{lang === 'sv' ? cat.descriptionSv : cat.description}</p>
                </div>
                <Tooltip text={t.priorityTooltip}>
                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 cursor-default ${
                    cat.priority === 'Required'           ? 'text-red-400 bg-red-500/10'     :
                    cat.priority === 'Highly recommended' ? 'text-amber-400 bg-amber-500/10' :
                    'text-slate-500 bg-navy-700'
                  }`}>{PRIORITY_LABEL[lang][cat.priority]}</span>
                </Tooltip>
                <button
                  onClick={() => startUploadFor(cat.id)}
                  className="shrink-0 text-xs bg-mustard hover:bg-mustard/90 text-navy-950 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  {t.upload}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats — 3 cards, no abstract view counter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
          <Tooltip text={t.totalTooltip}>
            <p className="text-slate-400 text-xs mb-1 cursor-default">{t.totalTitle}</p>
          </Tooltip>
          <p className="text-white text-2xl font-bold">{items.length}</p>
        </div>
        <div className={`bg-navy-800 rounded-xl p-4 border ${missingCats.length > 0 ? 'border-amber-500/30' : 'border-navy-700'}`}>
          <Tooltip text={t.missingTooltip}>
            <p className="text-slate-400 text-xs mb-1 cursor-default">{t.missingTitle}</p>
          </Tooltip>
          <p className={`text-2xl font-bold ${missingCats.length > 0 ? 'text-amber-400' : 'text-white'}`}>{missingCats.length}</p>
        </div>
        <div className={`bg-navy-800 rounded-xl p-4 border ${
          freshnessStatus === 'good' ? 'border-navy-700' :
          freshnessStatus === 'warning' ? 'border-amber-500/30' : 'border-red-500/30'
        }`}>
          <Tooltip text={t.freshTooltip}>
            <p className="text-slate-400 text-xs mb-1 cursor-default">{t.freshTitle}</p>
          </Tooltip>
          <p className={`text-2xl font-bold ${
            freshnessStatus === 'good' ? 'text-white' :
            freshnessStatus === 'warning' ? 'text-amber-400' : 'text-red-400'
          }`}>
            {daysSincePhoto === null ? '—' : daysSincePhoto === 0 ? t.today : `${daysSincePhoto}d`}
          </p>
          {daysSincePhoto !== null && daysSincePhoto > 0 && <p className="text-slate-500 text-xs mt-0.5">{t.daysAgo}</p>}
        </div>
      </div>

      {/* Your photos gallery */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <Tooltip text={t.yourTooltip}>
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">
              {t.yourTitle}
              <span className="ml-2 text-slate-500 normal-case font-normal">{t.yourSuffix(ownerPhotos.length)}</span>
            </h2>
          </Tooltip>
          <button
            onClick={() => { setShowUpload(v => !v); setUploadStatus('idle'); setUploadError('') }}
            className="text-xs bg-mustard hover:bg-mustard/90 text-navy-950 font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            {t.uploadPhoto}
          </button>
        </div>

        {/* Upload form */}
        {showUpload && (
          <div className="bg-navy-800 border border-mustard/20 rounded-xl p-4 mb-4 space-y-4">
            <p className="text-sm font-medium text-white">{t.uploadFormTitle}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">{t.photo}</label>
                <label className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                  uploadFile ? 'border-mustard/40 bg-navy-900' : 'border-navy-600 bg-navy-900 hover:border-navy-500'
                }`}>
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={t.preview} className="w-10 h-10 rounded object-cover shrink-0" />
                  ) : (
                    <span className="text-slate-500 text-xl shrink-0">📷</span>
                  )}
                  <div className="min-w-0 flex-1">
                    {uploadFile ? (
                      <>
                        <p className="text-white text-xs truncate">{uploadFile.name}</p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {uploadFile.size < 1_048_576
                            ? `${(uploadFile.size / 1024).toFixed(0)} KB`
                            : `${(uploadFile.size / 1_048_576).toFixed(1)} MB`}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500 text-xs">{t.choosePhoto}</p>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFileSelect} />
                </label>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">{t.category}</label>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none appearance-none cursor-pointer"
                >
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{lang === 'sv' ? c.labelSv : c.label}</option>)}
                  <option value="ADDITIONAL">{t.general}</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={uploadPhoto}
                disabled={!uploadFile || uploadStatus === 'uploading'}
                className="text-sm bg-mustard hover:bg-mustard/90 disabled:opacity-40 text-navy-950 font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {uploadStatus === 'uploading' ? t.uploading : t.uploadToGoogle}
              </button>
              {uploadStatus === 'done'  && <span className="text-green-400 text-sm">{t.uploaded}</span>}
              {uploadStatus === 'error' && <span className="text-red-400 text-xs">{uploadError || t.uploadFailed}</span>}
            </div>
          </div>
        )}

        {ownerPhotos.length === 0 ? (
          <div className="bg-navy-800 rounded-xl border border-dashed border-navy-600 p-10 text-center">
            <p className="text-slate-500 text-sm">{t.emptyOwner}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ownerPhotos.map((photo, i) => {
              const label      = CAT_LABEL[lang][photo.category] ?? t.general
              const icon       = CAT_ICON[photo.category]  ?? '📷'
              const isConfirm  = confirmDelete === photo.name
              const isDeleting = deleting === photo.name
              const date       = photo.createTime
                ? new Date(photo.createTime).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
                : null

              return (
                <div key={photo.name} className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden group relative">

                  {/* Thumbnail — click to open lightbox */}
                  <button
                    className="block w-full"
                    onClick={() => !isConfirm && setLightbox({ photos: ownerPhotos, idx: i })}
                  >
                    {photo.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.thumbnailUrl} alt={label} className="w-full h-36 object-cover" />
                    ) : (
                      <div className="w-full h-36 bg-navy-700 flex items-center justify-center text-3xl">{icon}</div>
                    )}
                  </button>

                  {/* Delete button — visible on hover */}
                  {!isConfirm && (
                    <button
                      onClick={() => setConfirmDelete(photo.name)}
                      title={t.removePhoto}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/55 hover:bg-red-500/80 text-white/70 hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <TrashIcon />
                    </button>
                  )}

                  {/* Confirm delete overlay */}
                  {isConfirm && (
                    <div className="absolute inset-0 bg-navy-950/92 flex flex-col items-center justify-center gap-2.5 p-3">
                      <p className="text-white text-xs text-center font-medium leading-snug">{t.confirmRemove1}<br />{t.confirmRemove2}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => deletePhoto(photo.name)}
                          disabled={isDeleting}
                          className="text-xs bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          {isDeleting ? t.removing : t.remove}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs text-slate-400 hover:text-white border border-navy-600 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          {t.keep}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-2.5">
                    <p className="text-white text-xs font-medium truncate">{label}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <Tooltip text={t.viewsTooltip}>
                        <p className="text-slate-500 text-xs tabular-nums cursor-default">
                          {photo.viewCount > 0 ? `${photo.viewCount.toLocaleString('sv-SE')} ${t.views}` : t.noViewsYet}
                        </p>
                      </Tooltip>
                      {date && <p className="text-slate-500 text-xs">{date}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Customer photos */}
      <div>
        <Tooltip text={t.customerTooltip}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">
            {t.customerTitle}
            {customerPhotos.length > 0 && (
              <span className="ml-2 text-amber-400 normal-case font-normal">{t.customerSuffix(customerPhotos.length)}</span>
            )}
          </h2>
        </Tooltip>

        {customerPhotos.length === 0 ? (
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-4 flex items-center gap-3">
            <span className="text-green-400 text-lg shrink-0">✓</span>
            <p className="text-slate-400 text-sm">{t.noCustomerPhotos}</p>
          </div>
        ) : (
          <div className="bg-navy-800 rounded-xl border border-amber-500/20 p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {customerPhotos.map((photo, i) => {
                const label = CAT_LABEL[lang][photo.category] ?? t.general
                const icon  = CAT_ICON[photo.category]  ?? '📷'
                return (
                  <button
                    key={photo.name}
                    onClick={() => setLightbox({ photos: customerPhotos, idx: i })}
                    className="bg-navy-700/50 rounded-lg overflow-hidden text-left hover:ring-1 hover:ring-mustard/40 transition-all"
                  >
                    {photo.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.thumbnailUrl} alt={label} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 bg-navy-700 flex items-center justify-center text-2xl">{icon}</div>
                    )}
                    <div className="p-2">
                      <p className="text-slate-400 text-xs truncate">{label}</p>
                      <p className="text-slate-500 text-xs">{photo.viewCount > 0 ? `${photo.viewCount.toLocaleString('sv-SE')} ${t.views}` : '—'}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t border-amber-500/15 pt-4 flex-wrap gap-3">
              <p className="text-slate-500 text-xs">
                {t.flagNote}
              </p>
              <ExternalLink
                href="https://business.google.com/dashboard"
                className="text-xs text-mustard border border-mustard/30 hover:bg-mustard/10 px-3 py-1.5 rounded-lg transition-colors shrink-0 whitespace-nowrap"
              >
                {t.flagLink}
              </ExternalLink>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
