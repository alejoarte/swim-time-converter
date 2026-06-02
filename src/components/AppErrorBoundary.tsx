import { Component, type ErrorInfo, type ReactNode } from 'react'

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
    // The fallback UI is enough for this client-only app.
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
          <h1>Something went wrong</h1>
          <p className="hint">The app hit an unexpected error. Reload and try again.</p>
          <button type="button" onClick={this.handleReload}>
            Reload app
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
