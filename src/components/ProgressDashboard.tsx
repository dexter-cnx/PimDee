import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getStatsAdapter } from '../adapters'
import type { TypingResult } from '../adapters/stats-adapter'
import { buildDashboardSummary, completionPercent } from '../core/dashboard'
import type { Lang } from '../core/types'

const labelForLevel = (level: string, thai: boolean) => {
  if (level === 'race60') return 'Race 60s'
  if (level === 'tone-trainer') return thai ? 'ฝึกวรรณยุกต์' : 'Tone Trainer'
  if (level === 'custom') return thai ? 'ข้อความกำหนดเอง' : 'Custom practice'
  const match = /^L(\d+)$/.exec(level)
  return match ? (thai ? `บทที่ ${match[1]}` : `Lesson ${match[1]}`) : level
}

export function ProgressDashboard() {
  const { i18n } = useTranslation()
  const [language, setLanguage] = useState<Lang>('TH')
  const [results, setResults] = useState<TypingResult[]>([])
  const [loading, setLoading] = useState(true)
  const thai = i18n.language.startsWith('th')

  useEffect(() => {
    let active = true
    setLoading(true)
    void getStatsAdapter().getResults('guest').then((data) => {
      if (!active) return
      setResults(data)
      setLoading(false)
    }).catch(() => {
      if (!active) return
      setResults([])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const summary = useMemo(() => buildDashboardSummary(results, language), [results, language])
  const completion = completionPercent(summary.masteredLessons, summary.totalLessons)

  return <div className="dashboard-shell">
    <header className="dashboard-header">
      <div>
        <div className="dashboard-kicker">{thai ? 'ความก้าวหน้า' : 'Progress'}</div>
        <h1>{thai ? 'ภาพรวมการฝึกของคุณ' : 'Your typing progress'}</h1>
        <p>{thai ? 'สรุปจากข้อมูลที่เก็บในเครื่อง ยังไม่ต้องล็อกอิน' : 'A local-first summary from this browser. No login required yet.'}</p>
      </div>
      <div className="segmented">{(['TH','EN'] as Lang[]).map((item)=><button key={item} className={language===item?'active':''} onClick={()=>setLanguage(item)}>{item}</button>)}</div>
    </header>

    <main className="dashboard-main">
      <section className="dashboard-grid">
        <article className="dashboard-stat card"><small>{thai ? 'บทที่ผ่าน' : 'Lessons mastered'}</small><strong>{summary.masteredLessons}/{summary.totalLessons}</strong><span>{completion}%</span></article>
        <article className="dashboard-stat card"><small>{thai ? 'จำนวนครั้งที่ฝึกบทเรียน' : 'Lesson attempts'}</small><strong>{summary.attempts}</strong><span>{language}</span></article>
        <article className="dashboard-stat card"><small>Race 60s</small><strong>{summary.bestRaceWpm} WPM</strong><span>{summary.bestRaceAccuracy}% {thai ? 'แม่นยำสูงสุด' : 'best accuracy'}</span></article>
        <article className="dashboard-stat card"><small>{thai ? 'วรรณยุกต์' : 'Tone Trainer'}</small><strong>{summary.bestToneAccuracy}%</strong><span>{thai ? 'ความแม่นยำสูงสุด' : 'best tone accuracy'}</span></article>
      </section>

      <section className="dashboard-progress card">
        <div className="section-heading"><span>{thai ? 'ความคืบหน้าหลักสูตร' : 'Curriculum progress'}</span><span>{completion}%</span></div>
        <div className="dashboard-bar"><span style={{ width: `${completion}%` }} /></div>
        <p>{thai ? `ผ่านแล้ว ${summary.masteredLessons} จาก ${summary.totalLessons} บท` : `${summary.masteredLessons} of ${summary.totalLessons} lessons mastered`}</p>
      </section>

      <div className="dashboard-columns">
        <section className="card dashboard-panel">
          <div className="section-heading"><span>{thai ? 'จุดที่พลาดบ่อย' : 'Weak keys'}</span></div>
          {summary.weakKeys.length === 0 ? <p className="dashboard-empty">{thai ? 'ยังไม่มีข้อมูลความผิดพลาด' : 'No mistake data yet.'}</p> : <div className="weak-key-list">{summary.weakKeys.map((item)=><div key={item.char}><kbd>{item.char}</kbd><span>{item.count}×</span></div>)}</div>}
        </section>

        <section className="card dashboard-panel">
          <div className="section-heading"><span>{thai ? 'กิจกรรมล่าสุด' : 'Recent activity'}</span></div>
          {loading ? <p className="dashboard-empty">{thai ? 'กำลังโหลด…' : 'Loading…'}</p> : summary.recent.length === 0 ? <p className="dashboard-empty">{thai ? 'ยังไม่มีประวัติการฝึก' : 'No practice history yet.'}</p> : <div className="recent-list">{summary.recent.map((item)=><div key={`${item.timestamp}-${item.level}`}><div><strong>{labelForLevel(item.level, thai)}</strong><small>{new Date(item.timestamp).toLocaleString(thai ? 'th-TH' : 'en-US')}</small></div><span>{item.wpm} WPM · {item.accuracy}%</span></div>)}</div>}
        </section>
      </div>
    </main>
  </div>
}
