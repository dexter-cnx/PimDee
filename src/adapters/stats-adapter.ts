export interface TypingResult {
  userId: string
  wpm: number
  accuracy: number
  language: 'TH' | 'EN'
  level: string
  timestamp: number
  mistakes: Record<string, number>
}

export interface StatsAdapter {
  saveResult(result: TypingResult): Promise<void>
  getResults(userId: string): Promise<TypingResult[]>
  getLeaderboard(limit?: number): Promise<TypingResult[]>
}
