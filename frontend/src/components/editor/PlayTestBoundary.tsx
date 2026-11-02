import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { viText } from '../../constants/viText'
import Button from '../Button'
import ErrorNotice from '../ui/ErrorNotice'

interface PlayTestBoundaryProps {
  onExit: () => void
  children: ReactNode
}

interface PlayTestBoundaryState {
  failed: boolean
}

// UC-03 luồng 3b: không tải được phần đồ họa của màn chơi thử (mạng chập chờn khi tải gói mã, renderer lỗi) thì báo đúng câu của
// SRS và đưa giáo viên về màn soạn thảo, không để trang trắng. React chỉ bắt lỗi lúc vẽ bằng class component.
export default class PlayTestBoundary extends Component<PlayTestBoundaryProps, PlayTestBoundaryState> {
  state: PlayTestBoundaryState = { failed: false }

  static getDerivedStateFromError(): PlayTestBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PlayTestBoundary: màn chơi thử bị lỗi', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    const text = viText.editor.play

    return (
      <ErrorNotice
        title={text.resourceErrorTitle}
        message={text.resourceError}
        action={
          <Button type="button" onClick={this.props.onExit}>
            {text.backToEdit}
          </Button>
        }
      />
    )
  }
}
