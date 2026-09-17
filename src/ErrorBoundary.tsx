import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

// 예상치 못한 오류로 화면이 하얗게 멈추는 대신, 안내와 함께 초기화할 방법을 보여준다.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('앱 실행 중 오류가 발생했어요.', error, info)
  }

  handleReset = () => {
    try {
      localStorage.removeItem('home-storage-app')
    } catch {
      // localStorage를 못 건드려도 새로고침은 시도한다
    }
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <h2>앱을 불러오는 데 문제가 생겼어요</h2>
            <p>저장된 데이터에 문제가 있을 수 있어요. 초기화하면 다시 정상적으로 켜질 거예요.</p>
            <p className="hint small">
              (초기화하면 이 기기에만 저장돼 있던 데이터가 지워져요. 가족 공유를 켜두셨다면 공유된
              데이터는 그대로 남아있어요.)
            </p>
            <button className="btn btn-primary" onClick={this.handleReset}>
              초기화하고 다시 시작
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
