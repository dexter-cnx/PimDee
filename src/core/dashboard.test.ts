import { describe, expect, it } from 'vitest'
import type { TypingResult } from '../adapters/stats-adapter'
import { LESSONS } from '../data/lessons'
import { buildDashboardSummary, completionPercent } from './dashboard'

const result = (overrides: Partial<TypingResult>): TypingResult => ({
  userId: 'guest',
  wpm: 12,
  accuracy: 96,
  language: 'TH',
  level: 'L1',
  timestamp: 1,
  mistakes: {},
  ...overrides,
})

describe('progress dashboard', () => {
  it('counts mastered lessons using the lesson engine criteria', () => {
    const lesson = LESSONS[0]
    const summary = buildDashboardSummary([
      result({ level: 'L1', accuracy: lesson.criteria.minAccuracy, wpm: lesson.criteria.minWpm }),
    ], 'TH')
    expect(summary.masteredLessons).toBe(1)
    expect(summary.totalLessons).toBe(36)
  })

  it('separates race and tone bests and aggregates weak keys', () => {
    const summary = buildDashboardSummary([
      result({ level: 'race60', wpm: 42, accuracy: 95, mistakes: { '่': 2 } }),
      result({ level: 'race60', wpm: 38, accuracy: 99, mistakes: { '่': 1, 'ก': 4 } }),
      result({ level: 'tone-trainer', accuracy: 91, mistakes: { '้': 3 } }),
    ], 'TH')
    expect(summary.bestRaceWpm).toBe(42)
    expect(summary.bestRaceAccuracy).toBe(99)
    expect(summary.bestToneAccuracy).toBe(91)
    expect(summary.weakKeys[0]).toEqual({ char: 'ก', count: 4 })
  })

  it('filters recent activity by language', () => {
    const summary = buildDashboardSummary([
      result({ timestamp: 10, language: 'TH' }),
      result({ timestamp: 20, language: 'EN' }),
    ], 'TH')
    expect(summary.recent).toHaveLength(1)
    expect(summary.recent[0].language).toBe('TH')
  })

  it('calculates completion percentage safely', () => {
    expect(completionPercent(18, 36)).toBe(50)
    expect(completionPercent(1, 0)).toBe(0)
  })
})
