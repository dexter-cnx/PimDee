import type { KeyDef, Lang } from './types'

export const TH_MAP: Record<string, string> = {
  '`': '_', '1': 'ๅ', '2': '/', '3': '-', '4': 'ภ', '5': 'ถ', '6': 'ุ', '7': 'ึ', '8': 'ค', '9': 'ต', '0': 'จ', '-': 'ข', '=': 'ช',
  q: 'ๆ', w: 'ไ', e: 'ำ', r: 'พ', t: 'ะ', y: 'ั', u: 'ี', i: 'ร', o: 'น', p: 'ย', '[': 'บ', ']': 'ล', '\\': 'ฃ',
  a: 'ฟ', s: 'ห', d: 'ก', f: 'ด', g: 'เ', h: '้', j: '่', k: 'า', l: 'ส', ';': 'ว', "'": 'ง',
  z: 'ผ', x: 'ป', c: 'แ', v: 'อ', b: 'ิ', n: 'ื', m: 'ท', ',': 'ม', '.': 'ใ', '/': 'ฝ', ' ': ' ',
}

export const TH_SHIFT_MAP: Record<string, string> = {
  '`': '%', '1': '+', '2': '๑', '3': '๒', '4': '๓', '5': '๔', '6': 'ู', '7': '฿', '8': '๕', '9': '๖', '0': '๗', '-': '๘', '=': '๙',
  q: '๐', w: '"', e: 'ฎ', r: 'ฑ', t: 'ธ', y: 'ํ', u: '๊', i: 'ณ', o: 'ฯ', p: 'ญ', '[': 'ฐ', ']': ',', '\\': 'ฅ',
  a: 'ฤ', s: 'ฆ', d: 'ฏ', f: 'โ', g: 'ฌ', h: '็', j: '๋', k: 'ษ', l: 'ศ', ';': 'ซ', "'": '.',
  z: '(', x: ')', c: 'ฉ', v: 'ฮ', b: 'ฺ', n: '์', m: '?', ',': 'ฒ', '.': 'ฬ', '/': 'ฦ',
}

export const KEYS: KeyDef[][] = [
  [
    { en: 'q', th: 'ๆ', finger: 'lp' }, { en: 'w', th: 'ไ', finger: 'lr' }, { en: 'e', th: 'ำ', finger: 'lm' },
    { en: 'r', th: 'พ', finger: 'li' }, { en: 't', th: 'ะ', finger: 'li' }, { en: 'y', th: 'ั', finger: 'ri' },
    { en: 'u', th: 'ี', finger: 'ri', shiftedTh: '๊' }, { en: 'i', th: 'ร', finger: 'rm' }, { en: 'o', th: 'น', finger: 'rr' },
    { en: 'p', th: 'ย', finger: 'rp' }, { en: '[', th: 'บ', finger: 'rp' }, { en: ']', th: 'ล', finger: 'rp' },
  ],
  [
    { en: 'a', th: 'ฟ', finger: 'lp' }, { en: 's', th: 'ห', finger: 'lr' }, { en: 'd', th: 'ก', finger: 'lm' },
    { en: 'f', th: 'ด', finger: 'li' }, { en: 'g', th: 'เ', finger: 'li' }, { en: 'h', th: '้', finger: 'ri', shiftedTh: '็' },
    { en: 'j', th: '่', finger: 'ri', shiftedTh: '๋' }, { en: 'k', th: 'า', finger: 'rm' }, { en: 'l', th: 'ส', finger: 'rr' },
    { en: ';', th: 'ว', finger: 'rp' }, { en: "'", th: 'ง', finger: 'rp' },
  ],
  [
    { en: 'z', th: 'ผ', finger: 'lp' }, { en: 'x', th: 'ป', finger: 'lr' }, { en: 'c', th: 'แ', finger: 'lm' },
    { en: 'v', th: 'อ', finger: 'li' }, { en: 'b', th: 'ิ', finger: 'li' }, { en: 'n', th: 'ื', finger: 'ri', shiftedTh: '์' },
    { en: 'm', th: 'ท', finger: 'ri' }, { en: ',', th: 'ม', finger: 'rm' }, { en: '.', th: 'ใ', finger: 'rr' },
    { en: '/', th: 'ฝ', finger: 'rp' },
  ],
]

export type KeyInput = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'metaKey' | 'ctrlKey' | 'altKey'>

export function normalizeInput(event: KeyInput, language: Lang): string | null {
  if (event.key === 'Backspace') return 'BACKSPACE'
  if (event.key === 'Tab' || event.key === 'Enter' || event.metaKey || event.ctrlKey || event.altKey) return null
  if (event.key.length !== 1) return null
  if (language === 'EN') return event.key
  const lower = event.key.toLowerCase()
  if (/^[a-z]$/.test(lower) || Object.prototype.hasOwnProperty.call(TH_MAP, lower)) {
    if (event.shiftKey && TH_SHIFT_MAP[lower]) return TH_SHIFT_MAP[lower]
    return TH_MAP[lower] ?? event.key
  }
  return event.key
}

export function equivalentKeyForChar(char: string, language: Lang): string | null {
  if (!char) return null
  if (char === ' ') return ' '
  if (language === 'EN') return char.toLowerCase()
  const direct = Object.entries(TH_MAP).find(([, value]) => value === char)
  if (direct) return direct[0]
  return Object.entries(TH_SHIFT_MAP).find(([, value]) => value === char)?.[0] ?? null
}
