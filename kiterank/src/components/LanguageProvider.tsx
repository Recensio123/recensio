'use client'
import { createContext, useContext, useState, useEffect } from 'react'

/*
 * Dashboard language — Swedish is the product's primary voice (the target
 * customer is a Swedish salon owner), English is the secondary option.
 * Each component keeps its own local string dictionary keyed by this lang:
 *
 *   const { lang } = useLang()
 *   const L = { sv: { title: 'Hem' }, en: { title: 'Home' } }[lang]
 *
 * Persisted per browser; defaults to Swedish.
 */

export type Lang = 'sv' | 'en'

type LangContextValue = {
  lang:    Lang
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangContextValue>({
  lang:    'sv',
  setLang: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('sv')

  // Load after mount to avoid SSR hydration mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kiterank_lang')
      if (saved === 'sv' || saved === 'en') setLangState(saved)
    } catch { /* default */ }
  }, [])

  function setLang(next: Lang) {
    setLangState(next)
    try { localStorage.setItem('kiterank_lang', next) } catch { /* ignore */ }
  }

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

/** Read or change the dashboard language from any component. */
export function useLang(): LangContextValue {
  return useContext(LangContext)
}
