import { describe, expect, it } from 'vitest'
import { equivalentKeyForChar, normalizeInput } from './keyboard'

const key = (value: string, shiftKey = false) => ({ key: value, shiftKey, metaKey: false, ctrlKey: false, altKey: false })

describe('Kedmanee physical key mapping', () => {
  it('maps a to ฟ without changing the OS keyboard', () => expect(normalizeInput(key('a'), 'TH')).toBe('ฟ'))
  it('maps shifted u to ๊', () => expect(normalizeInput(key('u', true), 'TH')).toBe('๊'))
  it('keeps English physical input in EN mode', () => expect(normalizeInput(key('a'), 'EN')).toBe('a'))
  it('accepts Latin text directly when a Thai lesson expects Latin', () => expect(normalizeInput(key('e'), 'TH', 'e')).toBe('e'))
  it('accepts Arabic digits directly when a Thai lesson expects digits', () => expect(normalizeInput(key('1'), 'TH', '1')).toBe('1'))
  it('still maps the number row when a Thai character is expected', () => expect(normalizeInput(key('4'), 'TH', 'ภ')).toBe('ภ'))
  it('finds the physical key for Thai characters', () => expect(equivalentKeyForChar('ฟ', 'TH')).toBe('a'))
  it('finds shifted Thai characters too', () => expect(equivalentKeyForChar('๋', 'TH')).toBe('j'))
  it('finds raw ASCII keys inside Thai mixed text', () => expect(equivalentKeyForChar('P', 'TH')).toBe('p'))
})
