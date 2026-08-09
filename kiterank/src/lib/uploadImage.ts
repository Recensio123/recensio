/*
 * Photo uploads from the editor, sized for the web on the way out.
 *
 * A phone photo is 4000px wide and several megabytes; a website never shows
 * more than about 1600px of it. Shrinking in the browser before uploading is
 * what keeps a photo-heavy article page fast — and it happens while the
 * customer is still looking at the upload, so it costs them nothing.
 */

const MAX_EDGE = 1600
const QUALITY  = 0.82

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Kunde inte läsa filen'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error('Kunde inte öppna bilden'))
    img.src = src
  })
}

/** Scale down to fit MAX_EDGE. PNGs stay PNG so transparency survives. */
async function shrink(file: File): Promise<Blob> {
  const img = await loadImage(await readAsDataUrl(file))
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  if (scale === 1 && file.size < 600_000) return file

  const canvas = document.createElement('canvas')
  canvas.width  = Math.round(img.width  * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, type, QUALITY))
  return blob && blob.size < file.size ? blob : file
}

/** Upload a font file as-is — fonts must never be recompressed. */
export async function uploadFont(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  const res  = await fetch('/api/webbplats/upload', { method: 'POST', body })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Uppladdningen misslyckades')
  return data.url as string
}

/** Upload one image and get back the address the published site will use. */
export async function uploadImage(file: File): Promise<string> {
  const blob = await shrink(file)
  const body = new FormData()
  body.append('file', new File([blob], file.name, { type: blob.type || file.type }))

  const res  = await fetch('/api/webbplats/upload', { method: 'POST', body })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Uppladdningen misslyckades')
  return data.url as string
}
