import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from '../i18n'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  hasError: boolean
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    void error
    void errorInfo
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app app-error-state" role="alert" aria-live="assertive">
          <h1>{i18n.t('errorBoundary.title', { ns: 'common' })}</h1>
          <p className="hint">{i18n.t('errorBoundary.hint', { ns: 'common' })}</p>
          <button type="button" onClick={this.handleReload}>
            {i18n.t('errorBoundary.reload', { ns: 'common' })}
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
