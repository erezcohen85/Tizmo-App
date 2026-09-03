import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import en, { type Dict } from './en'
import he from './he'

type Lang = 'en' | 'he'

const DICTS: Record<Lang, Dict> = { en, he }
const RTL: Record<Lang, boolean> = { en: false, he: true }

type Path<T> = T extends object
  ? { [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${Path<T[K]>}` : K) : never }[keyof T]
  : never

type TKey = Path<Dict>

function get(dict: Dict, key: string): string {
  return key.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), dict) as string
}

type I18nContextValue = {
  lang: Lang
  dir: 'ltr' | 'rtl'
  setLang: (l: Lang) => void
  t: (key: TKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('lang')
    return stored === 'en' || stored === 'he' ? stored : 'he'
  })

  const dir = RTL[lang] ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  const setLang = (l: Lang) => {
    localStorage.setItem('lang', l)
    setLangState(l)
  }

  const t = useMemo(() => {
    const dict = DICTS[lang]
    return (key: TKey) => get(dict, key) ?? key
  }, [lang])

  return <I18nContext.Provider value={{ lang, dir, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
