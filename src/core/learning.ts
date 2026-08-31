import type { TypingResult } from '../adapters/stats-adapter'
import type { Lang, Lesson } from './types'

export type LessonProgress = { attempts: number; bestAccuracy: number; bestWpm: number; mastered: boolean }

export function lessonProgress(lesson: Lesson, results: TypingResult[], language: Lang): LessonProgress {
  const relevant = results.filter((r) => r.level === `L${lesson.id}` && r.language === language)
  const qualifying = relevant.filter((r) => r.accuracy >= lesson.criteria.minAccuracy && r.wpm >= lesson.criteria.minWpm)
  return {
    attempts: relevant.length,
    bestAccuracy: relevant.reduce((best, r) => Math.max(best, r.accuracy), 0),
    bestWpm: relevant.reduce((best, r) => Math.max(best, r.wpm), 0),
    mastered: qualifying.length >= lesson.criteria.attempts,
  }
}

export function isLessonUnlocked(lesson: Lesson, lessons: Lesson[], results: TypingResult[], language: Lang) {
  if (!lesson.prerequisiteId) return true
  const prerequisite = lessons.find((item) => item.id === lesson.prerequisiteId)
  return prerequisite ? lessonProgress(prerequisite, results, language).mastered : true
}

export function buildAdaptiveDrill(mistakes: Record<string, number>, fallback: string[], targetLength = 54) {
  const ranked = Object.entries(mistakes).filter(([char]) => char.trim().length > 0).sort((a, b) => b[1] - a[1]).map(([char]) => char)
  const pool = ranked.length ? ranked : fallback
  if (!pool.length) return ''
  const chunks: string[] = []
  let cursor = 0
  while (chunks.join(' ').length < targetLength) {
    const a = pool[cursor % pool.length]
    const b = pool[(cursor + 1) % pool.length]
    const c = pool[(cursor + 2) % pool.length]
    chunks.push(`${a}${b}${c}`)
    cursor += 1
  }
  return chunks.join(' ').slice(0, targetLength).trim()
}
