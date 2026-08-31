import { describe, expect, it } from 'vitest'
import { equivalentKeyForChar, normalizeInput } from './keyboard'

const key = (value: string, shiftKey = false) => ({ key: value, shiftKey, metaKey: false, ctrlKey: false, altKey: false })

describe('Kedmanee physical key mapping', () => {
  it('maps a to ฟ without changing the OS keyboard', () => expect(normalizeInput(key('a'), 'TH')).toBe('ฟ'))
  it('maps shifted u to ๊', () => expect(normalizeInput(key('u', true), 'TH')).toBe('๊'))
  it('keeps English physical input in EN mode', () => expect(normalizeInput(key('a'), 'EN')).toBe('a'))
  it('finds the physical key for Thai characters', () => expect(equivalentKeyForChar('ฟ', 'TH')).toBe('a'))
  it('finds shifted Thai characters too', () => expect(equivalentKeyForChar('๋', 'TH')).toBe('j'))
})
