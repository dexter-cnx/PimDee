import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from '../i18n'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('PimDee render error', error, info) }
  render() {
    if (this.state.failed) return <main className="fatal-error"><h1>{i18n.t('error.title')}</h1><p>{i18n.t('error.body')}</p></main>
    return this.props.children
  }
}
