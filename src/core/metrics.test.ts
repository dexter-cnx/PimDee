import { describe, expect, it } from 'vitest'
import { calculateMetrics, progressPercent } from './metrics'

describe('typing metrics', () => {
  it('calculates accuracy from attempted characters', () => expect(calculateMetrics(['correct','correct','wrong'], 60).accuracy).toBe(67))
  it('calculates standard five-character WPM', () => expect(calculateMetrics(Array(25).fill('correct'), 60).wpm).toBe(5))
  it('starts at 100% accuracy before input', () => expect(calculateMetrics([], 0).accuracy).toBe(100))
  it('calculates progress safely', () => expect(progressPercent(5, 10)).toBe(50))
})
