import { useEffect } from 'react'

// Cảnh báo khi giáo viên sắp rời trang lúc còn thay đổi chưa lưu. Ứng dụng dùng BrowserRouter (không phải data router)
// nên không có `useBlocker`; thay vào đó:
//  - đóng tab, tải lại, đi sang địa chỉ khác: trình duyệt tự hỏi (beforeunload);
//  - bấm liên kết trong ứng dụng: chặn ở pha bắt và hỏi bằng hộp xác nhận của trình duyệt;
//  - nút Quay lại của trình duyệt: không chặn được, nhưng bản sao lưu trong trình duyệt (draftStorage) vẫn khôi phục được.
export function useUnsavedChangesGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target instanceof Element ? event.target : null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null

      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const destination = new URL(anchor.href, window.location.href)

      // Liên kết ra ngoài đã có beforeunload; cùng địa chỉ thì không rời trang.
      if (destination.origin !== window.location.origin) return
      if (destination.pathname + destination.search === window.location.pathname + window.location.search) return

      if (!window.confirm(message)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [active, message])
}
