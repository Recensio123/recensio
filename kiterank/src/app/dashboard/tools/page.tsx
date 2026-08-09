'use client'
import { useState } from 'react'
import { ROICalculator } from './ROICalculator'
import { UTMBuilder }    from './UTMBuilder'
import { UTMHistory }    from './UTMHistory'

export default function ToolsPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="px-8 py-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Marketing Tools</h1>
        <p className="text-slate-400 text-sm mt-1">Standalone calculators and utilities — no connection required.</p>
      </div>

      <ROICalculator />
      <UTMBuilder onSaved={() => setRefreshKey(k => k + 1)} />
      <UTMHistory refreshKey={refreshKey} />
    </div>
  )
}
