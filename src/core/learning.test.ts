import { describe, expect, it } from 'vitest'
import type { TypingResult } from '../adapters/stats-adapter'
import { LESSONS } from '../data/lessons'
import { buildAdaptiveDrill, isLessonUnlocked, lessonProgress } from './learning'

const result = (level: string, accuracy: number, wpm: number): TypingResult => ({ userId:'guest', level, accuracy, wpm, language:'TH', timestamp:Date.now(), mistakes:{} })

describe('lesson engine', () => {
  it('ships the complete 36-lesson curriculum', () => {
    expect(LESSONS).toHaveLength(36)
    expect(LESSONS.at(-1)?.id).toBe(36)
  })
  it('marks a lesson mastered only after meeting its criteria', () => {
    const lesson = LESSONS[0]
    expect(lessonProgress(lesson, [result('L1', lesson.criteria.minAccuracy, lesson.criteria.minWpm)], 'TH').mastered).toBe(true)
    expect(lessonProgress(lesson, [result('L1', lesson.criteria.minAccuracy - 1, lesson.criteria.minWpm + 20)], 'TH').mastered).toBe(false)
  })
  it('reports best accuracy and WPM from the same representative attempt', () => {
    const lesson = LESSONS[0]
    const progress = lessonProgress(lesson, [result('L1', 100, 5), result('L1', 90, 20)], 'TH')
    expect([[100, 5], [90, 20]]).toContainEqual([progress.bestAccuracy, progress.bestWpm])
    expect(progress.mastered).toBe(false)
  })
  it('unlocks the next lesson after prerequisite mastery', () => {
    expect(isLessonUnlocked(LESSONS[1], LESSONS, [], 'TH')).toBe(false)
    expect(isLessonUnlocked(LESSONS[1], LESSONS, [result('L1', 100, 50)], 'TH')).toBe(true)
  })
  it('chains every lesson to the previous lesson', () => {
    expect(LESSONS[0].prerequisiteId).toBeUndefined()
    LESSONS.slice(1).forEach((lesson) => expect(lesson.prerequisiteId).toBe(lesson.id - 1))
  })
  it('builds drills from the most frequent mistakes', () => {
    const drill = buildAdaptiveDrill({ '่': 4, 'า': 2 }, ['ก'])
    expect(drill).toContain('่')
    expect(drill.length).toBeGreaterThan(20)
  })
})
