import { Component } from 'react'
import type { ReactNode } from 'react'
import { viText } from '../../../constants/viText'

interface PreviewBoundaryProps {
  children: ReactNode
}

// Lỗi lạ khi dựng renderer (dữ liệu dở, tải gói mã hỏng) chỉ hiện thông báo trong khung xem trước, không làm sập trình soạn thảo.
// Nơi dùng đặt `key` theo nội dung câu nên sửa xong là dựng lại, không cần nút thử lại.
export default class PreviewBoundary extends Component<PreviewBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.error('PreviewBoundary: xem trước bị lỗi', error)
  }

  render() {
    return this.state.failed ? (
      <p className="p-4 text-base text-play-ink">
        {viText.editor.preview.failed}
      </p>
    ) : (
      this.props.children
    )
  }
}
