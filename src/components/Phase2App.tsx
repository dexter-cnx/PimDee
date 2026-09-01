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

const graphemeSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('th', { granularity: 'grapheme' })
  : null
const standaloneMarkPattern = /^\p{Mark}+$/u

type DisplayToken =
  | { kind: 'text'; text: string; start: number; end: number }
  | { kind: 'space'; text: 'SP'; start: number; end: number }
  | { kind: 'mark'; text: string; start: number; end: number; position: 'upper' | 'lower' }

function markPosition(mark: string): 'upper' | 'lower' {
  return mark === 'ุ' || mark === 'ู' ? 'lower' : 'upper'
}

function buildDisplayTokens(text: string): DisplayToken[] {
  const tokens: DisplayToken[] = []
  let runStart = 0

  const pushNonSpaceRun = (run: string, absoluteStart: number) => {
    if (!run) return
    const segments = graphemeSegmenter
      ? Array.from(graphemeSegmenter.segment(run), ({ segment, index }) => ({ segment, index }))
      : Array.from(run).map((segment, index) => ({ segment, index }))

    for (const { segment, index } of segments) {
      const start = absoluteStart + index
      if (standaloneMarkPattern.test(segment)) {
        Array.from(segment).forEach((mark, offset) => {
          tokens.push({ kind: 'mark', text: mark, start: start + offset, end: start + offset + 1, position: markPosition(mark) })
        })
      } else {
        tokens.push({ kind: 'text', text: segment, start, end: start + segment.length })
      }
    }
  }

  for (let cursor = 0; cursor <= text.length; cursor += 1) {
    const atEnd = cursor === text.length
    const atSpace = !atEnd && text[cursor] === ' '
    if (!atEnd && !atSpace) continue
    pushNonSpaceRun(text.slice(runStart, cursor), runStart)
    if (atSpace) {
      tokens.push({ kind: 'space', text: 'SP', start: cursor, end: cursor + 1 })
      runStart = cursor + 1
    }
  }

  return tokens
}

function tokenState(states: TypingState[], token: DisplayToken): TypingState {
  const tokenStates = states.slice(token.start, token.end)
  if (tokenStates.some((state) => state === 'wrong')) return 'wrong'
  if (tokenStates.length > 0 && tokenStates.every((state) => state === 'correct')) return 'correct'
  return 'pending'
}

function isCurrentToken(token: DisplayToken, index: number, finished: boolean): boolean {
  if (finished) return false
  if (token.kind === 'text') return index >= token.start && index < token.end
  return index === token.start
}

export function Phase2App({ challenge }: { challenge: 'race' | 'tones' }) {
  const { t, i18n } = useTranslation()
  const [language, setLanguage] = useState<Lang>('TH')
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
  const thai = i18n.language.startsWith('th')
  const text = isRace ? raceText(language) : tonePrompt(round)
  const displayTokens = useMemo(() => buildDisplayTokens(text), [text])
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
  const nextToneRound = () => setRound((value) => value + 1)

  return <div className="phase2-shell">
    <header className="phase2-header"><div><div className="phase2-kicker">Phase 2 Challenge</div><h1>{isRace ? (thai?'Race 60 วินาที':'60-second Race') : (thai?'ฝึกวรรณยุกต์':'Tone Mark Trainer')}</h1><p>{isRace ? (thai?'พิมพ์ต่อเนื่องหนึ่งนาที โดยรักษาสมดุลระหว่างความเร็วและความแม่น':'Type naturally for one minute and balance speed with accuracy.') : (thai?'ฝึกวรรณยุกต์ไทยด้วยคำและประโยคสั้นที่ใช้จริง':'Focus on Thai tone marks with short real-word rounds.')}</p></div>{isRace && <div className="segmented">{(['TH','EN'] as Lang[]).map((item)=><button key={item} className={language===item?'active':''} onClick={()=>setLanguage(item)}>{item}</button>)}</div>}</header>
    <main className="phase2-main">
      <div className="metrics"><Metric label="WPM" value={wpm}/><Metric label={isRace?t('metric.accuracy'):(thai?'แม่นยำวรรณยุกต์':'Tone accuracy')} value={`${isRace?accuracy:toneScore}%`}/><Metric label={isRace?(thai?'เหลือเวลา':'Remaining'):(thai?'วรรณยุกต์':'Tone marks')} value={isRace?`${Math.ceil(remaining)}s`:countToneMarks(text)}/></div>
      <section className={`practice card ${focused?'focused':''}`} ref={practiceRef} tabIndex={0} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}>
        <div className="practice-head"><div><strong>{isRace?(thai?'ชาเลนจ์หนึ่งนาที':'One minute challenge'):`${thai?'รอบ':'Round'} ${round+1}`}</strong><small>{isRace?(thai?'โหมดธรรมชาติ · พิมพ์ผิดแล้วนับแต่ไปต่อได้':'Natural mode · errors count but you keep moving.'):(thai?'ดูวรรณยุกต์ให้ชัดแล้วกดปุ่มจริงให้ถูก':'Watch the tone mark and use the correct physical key.')}</small></div><button className="icon-button" onClick={()=>reset()}>↻</button></div>
        <div className="progress"><span style={{width:`${progress}%`}}/></div>
        <div className="typing-area" onClick={()=>practiceRef.current?.focus()}>{!focused&&!finished&&<div className="focus-hint">⌨ {t('practice.focusHint')}</div>}<div className="typing-text" lang={languageCode(language)}>{displayTokens.map((token)=>{const state=tokenState(states,token);const current=isCurrentToken(token,index,finished);if(token.kind==='space')return <span key={`space-${token.start}`} className={`grapheme space-token ${state} ${current?'current':''}`}>SP</span>;if(token.kind==='mark')return <span key={`mark-${token.start}`} className={`grapheme mark-token ${token.position} ${state} ${current?'current':''}`}><span className="mark-guide"/><span className="mark-glyph">{token.text}</span></span>;return <span key={`text-${token.start}`} className={`grapheme text-token ${state} ${current?'current':''}`}>{token.text}</span>})}</div><div className="status-row"><span>{t('status.correct')} {correctCount}</span><span>{t('status.wrong')} {wrongCount}</span>{!isRace&&<span>{thai?'โฟกัส':'Focus'} ่ ้ ๊ ๋</span>}</div></div>
        <Keyboard language={language} expectedKey={expectedKey} mistakes={mistakes}/>
      </section>
      {finished&&<section className="result card"><div className="result-title">✓ {isRace?(thai?'Race จบแล้ว':'Race complete'):(thai?'จบรอบแล้ว':'Round complete')}</div><p>{wpm} WPM · {isRace?accuracy:toneScore}% · {wrongCount} {t('result.mistakes')}</p><div className="heatmap-summary">{topMistakes.length===0?<span className="perfect">{t('result.perfect')}</span>:topMistakes.map(([char,count])=><span key={char}>{char} ×{count}</span>)}</div><div className="result-actions"><button className="secondary" onClick={()=>reset()}>{t('result.retry')}</button>{!isRace&&<button className="primary" onClick={nextToneRound}>{thai?'รอบถัดไป →':'Next round →'}</button>}</div></section>}
    </main>
  </div>
}
