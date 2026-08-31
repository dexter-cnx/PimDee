import { describe, expect, it } from 'vitest'
import type { TypingResult } from '../adapters/stats-adapter'
import { LESSONS } from '../data/lessons'
import { buildAdaptiveDrill, isLessonUnlocked, lessonProgress } from './learning'

const result = (level: string, accuracy: number, wpm: number): TypingResult => ({ userId:'guest', level, accuracy, wpm, language:'TH', timestamp:Date.now(), mistakes:{} })

describe('lesson engine', () => {
  it('marks a lesson mastered only after meeting its criteria', () => {
    expect(lessonProgress(LESSONS[0], [result('L1', 96, 12)], 'TH').mastered).toBe(true)
    expect(lessonProgress(LESSONS[0], [result('L1', 94, 20)], 'TH').mastered).toBe(false)
  })
  it('unlocks the next lesson after prerequisite mastery', () => {
    expect(isLessonUnlocked(LESSONS[1], LESSONS, [], 'TH')).toBe(false)
    expect(isLessonUnlocked(LESSONS[1], LESSONS, [result('L1', 97, 15)], 'TH')).toBe(true)
  })
  it('builds drills from the most frequent mistakes', () => {
    const drill = buildAdaptiveDrill({ '่': 4, 'า': 2 }, ['ก'])
    expect(drill).toContain('่')
    expect(drill.length).toBeGreaterThan(20)
  })
})
