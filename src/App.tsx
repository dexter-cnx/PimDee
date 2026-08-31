import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getStatsAdapter } from './adapters'
import type { TypingResult } from './adapters/stats-adapter'
import { Keyboard } from './components/Keyboard'
import { Metric } from './components/Metric'
import { Tooltip } from './components/Tooltip'
import { equivalentKeyForChar, normalizeInput } from './core/keyboard'
import { calculateMetrics, progressPercent } from './core/metrics'
import type { Finger, Lang, Mode, TypingState } from './core/types'
import { LESSONS } from './data/lessons'
import { languageCode } from './i18n'

const fingers: Finger[] = ['lp','lr','lm','li','ri','rm','rr','rp']

export function App() {
  const { t, i18n } = useTranslation()
  const [language, setLanguage] = useState<Lang>('TH')
  const [lessonId, setLessonId] = useState(1)
  const [mode, setMode] = useState<Mode>('natural')
  const [customText, setCustomText] = useState('')
  const [usingCustom, setUsingCustom] = useState(false)
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState<string[]>([])
  const [states, setStates] = useState<TypingState[]>([])
  const [mistakes, setMistakes] = useState<Record<string, number>>({})
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [focused, setFocused] = useState(false)
  const [saved, setSaved] = useState(false)
  const practiceRef = useRef<HTMLDivElement>(null)
  const lesson = LESSONS.find((item) => item.id === lessonId) ?? LESSONS[0]
  const text = usingCustom && customText.trim() ? customText.trim() : language === 'TH' ? lesson.th : lesson.en

  useEffect(() => { void i18n.changeLanguage(languageCode(language)); document.documentElement.lang = languageCode(language) }, [i18n, language])

  const reset = (nextText = text) => {
    setIndex(0); setTyped(Array(nextText.length).fill('')); setStates(Array(nextText.length).fill('pending'))
    setMistakes({}); setStartedAt(null); setElapsed(0); setFinished(false); setSaved(false)
    requestAnimationFrame(() => practiceRef.current?.focus())
  }

  useEffect(() => { reset() }, [lessonId, language, usingCustom])
  useEffect(() => {
    if (!startedAt || finished) return
    const timer = window.setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 250)
    return () => window.clearInterval(timer)
  }, [startedAt, finished])

  const { correctCount, wrongCount, accuracy, wpm } = calculateMetrics(states, elapsed)
  const progress = progressPercent(index, text.length)
  const expectedKey = equivalentKeyForChar(text[index] ?? '', language)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!focused || finished || !text) return
      const value = normalizeInput(event, language)
      if (value === null) return
      event.preventDefault()
      if (!startedAt) setStartedAt(Date.now())
      if (value === 'BACKSPACE') {
        if (mode === 'forced' && states[index] === 'wrong') {
          setStates((prev) => { const next = [...prev]; next[index] = 'pending'; return next })
          setTyped((prev) => { const next = [...prev]; next[index] = ''; return next }); return
        }
        if (index > 0) {
          const previous = index - 1; setIndex(previous)
          setStates((prev) => { const next = [...prev]; next[previous] = 'pending'; return next })
          setTyped((prev) => { const next = [...prev]; next[previous] = ''; return next })
        }
        return
      }
      const expected = text[index]
      const isCorrect = value === expected
      setTyped((prev) => { const next = [...prev]; next[index] = value; return next })
      setStates((prev) => { const next = [...prev]; next[index] = isCorrect ? 'correct' : 'wrong'; return next })
      if (!isCorrect) {
        setMistakes((prev) => ({ ...prev, [expected]: (prev[expected] ?? 0) + 1 }))
        if (mode === 'forced') return
      }
      const nextIndex = index + 1
      if (nextIndex >= text.length) { setIndex(text.length); setElapsed(startedAt ? (Date.now() - startedAt) / 1000 : 0); setFinished(true) }
      else setIndex(nextIndex)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focused, finished, index, language, mode, startedAt, states, text])

  useEffect(() => {
    if (!finished || saved) return
    const result: TypingResult = { userId: 'guest', wpm, accuracy, language, level: usingCustom ? 'custom' : `L${lessonId}`, timestamp: Date.now(), mistakes }
    getStatsAdapter().saveResult(result).then(() => setSaved(true)).catch(() => setSaved(false))
  }, [accuracy, finished, language, lessonId, mistakes, saved, usingCustom, wpm])

  const topMistakes = useMemo(() => Object.entries(mistakes).sort((a, b) => b[1] - a[1]).slice(0, 8), [mistakes])
  const lessonTitle = language === 'TH' ? lesson.titleTh : lesson.titleEn
  const lessonSubtitle = language === 'TH' ? lesson.subtitleTh : lesson.subtitleEn

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">พ</div><div><div className="brand-title">{t('app.title')}</div><div className="brand-subtitle">{t('app.subtitle')}</div></div></div>
      <div className="toolbar"><span className="layout-pill">{language === 'TH' ? t('layout.kedmanee') : 'QWERTY'}</span><div className="segmented">
        {(['TH','EN'] as Lang[]).map((item) => <Tooltip key={item} hidden={language === item} label={t('tooltip.language')}><button aria-label={`${t('tooltip.language')}: ${item}`} className={language === item ? 'active' : ''} onClick={() => setLanguage(item)}>{item}</button></Tooltip>)}
      </div></div>
    </header>
    <div className="page-grid">
      <aside className="sidebar card"><div className="section-heading"><span>{t('sidebar.lessons')}</span><span className="badge">{t('sidebar.lessonCount')}</span></div><div className="lesson-list">
        {LESSONS.map((item) => { const selected = !usingCustom && lessonId === item.id; return <Tooltip key={item.id} hidden={selected} label={t('tooltip.lesson')}><button className={`lesson-item ${selected ? 'selected' : ''}`} onClick={() => { setUsingCustom(false); setLessonId(item.id) }}><span className="lesson-number">{item.id}</span><span><strong>{language === 'TH' ? item.titleTh : item.titleEn}</strong><small>{language === 'TH' ? item.subtitleTh : item.subtitleEn}</small></span></button></Tooltip> })}
      </div><div className="tip-box"><strong>{t('sidebar.tipTitle')}</strong><p>{t('sidebar.tipBody')}</p></div></aside>
      <main className="main-column">
        <div className="metrics"><Metric label="WPM" value={wpm}/><Metric label={t('metric.accuracy')} value={`${accuracy}%`}/><Metric label={t('metric.time')} value={`${Math.floor(elapsed)}s`}/></div>
        <section className={`practice card ${focused ? 'focused' : ''}`} ref={practiceRef} tabIndex={0} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
          <div className="practice-head"><div><strong>{usingCustom ? t('practice.customTitle') : `${t('practice.lesson')} ${lesson.id}: ${lessonTitle}`}</strong><small>{usingCustom ? t('practice.customSubtitle') : lessonSubtitle}</small></div><div className="practice-actions"><div className="segmented compact">
            {(['natural','forced'] as Mode[]).map((item) => <Tooltip key={item} hidden={mode === item} label={t(item === 'natural' ? 'tooltip.natural' : 'tooltip.forced')}><button className={mode === item ? 'active' : ''} onClick={(event) => { event.stopPropagation(); setMode(item) }}>{t(item === 'natural' ? 'mode.natural' : 'mode.forced')}</button></Tooltip>)}
          </div><Tooltip label={t('tooltip.reset')}><button aria-label={t('tooltip.reset')} className="icon-button" onClick={(event) => { event.stopPropagation(); reset() }}>↻</button></Tooltip></div></div>
          <div className="progress"><span style={{ width: `${progress}%` }}/></div><div className="typing-area" onClick={() => practiceRef.current?.focus()}>{!focused && !finished && <div className="focus-hint">⌨ {t('practice.focusHint')}</div>}<div className="typing-text">{text.split('').map((char, i) => <span key={`${i}-${char}`} className={`${states[i] ?? 'pending'} ${i === index && !finished ? 'cursor' : ''}`}>{char === ' ' ? '\u00A0' : char}</span>)}</div><div className="status-row"><span>{t('status.correct')} {correctCount}</span><span>{t('status.wrong')} {wrongCount}</span><span>{t(mode === 'forced' ? 'status.forced' : 'status.natural')}</span></div></div>
          <Keyboard language={language} expectedKey={expectedKey} mistakes={mistakes}/>
        </section>
        <section className="custom card"><div className="section-heading"><span>{t('custom.title')}</span><span className="badge">MVP</span></div><textarea value={customText} onChange={(event) => setCustomText(event.target.value)} placeholder={t('custom.placeholder')}/><div className="custom-actions"><Tooltip hidden={!usingCustom} label={t('tooltip.useLesson')}><button className="secondary" onClick={() => { setUsingCustom(false); reset(language === 'TH' ? lesson.th : lesson.en) }}>{t('custom.useLesson')}</button></Tooltip><Tooltip hidden={!customText.trim()} label={t('tooltip.practiceCustom')}><button className="primary" disabled={!customText.trim()} onClick={() => { setUsingCustom(true); reset(customText.trim()) }}>{t('custom.practice')}</button></Tooltip></div></section>
        {finished && <section className="result card"><div className="result-title">✓ {t('result.complete')}</div><p>{wpm} WPM · {accuracy}% · {Math.floor(elapsed)}s · {wrongCount} {t('result.mistakes')}</p><div className="heatmap-summary">{topMistakes.length === 0 ? <span className="perfect">{t('result.perfect')}</span> : topMistakes.map(([char,count]) => <span key={char}>{char} ×{count}</span>)}</div><div className="result-actions"><Tooltip label={t('tooltip.retry')}><button className="secondary" onClick={() => reset()}>{t('result.retry')}</button></Tooltip>{!usingCustom && <Tooltip label={t('tooltip.nextLesson')}><button className="primary" onClick={() => setLessonId((value) => value >= 6 ? 1 : value + 1)}>{t('result.next')}</button></Tooltip>}</div></section>}
      </main>
      <aside className="rightbar"><section className="card finger-guide"><div className="section-heading"><span>{t('finger.guide')}</span></div>{fingers.map((finger) => <div className="finger-row" key={finger}><span className={`finger-dot ${finger}`}/><span>{t(`finger.${finger}`)}</span></div>)}</section><section className="card roadmap-mini"><div className="section-heading"><span>Roadmap</span></div><p><strong>Phase 2:</strong> {t('roadmap.phase2')}</p><p><strong>Phase 3:</strong> {t('roadmap.phase3')}</p><p className="muted">{t('roadmap.storage')}</p></section></aside>
    </div><footer>{t('footer')}</footer>
  </div>
}
