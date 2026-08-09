'use client'
import { useState } from 'react'
import { UTMBuilder } from '../tools/UTMBuilder'
import { UTMHistory } from '../tools/UTMHistory'

export function UTMTabTest() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-6">
      <UTMBuilder onSaved={() => setRefreshKey(k => k + 1)} />
      <UTMHistory refreshKey={refreshKey} />
    </div>
  )
}
