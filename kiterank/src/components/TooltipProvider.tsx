'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const STORAGE_KEY = 'kiterank_tooltips_enabled'

type Ctx = { enabled: boolean; setEnabled: (v: boolean) => void }

const TooltipContext = createContext<Ctx>({ enabled: true, setEnabled: () => {} })

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(true)

  // Read from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setEnabledState(stored !== 'false')
  }, [])

  function setEnabled(v: boolean) {
    setEnabledState(v)
    localStorage.setItem(STORAGE_KEY, String(v))
  }

  return (
    <TooltipContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </TooltipContext.Provider>
  )
}

export function useTooltips() {
  return useContext(TooltipContext)
}
