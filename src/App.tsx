import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getStatsAdapter } from './adapters'
import type { TypingResult } from './adapters/stats-adapter'
import { Keyboard } from './components/Keyboard'
import { Metric } from './components/Metric'
import { Tooltip } from './components/Tooltip'
import { equivalentKeyForChar, normalizeInput } from './core/keyboard'
import { buildAdaptiveDrill, isLessonUnlocked, lessonProgress } from './core/learning'
import { calculateMetrics, progressPercent } from './core/metrics'
import type { Finger, Lang, Mode, TypingState } from './core/types'
import { LESSONS } from './data/lessons'
import { languageCode } from './i18n'

const fingers: Finger[] = ['lp','lr','lm','li','ri','rm','rr','rp']
const graphemeSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('th', { granularity: 'grapheme' })
  : null

type RenderSegment = { text: string; start: number; end: number }

function segmentForRendering(text: string): RenderSegment[] {
  if (!graphemeSegmenter) {
    return Array.from(text).map((char, index) => ({ text: char, start: index, end: index + char.length }))
  }

  return Array.from(graphemeSegmenter.segment(text), ({ segment, index }) => ({
    text: segment,
    start: index,
    end: index + segment.length,
  }))
}

function segmentState(states: TypingState[], segment: RenderSegment): TypingState {
  const segmentStates = states.slice(segment.start, segment.end)
  if (segmentStates.some((state) => state === 'wrong')) return 'wrong'
  if (segmentStates.length > 0 && segmentStates.every((state) => state === 'correct')) return 'correct'
  return 'pending'
}

export function App() {
  const { t, i18n } = useTranslation()
  const [language, setLanguage] = useState<Lang>('TH')
  const [lessonId, setLessonId] = useState(1)
  const [mode, setMode] = useState<Mode>('natural')
  const [customText, setCustomText] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
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
  const [results, setResults] = useState<TypingResult[]>([])
  const practiceRef = useRef<HTMLDivElement>(null)
  const lesson = LESSONS.find((item) => item.id === lessonId) ?? LESSONS[0]
  const text = usingCustom && customText.trim() ? customText.trim() : language === 'TH' ? lesson.th : lesson.en
  const renderSegments = useMemo(() => segmentForRendering(text), [text])

  useEffect(() => { void i18n.changeLanguage(languageCode(language)); document.documentElement.lang = languageCode(language) }, [i18n, language])
  useEffect(() => { void getStatsAdapter().getResults('guest').then(setResults) }, [])

  const reset = (nextText = text) => {
    setIndex(0); setTyped(Array(nextText.length).fill('')); setStates(Array(nextText.length).fill('pending'))
    setMistakes({}); setStartedAt(null); setElapsed(0); setFinished(false); setSaved(false)
    requestAnimationFrame(() => practiceRef.current?.focus())
  }
  useEffect(() => { reset() }, [lessonId, language, usingCustom])
  useEffect(() => { if (!startedAt || finished) return; const timer = window.setInterval(() => setElapsed((Date.now()-startedAt)/1000),250); return () => window.clearInterval(timer) }, [startedAt, finished])

  const { correctCount, wrongCount, accuracy, wpm } = calculateMetrics(states, elapsed)
  const progress = progressPercent(index, text.length)
  const expectedKey = equivalentKeyForChar(text[index] ?? '', language)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!focused || finished || !text) return
      const expected=text[index]
      const value = normalizeInput(event, language, expected); if (value === null) return; event.preventDefault(); if (!startedAt) setStartedAt(Date.now())
      if (value === 'BACKSPACE') {
        if (mode === 'forced' && states[index] === 'wrong') { setStates((p)=>{const n=[...p];n[index]='pending';return n}); setTyped((p)=>{const n=[...p];n[index]='';return n}); return }
        if (index>0) { const previous=index-1; setIndex(previous); setStates((p)=>{const n=[...p];n[previous]='pending';return n}); setTyped((p)=>{const n=[...p];n[previous]='';return n}) }
        return
      }
      const isCorrect=value===expected
      setTyped((p)=>{const n=[...p];n[index]=value;return n}); setStates((p)=>{const n=[...p];n[index]=isCorrect?'correct':'wrong';return n})
      if (!isCorrect) { setMistakes((p)=>({...p,[expected]:(p[expected]??0)+1})); if (mode==='forced') return }
      const nextIndex=index+1; if (nextIndex>=text.length) { setIndex(text.length); setElapsed(startedAt?(Date.now()-startedAt)/1000:0); setFinished(true) } else setIndex(nextIndex)
    }
    window.addEventListener('keydown',onKeyDown); return()=>window.removeEventListener('keydown',onKeyDown)
  },[focused,finished,index,language,mode,startedAt,states,text])

  useEffect(() => {
    if (!finished || saved) return
    const result: TypingResult={userId:'guest',wpm,accuracy,language,level:usingCustom?'custom':`L${lessonId}`,timestamp:Date.now(),mistakes}
    getStatsAdapter().saveResult(result).then(()=>{setSaved(true);setResults((current)=>[result,...current])}).catch(()=>setSaved(false))
  },[accuracy,finished,language,lessonId,mistakes,saved,usingCustom,wpm])

  const topMistakes=useMemo(()=>Object.entries(mistakes).sort((a,b)=>b[1]-a[1]).slice(0,8),[mistakes])
  const lessonTitle=language==='TH'?lesson.titleTh:lesson.titleEn
  const lessonSubtitle=language==='TH'?lesson.subtitleTh:lesson.subtitleEn
  const currentProgress=lessonProgress(lesson,results,language)
  const adaptiveText=buildAdaptiveDrill(mistakes,language==='TH'?lesson.focusTh:lesson.focusEn)
  const startAdaptive=()=>{ if(!adaptiveText)return; setCustomText(adaptiveText); setCustomOpen(false); setUsingCustom(true); reset(adaptiveText) }
  const startCustom=()=>{ if(!customText.trim())return; setUsingCustom(true); setCustomOpen(false); reset(customText.trim()) }
  const returnToLesson=()=>{ setUsingCustom(false); setCustomOpen(false); reset(language==='TH'?lesson.th:lesson.en) }

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">พ</div><div><div className="brand-title">{t('app.title')}</div><div className="brand-subtitle">{t('app.subtitle')}</div></div></div><div className="toolbar"><span className="layout-pill">{language==='TH'?t('layout.kedmanee'):'QWERTY'}</span><div className="segmented">{(['TH','EN'] as Lang[]).map((item)=><Tooltip key={item} hidden={language===item} label={t('tooltip.language')}><button className={language===item?'active':''} onClick={()=>setLanguage(item)}>{item}</button></Tooltip>)}</div></div></header>
    <div className="page-grid">
      <aside className="sidebar card"><div className="section-heading"><span>{t('sidebar.lessons')}</span><span className="badge">{t('sidebar.lessonCount')}</span></div><div className="lesson-list">{LESSONS.map((item)=>{const selected=!usingCustom&&lessonId===item.id;const unlocked=isLessonUnlocked(item,LESSONS,results,language);const p=lessonProgress(item,results,language);return <Tooltip key={item.id} hidden={selected} label={unlocked?t('tooltip.lesson'):t('learning.locked')}><button disabled={!unlocked} className={`lesson-item ${selected?'selected':''} ${p.mastered?'mastered':''}`} onClick={()=>{setUsingCustom(false);setCustomOpen(false);setLessonId(item.id)}}><span className="lesson-number">{p.mastered?'✓':item.id}</span><span><strong>{language==='TH'?item.titleTh:item.titleEn}</strong><small>{language==='TH'?item.subtitleTh:item.subtitleEn}</small><em className="lesson-progress">{p.mastered?t('learning.mastered'):p.attempts?`${t('learning.best')} ${p.bestAccuracy}% · ${p.bestWpm} WPM`:`${t('learning.goal')} ${item.criteria.minAccuracy}% · ${item.criteria.minWpm} WPM`}</em></span></button></Tooltip>})}</div><div className="tip-box"><strong>{t('sidebar.tipTitle')}</strong><p>{t('sidebar.tipBody')}</p></div></aside>
      <main className="main-column"><div className="metrics"><Metric label="WPM" value={wpm}/><Metric label={t('metric.accuracy')} value={`${accuracy}%`}/><Metric label={t('metric.time')} value={`${Math.floor(elapsed)}s`}/></div>
        <section className={`practice card ${focused?'focused':''}`} ref={practiceRef} tabIndex={0} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}><div className="practice-head"><div><strong>{usingCustom?t('practice.customTitle'):`${t('practice.lesson')} ${lesson.id}/${LESSONS.length}: ${lessonTitle}`}</strong><small>{usingCustom?t('practice.customSubtitle'):lessonSubtitle}</small></div><div className="practice-actions"><div className="segmented compact">{(['natural','forced'] as Mode[]).map((item)=><Tooltip key={item} hidden={mode===item} label={t(item==='natural'?'tooltip.natural':'tooltip.forced')}><button className={mode===item?'active':''} onClick={(e)=>{e.stopPropagation();setMode(item)}}>{t(item==='natural'?'mode.natural':'mode.forced')}</button></Tooltip>)}</div><Tooltip hidden={customOpen} label={t('tooltip.customText')}><button className={`text-action ${customOpen?'active':''}`} onClick={(e)=>{e.stopPropagation();setCustomOpen((value)=>!value)}}>{t('custom.open')}</button></Tooltip><Tooltip label={t('tooltip.reset')}><button className="icon-button" onClick={(e)=>{e.stopPropagation();reset()}}>↻</button></Tooltip></div></div><div className="progress"><span style={{width:`${progress}%`}}/></div><div className="typing-area" onClick={()=>practiceRef.current?.focus()}>{!focused&&!finished&&<div className="focus-hint">⌨ {t('practice.focusHint')}</div>}<div className="typing-text" lang={languageCode(language)}>{renderSegments.map((segment)=>{const state=segmentState(states,segment);const cursor=!finished&&index>=segment.start&&index<segment.end;return <span key={`${segment.start}-${segment.text}`} className={`grapheme ${state} ${cursor?'cursor':''}`}>{segment.text===' '?'\u00A0':segment.text}</span>})}</div><div className="status-row"><span>{t('status.correct')} {correctCount}</span><span>{t('status.wrong')} {wrongCount}</span><span>{t(mode==='forced'?'status.forced':'status.natural')}</span>{!usingCustom&&<span>{t('learning.goal')} {lesson.criteria.minAccuracy}% · {lesson.criteria.minWpm} WPM</span>}</div></div><Keyboard language={language} expectedKey={expectedKey} mistakes={mistakes}/></section>
        {customOpen&&<section className="custom card"><div className="section-heading"><span>{t('custom.title')}</span><button className="close-action" aria-label={t('custom.close')} onClick={()=>setCustomOpen(false)}>×</button></div><textarea autoFocus value={customText} onChange={(e)=>setCustomText(e.target.value)} placeholder={t('custom.placeholder')}/><div className="custom-actions">{usingCustom&&<button className="secondary" onClick={returnToLesson}>{t('custom.useLesson')}</button>}<button className="primary" disabled={!customText.trim()} onClick={startCustom}>{t('custom.practice')}</button></div></section>}
        {finished&&<section className="result card"><div className="result-title">✓ {t('result.complete')}</div><p>{wpm} WPM · {accuracy}% · {Math.floor(elapsed)}s · {wrongCount} {t('result.mistakes')}</p>{!usingCustom&&<p className="mastery-line">{currentProgress.mastered?t('learning.mastered'):`${t('learning.goal')} ${lesson.criteria.minAccuracy}% · ${lesson.criteria.minWpm} WPM`}</p>}<div className="heatmap-summary">{topMistakes.length===0?<span className="perfect">{t('result.perfect')}</span>:topMistakes.map(([char,count])=><span key={char}>{char} ×{count}</span>)}</div><div className="result-actions">{adaptiveText&&<Tooltip label={t('learning.adaptiveHint')}><button className="secondary" onClick={startAdaptive}>{t('learning.adaptive')}</button></Tooltip>}<button className="secondary" onClick={()=>reset()}>{t('result.retry')}</button>{usingCustom?<button className="secondary" onClick={returnToLesson}>{t('custom.useLesson')}</button>:lesson.id<LESSONS.length&&<button className="primary" disabled={!isLessonUnlocked(LESSONS[lesson.id],LESSONS,results,language)} onClick={()=>setLessonId((value)=>value+1)}>{t('result.next')}</button>}</div></section>}
      </main>
      <aside className="rightbar"><section className="card finger-guide"><div className="section-heading"><span>{t('finger.guide')}</span></div>{fingers.map((finger)=><div className="finger-row" key={finger}><span className={`finger-dot ${finger}`}/><span>{t(`finger.${finger}`)}</span></div>)}</section><section className="card roadmap-mini"><div className="section-heading"><span>Roadmap</span></div><p><strong>Phase 2:</strong> {t('roadmap.phase2')}</p><p><strong>Phase 3:</strong> {t('roadmap.phase3')}</p><p className="muted">{t('roadmap.storage')}</p></section></aside>
    </div><footer>{t('footer')}</footer>
  </div>
}
