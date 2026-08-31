import React from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import { WorkspaceRoot } from './WorkspaceRoot'
import './i18n'
import './styles.css'
import './curriculum.css'
import './review-fixes.css'
import './phase2.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary><WorkspaceRoot /></ErrorBoundary></React.StrictMode>,
)
