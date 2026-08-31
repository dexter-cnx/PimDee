import { FirebaseAdapter } from './firebase-adapter'
import { LocalStorageAdapter } from './local-adapter'
import { SupabaseAdapter } from './supabase-adapter'
import type { StatsAdapter } from './stats-adapter'

export function getStatsAdapter(): StatsAdapter {
  switch ((import.meta.env.VITE_ADAPTER as string | undefined) ?? 'local') {
    case 'firebase': return new FirebaseAdapter()
    case 'supabase': return new SupabaseAdapter()
    default: return new LocalStorageAdapter()
  }
}
