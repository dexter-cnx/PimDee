import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getStatsAdapter } from '../adapters'
import { equivalentKeyForChar, normalizeInput } from '../core/keyboard'
import { calculateMetrics, progressPercent } from '../core/metrics'
import { countToneMarks, raceText, RACE_SECONDS, toneAccuracy, tonePrompt } from '../core/phase2'
import type { Lang, TypingState } from '../core/types'
import { languageCode } from '../i18n'
import { Keyboard } from './Keyboard'
import { Metric } from './Metric'

export function Phase2App({ challenge }: { challenge: 'race' | 'tones' }) {
  const { t, i18n } = useTranslation()
  const [language, setLanguage] = useState<Lang>(challenge === 'tones' ? 'TH' : 'TH')
  const [round, setRound] = useState(0)
  const [index, setIndex] = useState(0)
  const [states, setStates] = useState<TypingState[]>([])
  const [mistakes, setMistakes] = useState<Record<string, number>>({})
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [focused, setFocused] = useState(false)
  const [saved, setSaved] = useState(false)
  const practiceRef = useRef<HTMLDivElement>(null)
  const isRace = challenge === 'race'
  const text = isRace ? raceText(language) : tonePrompt(round)
  const remaining = isRace ? Math.max(0, RACE_SECONDS - elapsed) : 0
  const { correctCount, wrongCount, accuracy, wpm } = calculateMetrics(states, Math.max(elapsed, 0.001))
  const toneScore = toneAccuracy(mistakes, text)
  const progress = isRace ? Math.min(100, (elapsed / RACE_SECONDS) * 100) : progressPercent(index, text.length)
  const expectedKey = equivalentKeyForChar(text[index] ?? '', language)

  useEffect(() => { void i18n.changeLanguage(languageCode(language)); document.documentElement.lang = languageCode(language) }, [i18n, language])
  useEffect(() => { if (challenge === 'tones') setLanguage('TH') }, [challenge])

  const reset = (nextRound = round) => {
    const nextText = isRace ? raceText(language) : tonePrompt(nextRound)
    setIndex(0); setStates(Array(nextText.length).fill('pending')); setMistakes({}); setStartedAt(null); setElapsed(0); setFinished(false); setSaved(false)
    requestAnimationFrame(() => practiceRef.current?.focus())
  }
  useEffect(() => { reset() }, [challenge, language, round])

  useEffect(() => {
    if (!startedAt || finished) return
    const timer = window.setInterval(() => {
      const seconds = (Date.now() - startedAt) / 1000
      if (isRace && seconds >= RACE_SECONDS) { setElapsed(RACE_SECONDS); setFinished(true); return }
      setElapsed(seconds)
    }, 100)
    return () => window.clearInterval(timer)
  }, [finished, isRace, startedAt])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!focused || finished || !text) return
      const expected = text[index]
      const value = normalizeInput(event, language, expected)
      if (value === null || value === 'BACKSPACE') return
      event.preventDefault()
      if (!startedAt) setStartedAt(Date.now())
      const isCorrect = value === expected
      setStates((current) => { const next = [...current]; next[index] = isCorrect ? 'correct' : 'wrong'; return next })
      if (!isCorrect) setMistakes((current) => ({ ...current, [expected]: (current[expected] ?? 0) + 1 }))
      const nextIndex = index + 1
      if (nextIndex >= text.length) { setIndex(text.length); setElapsed(startedAt ? (Date.now() - startedAt) / 1000 : 0); setFinished(true) } else setIndex(nextIndex)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finished, focused, index, language, startedAt, text])

  useEffect(() => {
    if (!finished || saved) return
    const result = { userId:'guest', wpm, accuracy: isRace ? accuracy : toneScore, language, level: isRace ? 'race60' : 'tone-trainer', timestamp:Date.now(), mistakes }
    getStatsAdapter().saveResult(result).then(() => setSaved(true)).catch(() => setSaved(false))
  }, [accuracy, finished, isRace, language, mistakes, saved, toneScore, wpm])

  const topMistakes = useMemo(() => Object.entries(mistakes).sort((a,b)=>b[1]-a[1]).slice(0,6), [mistakes])
  const nextToneRound = () => { const next = round + 1; setRound(next); reset(next) }

  return <div className="phase2-shell">
    <header className="phase2-header"><div><div className="phase2-kicker">{t('phase2.badge')}</div><h1>{isRace ? t('race.title') : t('tone.title')}</h1><p>{isRace ? t('race.subtitle') : t('tone.subtitle')}</p></div>{isRace && <div className="segmented">{(['TH','EN'] as Lang[]).map((item)=><button key={item} className={language===item?'active':''} onClick={()=>setLanguage(item)}>{item}</button>)}</div>}</header>
    <main className="phase2-main">
      <div className="metrics"><Metric label="WPM" value={wpm}/><Metric label={isRace?t('metric.accuracy'):t('tone.accuracy')} value={`${isRace?accuracy:toneScore}%`}/><Metric label={isRace?t('race.remaining'):t('tone.marks')} value={isRace?`${Math.ceil(remaining)}s`:countToneMarks(text)}/></div>
      <section className={`practice card ${focused?'focused':''}`} ref={practiceRef} tabIndex={0} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}>
        <div className="practice-head"><div><strong>{isRace?t('race.prompt'):`${t('tone.round')} ${round+1}`}</strong><small>{isRace?t('race.hint'):t('tone.hint')}</small></div><button className="icon-button" onClick={()=>reset()}>↻</button></div>
        <div className="progress"><span style={{width:`${progress}%`}}/></div>
        <div className="typing-area" onClick={()=>practiceRef.current?.focus()}>{!focused&&!finished&&<div className="focus-hint">⌨ {t('practice.focusHint')}</div>}<div className="typing-text">{text.split('').map((char,i)=><span key={`${i}-${char}`} className={`${states[i]??'pending'} ${i===index&&!finished?'cursor':''}`}>{char===' '?'\u00A0':char}</span>)}</div><div className="status-row"><span>{t('status.correct')} {correctCount}</span><span>{t('status.wrong')} {wrongCount}</span>{!isRace&&<span>{t('tone.focus')} ่ ้ ๊ ๋</span>}</div></div>
        <Keyboard language={language} expectedKey={expectedKey} mistakes={mistakes}/>
      </section>
      {finished&&<section className="result card"><div className="result-title">✓ {isRace?t('race.complete'):t('tone.complete')}</div><p>{wpm} WPM · {isRace?accuracy:toneScore}% · {wrongCount} {t('result.mistakes')}</p><div className="heatmap-summary">{topMistakes.length===0?<span className="perfect">{t('result.perfect')}</span>:topMistakes.map(([char,count])=><span key={char}>{char} ×{count}</span>)}</div><div className="result-actions"><button className="secondary" onClick={()=>reset()}>{t('result.retry')}</button>{!isRace&&<button className="primary" onClick={nextToneRound}>{t('tone.next')}</button>}</div></section>}
    </main>
  </div>
}
