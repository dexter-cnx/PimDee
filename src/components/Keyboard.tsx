import { useTranslation } from 'react-i18next'
import { KEYS } from '../core/keyboard'
import type { KeyDef, Lang } from '../core/types'
import { Tooltip } from './Tooltip'

export function Keyboard({ language, expectedKey, mistakes }: { language: Lang; expectedKey: string | null; mistakes: Record<string, number> }) {
  const { t } = useTranslation()
  const mistakeForKey = (key: KeyDef) => [key.th, key.shiftedTh, key.en].filter(Boolean).reduce((sum, char) => sum + (mistakes[char as string] ?? 0), 0)
  return (
    <div className="keyboard-panel">
      <div className="keyboard-caption">{t(language === 'TH' ? 'keyboard.thCaption' : 'keyboard.enCaption')}</div>
      <div className="keyboard">
        {KEYS.map((row, rowIndex) => (
          <div className={`key-row row-${rowIndex}`} key={rowIndex}>
            {row.map((key) => {
              const heat = Math.min(4, mistakeForKey(key))
              const selected = expectedKey === key.en
              const shownChar = language === 'TH' ? key.th : key.en.toUpperCase()
              return (
                <Tooltip key={key.en} hidden={selected} label={t('tooltip.key', { key: key.en.toUpperCase(), char: shownChar })}>
                  <div className={`key finger-${key.finger} ${selected ? 'expected' : ''} heat-${heat}`}>
                    <strong>{shownChar}</strong><small>{language === 'TH' ? key.en.toUpperCase() : key.th}</small>
                    {key.shiftedTh && language === 'TH' && <em>{key.shiftedTh}</em>}
                  </div>
                </Tooltip>
              )
            })}
          </div>
        ))}
        <div className="key-row"><div className={`key space finger-thumb ${expectedKey === ' ' ? 'expected' : ''}`}>SPACE</div></div>
      </div>
    </div>
  )
}
