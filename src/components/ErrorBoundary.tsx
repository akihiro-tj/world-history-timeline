import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid h-dvh place-items-center">
          <div className="text-center">
            <p className="mb-4">問題が発生しました</p>
            <button
              type="button"
              className="rounded-md bg-accent px-4 py-2 text-white"
              onClick={() => window.location.reload()}
            >
              再読み込み
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
