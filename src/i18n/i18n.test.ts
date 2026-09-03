import { describe, expect, it } from 'vitest'
import en from './en'
import he from './he'

function keys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix]
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
}

describe('i18n dictionaries', () => {
  it('he has every key that en has', () => {
    const enKeys = keys(en).sort()
    const heKeys = keys(he).sort()
    expect(heKeys).toEqual(enKeys)
  })
})
