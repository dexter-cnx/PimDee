import { StatsAdapter, TypingResult } from './stats-adapter'
import { LocalStorageAdapter } from './local-adapter'

/**
 * Phase-3 stub. Replace with Firebase Auth + Firestore implementation later.
 * Until then it deliberately delegates to local storage so selecting the adapter
 * never makes the static GitHub Pages build unusable.
 */
export class FirebaseAdapter implements StatsAdapter {
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
