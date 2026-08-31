import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { App } from './App'
import { Phase2App } from './components/Phase2App'

type Workspace = 'lessons' | 'race' | 'tones'

const fromHash = (): Workspace => {
  if (window.location.hash === '#race') return 'race'
  if (window.location.hash === '#tones') return 'tones'
  return 'lessons'
}

export function WorkspaceRoot() {
  const { i18n } = useTranslation()
  const [workspace, setWorkspace] = useState<Workspace>(fromHash)
  const thai = i18n.language.startsWith('th')

  useEffect(() => {
    const sync = () => setWorkspace(fromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const select = (next: Workspace) => {
    setWorkspace(next)
    window.location.hash = next === 'lessons' ? '' : next
  }

  return <>
    {workspace === 'lessons' ? <App /> : <Phase2App challenge={workspace} />}
    <nav className="workspace-switcher" aria-label={thai ? 'โหมดฝึก' : 'Practice modes'}>
      <button className={workspace === 'lessons' ? 'active' : ''} onClick={() => select('lessons')}>{thai ? 'บทเรียน' : 'Lessons'}</button>
      <button className={workspace === 'race' ? 'active' : ''} onClick={() => select('race')}>Race 60s</button>
      <button className={workspace === 'tones' ? 'active' : ''} onClick={() => select('tones')}>{thai ? 'ฝึกวรรณยุกต์' : 'Tone Trainer'}</button>
    </nav>
  </>
}
