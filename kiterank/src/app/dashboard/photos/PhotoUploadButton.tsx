'use client'
import { ExternalLink } from '@/components/ExternalLink'

export function PhotoUploadButton() {
  return (
    <ExternalLink
      href="https://business.google.com/dashboard"
      className="text-sm bg-mustard hover:bg-mustard-light text-navy-950 font-semibold px-4 py-2 rounded-lg transition-colors"
    >
      Manage in Google
    </ExternalLink>
  )
}
