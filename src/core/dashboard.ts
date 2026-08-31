import type { TypingResult } from '../adapters/stats-adapter'
import { LESSONS } from '../data/lessons'
import { lessonProgress } from './learning'
import type { Lang } from './types'

export type DashboardSummary = {
  attempts: number
  masteredLessons: number
  totalLessons: number
  bestRaceWpm: number
  bestRaceAccuracy: number
  bestToneAccuracy: number
  recent: TypingResult[]
  weakKeys: Array<{ char: string; count: number }>
}

export function buildDashboardSummary(results: TypingResult[], language: Lang): DashboardSummary {
  const languageResults = results.filter((result) => result.language === language)
  const lessonResults = languageResults.filter((result) => /^L\d+$/.test(result.level))
  const masteredLessons = LESSONS.filter((lesson) => lessonProgress(lesson, results, language).mastered).length
  const races = languageResults.filter((result) => result.level === 'race60')
  const tones = results.filter((result) => result.level === 'tone-trainer' && result.language === 'TH')
  const weakMap = new Map<string, number>()

  for (const result of languageResults) {
    for (const [char, count] of Object.entries(result.mistakes)) {
      if (!char.trim()) continue
      weakMap.set(char, (weakMap.get(char) ?? 0) + count)
    }
  }

  const weakKeys = [...weakMap.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([char, count]) => ({ char, count }))

  return {
    attempts: lessonResults.length,
    masteredLessons,
    totalLessons: LESSONS.length,
    bestRaceWpm: races.reduce((best, result) => Math.max(best, result.wpm), 0),
    bestRaceAccuracy: races.reduce((best, result) => Math.max(best, result.accuracy), 0),
    bestToneAccuracy: tones.reduce((best, result) => Math.max(best, result.accuracy), 0),
    recent: [...languageResults].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8),
    weakKeys,
  }
}

export function completionPercent(masteredLessons: number, totalLessons: number) {
  if (totalLessons <= 0) return 0
  return Math.round((masteredLessons / totalLessons) * 100)
}
