import type { TypingState } from './types'

export function calculateMetrics(states: TypingState[], elapsedSeconds: number) {
  const correctCount = states.filter((state) => state === 'correct').length
  const wrongCount = states.filter((state) => state === 'wrong').length
  const attempted = correctCount + wrongCount
  const accuracy = attempted === 0 ? 100 : Math.max(0, Math.round((correctCount / attempted) * 100))
  const minutes = Math.max(elapsedSeconds / 60, 1 / 60)
  const wpm = Math.round((correctCount / 5) / minutes)
  return { correctCount, wrongCount, accuracy, wpm }
}

export function progressPercent(index: number, textLength: number) {
  return Math.round((index / Math.max(textLength, 1)) * 100)
}
