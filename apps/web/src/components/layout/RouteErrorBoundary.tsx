import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Catches a render error so one bad component does not blank the app.
 *
 * There was no error boundary anywhere, which meant any thrown render -
 * an API response missing a field, an undefined read in a chart - took the
 * entire page to white, with no message and no way back except the browser
 * controls. That is the worst thing that can happen while somebody is
 * being shown the platform, and it is also the easiest to prevent.
 *
 * Deliberately route-level rather than one boundary around the whole app:
 * the header and navigation keep working, so a page that fails is a page
 * you can navigate away from.
 *
 * React requires a class component for this; there is no hook equivalent.
 */

interface Props {
  children: ReactNode
  /** Changes when the route does, which clears a previous route's error. */
  resetKey?: string
}

interface State {
  error: Error | null
}

export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(previous: Props) {
    // Navigating away from a broken page must not leave the fallback up.
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The browser console is where this is diagnosed; there is no error
    // reporting service wired up, and inventing one here would be worse
    // than a console entry a developer can actually read.
    console.error('Render error on this page:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16">
        <div className="flex max-w-md flex-col gap-2 text-center">
          <h1 className="text-h2 text-ink">This page did not load</h1>
          <p className="text-small text-ink-2">
            Something went wrong while drawing it. The rest of the app still works, so you can carry
            on from somewhere else.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => this.setState({ error: null })}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.assign('/')}>
            Go to home
          </Button>
        </div>
        {/* The message, for anyone who can act on it. Not a stack trace:
            that belongs in the console, which componentDidCatch writes to. */}
        <p className="max-w-md text-center font-mono text-micro font-normal break-words text-ink-3">
          {this.state.error.message}
        </p>
      </main>
    )
  }
}
