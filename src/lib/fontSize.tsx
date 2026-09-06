import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge'

type FontSizeContextValue = { fontSize: FontSize; setFontSize: (s: FontSize) => void }

const FontSizeContext = createContext<FontSizeContextValue | null>(null)

function apply(size: FontSize) {
  document.documentElement.setAttribute('data-font-size', size)
}

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const stored = localStorage.getItem('fontSize')
    return stored === 'small' || stored === 'medium' || stored === 'large' || stored === 'xlarge' ? stored : 'medium'
  })

  useEffect(() => apply(fontSize), [fontSize])

  function setFontSize(s: FontSize) {
    localStorage.setItem('fontSize', s)
    setFontSizeState(s)
  }

  return <FontSizeContext.Provider value={{ fontSize, setFontSize }}>{children}</FontSizeContext.Provider>
}

export function useFontSize() {
  const ctx = useContext(FontSizeContext)
  if (!ctx) throw new Error('useFontSize must be used within FontSizeProvider')
  return ctx
}
