import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getStatsAdapter } from './adapters'
import type { TypingResult } from './adapters/stats-adapter'
import './styles.css'

type Lang = 'TH' | 'EN'
type Mode = 'natural' | 'forced'
type Finger = 'lp' | 'lr' | 'lm' | 'li' | 'ri' | 'rm' | 'rr' | 'rp' | 'thumb'

type KeyDef = { en: string; th: string; finger: Finger; shiftedTh?: string }

type Lesson = {
  id: number
  titleTh: string
  titleEn: string
  subtitleTh: string
  subtitleEn: string
  th: string
  en: string
}

const TH_MAP: Record<string, string> = {
  '`': '_', '1': 'ๅ', '2': '/', '3': '-', '4': 'ภ', '5': 'ถ', '6': 'ุ', '7': 'ึ', '8': 'ค', '9': 'ต', '0': 'จ', '-': 'ข', '=': 'ช',
  q: 'ๆ', w: 'ไ', e: 'ำ', r: 'พ', t: 'ะ', y: 'ั', u: 'ี', i: 'ร', o: 'น', p: 'ย', '[': 'บ', ']': 'ล', '\\': 'ฃ',
  a: 'ฟ', s: 'ห', d: 'ก', f: 'ด', g: 'เ', h: '้', j: '่', k: 'า', l: 'ส', ';': 'ว', "'": 'ง',
  z: 'ผ', x: 'ป', c: 'แ', v: 'อ', b: 'ิ', n: 'ื', m: 'ท', ',': 'ม', '.': 'ใ', '/': 'ฝ', ' ': ' ',
}

const TH_SHIFT_MAP: Record<string, string> = {
  '`': '%', '1': '+', '2': '๑', '3': '๒', '4': '๓', '5': '๔', '6': 'ู', '7': '฿', '8': '๕', '9': '๖', '0': '๗', '-': '๘', '=': '๙',
  q: '๐', w: '"', e: 'ฎ', r: 'ฑ', t: 'ธ', y: 'ํ', u: '๊', i: 'ณ', o: 'ฯ', p: 'ญ', '[': 'ฐ', ']': ',', '\\': 'ฅ',
  a: 'ฤ', s: 'ฆ', d: 'ฏ', f: 'โ', g: 'ฌ', h: '็', j: '๋', k: 'ษ', l: 'ศ', ';': 'ซ', "'": '.',
  z: '(', x: ')', c: 'ฉ', v: 'ฮ', b: 'ฺ', n: '์', m: '?', ',': 'ฒ', '.': 'ฬ', '/': 'ฦ',
}

const KEYS: KeyDef[][] = [
  [
    { en: 'q', th: 'ๆ', finger: 'lp' }, { en: 'w', th: 'ไ', finger: 'lr' }, { en: 'e', th: 'ำ', finger: 'lm' },
    { en: 'r', th: 'พ', finger: 'li' }, { en: 't', th: 'ะ', finger: 'li' }, { en: 'y', th: 'ั', finger: 'ri' },
    { en: 'u', th: 'ี', finger: 'ri', shiftedTh: '๊' }, { en: 'i', th: 'ร', finger: 'rm' }, { en: 'o', th: 'น', finger: 'rr' },
    { en: 'p', th: 'ย', finger: 'rp' }, { en: '[', th: 'บ', finger: 'rp' }, { en: ']', th: 'ล', finger: 'rp' },
  ],
  [
    { en: 'a', th: 'ฟ', finger: 'lp' }, { en: 's', th: 'ห', finger: 'lr' }, { en: 'd', th: 'ก', finger: 'lm' },
    { en: 'f', th: 'ด', finger: 'li' }, { en: 'g', th: 'เ', finger: 'li' }, { en: 'h', th: '้', finger: 'ri', shiftedTh: '็' },
    { en: 'j', th: '่', finger: 'ri', shiftedTh: '๋' }, { en: 'k', th: 'า', finger: 'rm' }, { en: 'l', th: 'ส', finger: 'rr' },
    { en: ';', th: 'ว', finger: 'rp' }, { en: "'", th: 'ง', finger: 'rp' },
  ],
  [
    { en: 'z', th: 'ผ', finger: 'lp' }, { en: 'x', th: 'ป', finger: 'lr' }, { en: 'c', th: 'แ', finger: 'lm' },
    { en: 'v', th: 'อ', finger: 'li' }, { en: 'b', th: 'ิ', finger: 'li' }, { en: 'n', th: 'ื', finger: 'ri', shiftedTh: '์' },
    { en: 'm', th: 'ท', finger: 'ri' }, { en: ',', th: 'ม', finger: 'rm' }, { en: '.', th: 'ใ', finger: 'rr' },
    { en: '/', th: 'ฝ', finger: 'rp' },
  ],
]

const LESSONS: Lesson[] = [
  {
    id: 1,
    titleTh: 'แถวเหย้า', titleEn: 'Home row',
    subtitleTh: 'วางนิ้วให้ถูกตำแหน่งก่อน', subtitleEn: 'Build the home-row habit first',
    th: 'ฟ ห ก ด ่ า ส ว ฟหกด ่าสว ฟหกด่าสว ฟ ห ก ด ่ า ส ว',
    en: 'a s d f j k l ; asdf jkl; asdfjkl; a s d f j k l ;',
  },
  {
    id: 2,
    titleTh: 'แถวบน', titleEn: 'Top row',
    subtitleTh: 'ยกนิ้วจากแถวเหย้าแล้วกลับจุดพัก', subtitleEn: 'Reach upward, then return home',
    th: 'ๆ ไ ำ พ ะ ั ี ร น ย บ ล พาย ระบายน้ำ นารี พิมพ์',
    en: 'q w e r t y u i o p [ ] type quiet power writer',
  },
  {
    id: 3,
    titleTh: 'แถวล่าง', titleEn: 'Bottom row',
    subtitleTh: 'ฝึกนิ้วล่างโดยไม่ก้มมองแป้น', subtitleEn: 'Reach down without looking',
    th: 'ผ ป แ อ ิ ื ท ม ใ ฝ ผม ปิด แฟ้ม ใหม่ ฝึกพิมพ์',
    en: 'z x c v b n m , . / mix cabin zoom calm',
  },
  {
    id: 4,
    titleTh: 'วรรณยุกต์', titleEn: 'Tone marks',
    subtitleTh: 'โฟกัส ่ ้ ๊ ๋ ์ ็ และ Shift', subtitleEn: 'Practice tone marks and Shift',
    th: 'ก่า ก้า ก๊า ก๋า ก์ ก็ ข่าว ข้าว ก๊อก เก๋า เก็บ พิมพ์ให้แม่น',
    en: 'shift marks accuracy first keep fingers relaxed',
  },
  {
    id: 5,
    titleTh: 'สลับภาษา TH/EN', titleEn: 'Switch TH/EN',
    subtitleTh: 'ฝึกข้อความผสมที่เจอจริง', subtitleEn: 'Practice mixed everyday text',
    th: 'ประชุม Zoom เวลา 10:00 ส่งไฟล์ PDF ให้ทีม แล้วตอบ OK',
    en: 'เปิด LINE แล้วพิมพ์ meeting confirmed จากนั้นตอบ ขอบคุณ',
  },
  {
    id: 6,
    titleTh: 'ประโยคใช้งานจริง', titleEn: 'Everyday sentences',
    subtitleTh: 'พิมพ์ต่อเนื่องแบบงานจริง', subtitleEn: 'Build flow with realistic sentences',
    th: 'วันนี้ฉันจะฝึกพิมพ์วันละสิบห้านาที เพื่อให้พิมพ์งานได้เร็วขึ้นโดยไม่ต้องมองแป้น',
    en: 'Today I will practice typing for fifteen minutes and focus on accuracy before speed.',
  },
]

const fingerLabels: Record<Finger, string> = {
  lp: 'ก้อยซ้าย', lr: 'นางซ้าย', lm: 'กลางซ้าย', li: 'ชี้ซ้าย',
  ri: 'ชี้ขวา', rm: 'กลางขวา', rr: 'นางขวา', rp: 'ก้อยขวา', thumb: 'นิ้วโป้ง',
}

function normalizeInput(event: KeyboardEvent, language: Lang): string | null {
  if (event.key === 'Backspace') return 'BACKSPACE'
  if (event.key === 'Tab' || event.key === 'Enter' || event.metaKey || event.ctrlKey || event.altKey) return null
  if (event.key.length !== 1) return null

  if (language === 'EN') return event.key

  const lower = event.key.toLowerCase()
  if (/^[a-z]$/.test(lower) || Object.prototype.hasOwnProperty.call(TH_MAP, lower)) {
    if (event.shiftKey && TH_SHIFT_MAP[lower]) return TH_SHIFT_MAP[lower]
    return TH_MAP[lower] ?? event.key
  }
  return event.key
}

function equivalentKeyForChar(char: string, language: Lang): string | null {
  if (!char) return null
  if (char === ' ') return ' '
  if (language === 'EN') return char.toLowerCase()
  const direct = Object.entries(TH_MAP).find(([, value]) => value === char)
  if (direct) return direct[0]
  const shifted = Object.entries(TH_SHIFT_MAP).find(([, value]) => value === char)
  return shifted?.[0] ?? null
}

function App() {
  const [language, setLanguage] = useState<Lang>('TH')
  const [lessonId, setLessonId] = useState(1)
  const [mode, setMode] = useState<Mode>('natural')
  const [customText, setCustomText] = useState('')
  const [usingCustom, setUsingCustom] = useState(false)
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState<string[]>([])
  const [states, setStates] = useState<Array<'pending' | 'correct' | 'wrong'>>([])
  const [mistakes, setMistakes] = useState<Record<string, number>>({})
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [focused, setFocused] = useState(false)
  const [saved, setSaved] = useState(false)
  const practiceRef = useRef<HTMLDivElement>(null)

  const lesson = LESSONS.find((item) => item.id === lessonId) ?? LESSONS[0]
  const text = usingCustom && customText.trim() ? customText.trim() : language === 'TH' ? lesson.th : lesson.en

  const reset = (nextText = text) => {
    setIndex(0)
    setTyped(Array(nextText.length).fill(''))
    setStates(Array(nextText.length).fill('pending'))
    setMistakes({})
    setStartedAt(null)
    setElapsed(0)
    setFinished(false)
    setSaved(false)
    requestAnimationFrame(() => practiceRef.current?.focus())
  }

  useEffect(() => reset(), [lessonId, language, usingCustom])

  useEffect(() => {
    if (!startedAt || finished) return
    const timer = window.setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 250)
    return () => window.clearInterval(timer)
  }, [startedAt, finished])

  const correctCount = states.filter((state) => state === 'correct').length
  const wrongCount = states.filter((state) => state === 'wrong').length
  const attempted = correctCount + wrongCount
  const accuracy = attempted === 0 ? 100 : Math.max(0, Math.round((correctCount / attempted) * 100))
  const minutes = Math.max(elapsed / 60, 1 / 60)
  const wpm = Math.round((correctCount / 5) / minutes)
  const progress = Math.round((index / Math.max(text.length, 1)) * 100)
  const currentChar = text[index] ?? ''
  const expectedKey = equivalentKeyForChar(currentChar, language)

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
          setTyped((prev) => { const next = [...prev]; next[index] = ''; return next })
          return
        }
        if (index > 0) {
          const previous = index - 1
          setIndex(previous)
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
      if (nextIndex >= text.length) {
        setIndex(text.length)
        setElapsed(startedAt ? (Date.now() - startedAt) / 1000 : 0)
        setFinished(true)
      } else {
        setIndex(nextIndex)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focused, finished, index, language, mode, startedAt, states, text])

  useEffect(() => {
    if (!finished || saved) return
    const result: TypingResult = {
      userId: 'guest',
      wpm,
      accuracy,
      language,
      level: usingCustom ? 'custom' : `L${lessonId}`,
      timestamp: Date.now(),
      mistakes,
    }
    getStatsAdapter().saveResult(result).then(() => setSaved(true)).catch(() => setSaved(false))
  }, [accuracy, finished, language, lessonId, mistakes, saved, usingCustom, wpm])

  const topMistakes = useMemo(
    () => Object.entries(mistakes).sort((a, b) => b[1] - a[1]).slice(0, 8),
    [mistakes],
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">พ</div>
          <div>
            <div className="brand-title">PimDee - พิมพ์ดี</div>
            <div className="brand-subtitle">ฝึกพิมพ์สัมผัสไทยเกษมณี + English QWERTY</div>
          </div>
        </div>
        <div className="toolbar">
          <span className="layout-pill">{language === 'TH' ? 'เกษมณี มอก.' : 'QWERTY'}</span>
          <div className="segmented">
            {(['TH', 'EN'] as Lang[]).map((item) => (
              <button key={item} className={language === item ? 'active' : ''} onClick={() => setLanguage(item)}>{item}</button>
            ))}
          </div>
        </div>
      </header>

      <div className="page-grid">
        <aside className="sidebar card">
          <div className="section-heading"><span>บทเรียน</span><span className="badge">6 บท</span></div>
          <div className="lesson-list">
            {LESSONS.map((item) => (
              <button key={item.id} className={`lesson-item ${!usingCustom && lessonId === item.id ? 'selected' : ''}`} onClick={() => { setUsingCustom(false); setLessonId(item.id) }}>
                <span className="lesson-number">{item.id}</span>
                <span><strong>{language === 'TH' ? item.titleTh : item.titleEn}</strong><small>{language === 'TH' ? item.subtitleTh : item.subtitleEn}</small></span>
              </button>
            ))}
          </div>
          <div className="tip-box"><strong>หลักสำคัญ</strong><p>พิมพ์ให้แม่น 95%+ ก่อนเร่ง WPM และพยายามกลับนิ้วมาที่แถวเหย้าทุกครั้ง</p></div>
        </aside>

        <main className="main-column">
          <div className="metrics">
            <Metric label="WPM" value={wpm} />
            <Metric label={language === 'TH' ? 'แม่นยำ' : 'Accuracy'} value={`${accuracy}%`} />
            <Metric label={language === 'TH' ? 'เวลา' : 'Time'} value={`${Math.floor(elapsed)}s`} />
          </div>

          <section className={`practice card ${focused ? 'focused' : ''}`} ref={practiceRef} tabIndex={0} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
            <div className="practice-head">
              <div>
                <strong>{usingCustom ? (language === 'TH' ? 'ข้อความกำหนดเอง' : 'Custom text') : `${language === 'TH' ? 'บทที่' : 'Lesson'} ${lesson.id}: ${language === 'TH' ? lesson.titleTh : lesson.titleEn}`}</strong>
                <small>{usingCustom ? (language === 'TH' ? 'ฝึกจากข้อความที่คุณวางเอง' : 'Practice your own text') : language === 'TH' ? lesson.subtitleTh : lesson.subtitleEn}</small>
              </div>
              <div className="practice-actions">
                <div className="segmented compact">
                  <button className={mode === 'natural' ? 'active' : ''} onClick={(event) => { event.stopPropagation(); setMode('natural') }}>{language === 'TH' ? 'ธรรมชาติ' : 'Natural'}</button>
                  <button className={mode === 'forced' ? 'active' : ''} onClick={(event) => { event.stopPropagation(); setMode('forced') }}>{language === 'TH' ? 'บังคับแก้' : 'Forced'}</button>
                </div>
                <button className="icon-button" onClick={(event) => { event.stopPropagation(); reset() }}>↻</button>
              </div>
            </div>
            <div className="progress"><span style={{ width: `${progress}%` }} /></div>
            <div className="typing-area" onClick={() => practiceRef.current?.focus()}>
              {!focused && !finished && <div className="focus-hint">⌨ {language === 'TH' ? 'คลิกบริเวณนี้แล้วเริ่มพิมพ์' : 'Click here, then start typing'}</div>}
              <div className="typing-text">
                {text.split('').map((char, i) => (
                  <span key={`${i}-${char}`} className={`${states[i] ?? 'pending'} ${i === index && !finished ? 'cursor' : ''}`}>{char === ' ' ? '\u00A0' : char}</span>
                ))}
              </div>
              <div className="status-row">
                <span>ถูก {correctCount}</span><span>พลาด {wrongCount}</span><span>{mode === 'forced' ? 'ผิดแล้วต้องแก้ก่อน' : 'ผิดแล้วไปต่อได้'}</span>
              </div>
            </div>

            <Keyboard language={language} expectedKey={expectedKey} mistakes={mistakes} />
          </section>

          <section className="custom card">
            <div className="section-heading"><span>{language === 'TH' ? 'ข้อความกำหนดเอง' : 'Custom text'}</span><span className="badge">MVP</span></div>
            <textarea value={customText} onChange={(event) => setCustomText(event.target.value)} placeholder={language === 'TH' ? 'วางข้อความไทยหรืออังกฤษที่อยากฝึก...' : 'Paste Thai or English text to practice...'} />
            <div className="custom-actions">
              <button className="secondary" onClick={() => { setUsingCustom(false); reset(language === 'TH' ? lesson.th : lesson.en) }}>{language === 'TH' ? 'กลับบทเรียน' : 'Use lesson'}</button>
              <button className="primary" disabled={!customText.trim()} onClick={() => { setUsingCustom(true); reset(customText.trim()) }}>{language === 'TH' ? 'เริ่มฝึกข้อความนี้' : 'Practice this text'}</button>
            </div>
          </section>

          {finished && (
            <section className="result card">
              <div className="result-title">✓ {language === 'TH' ? 'จบบทแล้ว' : 'Lesson complete'}</div>
              <p>{wpm} WPM · {accuracy}% · {Math.floor(elapsed)}s · {wrongCount} {language === 'TH' ? 'ครั้งที่พลาด' : 'mistakes'}</p>
              <div className="heatmap-summary">
                {topMistakes.length === 0 ? <span className="perfect">{language === 'TH' ? 'ไม่มีจุดพลาด' : 'No mistakes'}</span> : topMistakes.map(([char, count]) => <span key={char}>{char} ×{count}</span>)}
              </div>
              <div className="result-actions">
                <button className="secondary" onClick={() => reset()}>{language === 'TH' ? 'ซ้อมอีกครั้ง' : 'Try again'}</button>
                {!usingCustom && <button className="primary" onClick={() => setLessonId((value) => value >= 6 ? 1 : value + 1)}>{language === 'TH' ? 'บทถัดไป →' : 'Next lesson →'}</button>}
              </div>
            </section>
          )}
        </main>

        <aside className="rightbar">
          <section className="card finger-guide">
            <div className="section-heading"><span>{language === 'TH' ? 'คำแนะนำนิ้ว' : 'Finger guide'}</span></div>
            {(['lp','lr','lm','li','ri','rm','rr','rp'] as Finger[]).map((finger) => (
              <div className="finger-row" key={finger}><span className={`finger-dot ${finger}`}></span><span>{fingerLabels[finger]}</span></div>
            ))}
          </section>
          <section className="card roadmap-mini">
            <div className="section-heading"><span>Roadmap</span></div>
            <p><strong>Phase 2:</strong> Race 60s + Tone Mark Trainer</p>
            <p><strong>Phase 3:</strong> Login + Stats Dashboard</p>
            <p className="muted">Storage ใช้ Adapter Pattern: local / Firebase / Supabase</p>
          </section>
        </aside>
      </div>
      <footer>PimDee · Kedmanee only · Static-first · GitHub Pages ready</footer>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="metric card"><small>{label}</small><strong>{value}</strong></div>
}

function Keyboard({ language, expectedKey, mistakes }: { language: Lang; expectedKey: string | null; mistakes: Record<string, number> }) {
  const mistakeForKey = (key: KeyDef) => {
    const chars = [key.th, key.shiftedTh, key.en].filter(Boolean) as string[]
    return chars.reduce((sum, char) => sum + (mistakes[char] ?? 0), 0)
  }
  return (
    <div className="keyboard-panel">
      <div className="keyboard-caption">{language === 'TH' ? 'แป้นไทยเกษมณี · กดคีย์อังกฤษได้ ระบบ map เป็นไทยให้อัตโนมัติ' : 'English QWERTY · finger placement guide'}</div>
      <div className="keyboard">
        {KEYS.map((row, rowIndex) => (
          <div className={`key-row row-${rowIndex}`} key={rowIndex}>
            {row.map((key) => {
              const heat = Math.min(4, mistakeForKey(key))
              return (
                <div key={key.en} className={`key finger-${key.finger} ${expectedKey === key.en ? 'expected' : ''} heat-${heat}`}>
                  <strong>{language === 'TH' ? key.th : key.en.toUpperCase()}</strong>
                  <small>{language === 'TH' ? key.en.toUpperCase() : key.th}</small>
                  {key.shiftedTh && language === 'TH' && <em>{key.shiftedTh}</em>}
                </div>
              )
            })}
          </div>
        ))}
        <div className="key-row"><div className={`key space finger-thumb ${expectedKey === ' ' ? 'expected' : ''}`}>SPACE</div></div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
