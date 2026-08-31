import { StatsAdapter, TypingResult } from './stats-adapter'
import { LocalStorageAdapter } from './local-adapter'

/** Phase-3 stub. Replace with Supabase Auth/Postgres/Realtime later. */
export class SupabaseAdapter implements StatsAdapter {
  private fallback = new LocalStorageAdapter()

  saveResult(result: TypingResult) {
    return this.fallback.saveResult(result)
  }

  getResults(userId: string) {
    return this.fallback.getResults(userId)
  }

  getLeaderboard(limit = 10) {
    return this.fallback.getLeaderboard(limit)
  }
}
