export type Lang = 'TH' | 'EN'
export type Mode = 'natural' | 'forced'
export type Finger = 'lp' | 'lr' | 'lm' | 'li' | 'ri' | 'rm' | 'rr' | 'rp' | 'thumb'
export type TypingState = 'pending' | 'correct' | 'wrong'
export type KeyDef = { en: string; th: string; finger: Finger; shiftedTh?: string }
export type MasteryCriteria = { minAccuracy: number; minWpm: number; attempts: number }
export type Lesson = {
  id: number
  titleTh: string
  titleEn: string
  subtitleTh: string
  subtitleEn: string
  th: string
  en: string
  prerequisiteId?: number
  criteria: MasteryCriteria
  focusTh: string[]
  focusEn: string[]
}
