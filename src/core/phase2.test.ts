import { describe, expect, it } from 'vitest'
import { countToneMarks, raceText, RACE_SECONDS, toneAccuracy, tonePrompt } from './phase2'

describe('phase 2 challenge core', () => {
  it('uses a 60 second race', () => expect(RACE_SECONDS).toBe(60))
  it('ships long race copy for both languages', () => {
    expect(raceText('TH').length).toBeGreaterThan(250)
    expect(raceText('EN').length).toBeGreaterThan(250)
  })
  it('cycles tone prompts deterministically', () => expect(tonePrompt(6)).toBe(tonePrompt(0)))
  it('counts Thai tone marks', () => expect(countToneMarks('เก่า ข้าว ก๊อก เก๋า')).toBe(4))
  it('calculates tone-mark-only accuracy', () => expect(toneAccuracy({ '่': 1 }, 'เก่า ข้าว')).toBe(50))
})
