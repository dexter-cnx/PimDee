import { StatsAdapter, TypingResult } from './stats-adapter'

export class LocalStorageAdapter implements StatsAdapter {
  private key = 'pimdee_results'

  async saveResult(result: TypingResult) {
    const all: TypingResult[] = JSON.parse(localStorage.getItem(this.key) || '[]')
    all.push(result)
    localStorage.setItem(this.key, JSON.stringify(all))
  }

  async getResults(userId: string) {
    const all: TypingResult[] = JSON.parse(localStorage.getItem(this.key) || '[]')
    return all.filter((result) => result.userId === userId).sort((a, b) => b.timestamp - a.timestamp)
  }

  async getLeaderboard(limit = 10) {
    const all: TypingResult[] = JSON.parse(localStorage.getItem(this.key) || '[]')
    return [...all].sort((a, b) => b.wpm - a.wpm).slice(0, limit)
  }
}
