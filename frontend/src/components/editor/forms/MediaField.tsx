import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { viText } from '../../../constants/viText'
import { isMock } from '../../../config/mockMode'
import { uploadMedia } from '../../../services/mediaService'
import { uploadErrorMessage } from '../../../utils/mediaErrors'
import { checkMediaFile, formatFileSize } from '../../../utils/mediaFile'
import type { MediaKind } from '../../../utils/mediaFile'
import Button from '../../Button'
import Icon from '../../ui/Icon'
import MockBadge from '../../ui/MockBadge'
import { setMediaUrl } from './commonEditing'
import type { MediaUrlField } from './commonEditing'
import type { QuestionFormProps } from './formTypes'
import OperationStatus from './OperationStatus'
import { useCancellableOperation } from '../../../hooks/useCancellableOperation'

const text = viText.editor.media

type Activity = 'upload' | 'tool'

/** Những gì công cụ đi kèm (gợi ý ảnh, tạo giọng đọc) được dùng chung với ô tải tệp. */
export interface MediaToolsApi {
  op: ReturnType<typeof useCancellableOperation>
  // Đang có thao tác của CÔNG CỤ chạy (không phải tải tệp).
  toolActive: boolean
  // Lỗi của thao tác công cụ vừa chạy (null nếu không có).
  toolError: string | null
  // Chạy một thao tác của công cụ: dùng chung bộ khóa với tải tệp nên hai việc không chạy chồng nhau.
  runTool: ReturnType<typeof useCancellableOperation>['run']
  // Gắn (hoặc gỡ, với undefined) đường dẫn vào câu hiện hành.
  apply: (url: string | undefined) => void
  // Có việc khác đang chạy: công cụ nên khóa nút.
  disabled: boolean
}

interface MediaFieldProps {
  kind: MediaKind
  idPrefix: string
  url: string | undefined
  onUpdate: QuestionFormProps['onUpdate']
  tools?: (api: MediaToolsApi) => ReactNode
}

interface Selected {
  file: File
  // Đường dẫn xem trước (chỉ với ảnh); phải được giải phóng khi bỏ chọn, tải xong hoặc đóng form.
  previewUrl: string | null
}

const FIELD: Record<MediaKind, MediaUrlField> = { image: 'imageUrl', audio: 'audioUrl' }
const ACCEPT: Record<MediaKind, string> = {
  image: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp',
  audio: 'audio/mpeg,.mp3',
}

function revokeIfBlob(url: string) {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

// Ô ảnh hoặc âm thanh của một câu (UC-05 luồng 1a): nút "Tải tệp lên" -> hộp chọn tệp -> kiểm tra loại tệp bằng byte đầu -> "Xác nhận tải lên"
// -> tải (có tiến trình, hủy được) và rà an toàn -> gắn đường dẫn vào CÂU HIỆN HÀNH bằng bản vá. Lỗi ở bất kỳ bước nào thì ảnh/âm thanh
// đang có vẫn được giữ nguyên (luồng 3a, 3b).
export default function MediaField({ kind, idPrefix, url, onUpdate, tools }: MediaFieldProps) {
  const field = FIELD[kind]
  const isImage = kind === 'image'
  const op = useCancellableOperation()
  const [selected, setSelected] = useState<Selected | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [canceled, setCanceled] = useState(false)
  const [activity, setActivity] = useState<Activity>('upload')
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)
  const checkRef = useRef(0)
  // Nút cần nhận tiêu điểm sau khi giao diện đổi trạng thái (nút vừa bấm bị thay mất): người dùng bàn phím và trình đọc màn hình không được rơi về đầu trang.
  const focusRef = useRef<string | null>(null)
  const [focusTick, setFocusTick] = useState(0)
  const id = `${idPrefix}-${kind}`

  const dropPreview = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
  }, [])

  // Đóng form (đổi câu, rời trang): giải phóng đường dẫn xem trước và bỏ kết quả kiểm tra đang chạy dở.
  useEffect(
    () => () => {
      checkRef.current += 1
      dropPreview()
    },
    [dropPreview],
  )

  useEffect(() => {
    const target = focusRef.current

    focusRef.current = null
    if (target) document.getElementById(`${id}-${target}`)?.focus()
  }, [focusTick, id])

  const focusLater = (target: 'upload' | 'confirm') => {
    focusRef.current = target
    setFocusTick((tick) => tick + 1)
  }

  const apply = useCallback((next: string | undefined) => onUpdate((current) => setMediaUrl(current, field, next)), [onUpdate, field])

  const { run } = op
  const runTool: MediaToolsApi['runTool'] = useCallback(
    (task, options) => {
      setActivity('tool')

      return run(task, options)
    },
    [run],
  )

  const handleChoose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    // Xóa giá trị để chọn lại CÙNG tệp vẫn kích hoạt sự kiện.
    event.target.value = ''
    if (!file) return

    checkRef.current += 1

    const ticket = checkRef.current

    op.clearError()
    setCanceled(false)

    const result = await checkMediaFile(file, kind).catch(() => null)

    // Có lần chọn mới hơn (hoặc form đã đóng) thì bỏ kết quả này.
    if (ticket !== checkRef.current) return

    dropPreview()

    if (!result || !result.ok) {
      // UC-05 luồng 3a: tệp sai định dạng hoặc quá lớn. Giữ nguyên ảnh/âm thanh đang có, không chọn tệp nào.
      setSelected(null)
      setFileError(text.invalidFile)

      return
    }

    setFileError(null)
    focusLater('confirm')

    const previewUrl = isImage ? URL.createObjectURL(file) : null

    previewRef.current = previewUrl
    setSelected({ file, previewUrl })
  }

  const handleConfirm = async () => {
    if (!selected) return

    setActivity('upload')
    setCanceled(false)

    const uploaded = await op.run(({ signal, onProgress }) => uploadMedia(selected.file, kind, { signal, onProgress }), {
      describeError: uploadErrorMessage,
      // Tải xong mà không còn dùng nữa (đã hủy, hoặc đóng form): trả lại đường dẫn tệp vừa tạo.
      discard: (result) => revokeIfBlob(result.mediaUrl),
    })

    if (!uploaded) {
      // Lỗi hoặc đã hủy: nút Xác nhận hiện lại, đưa tiêu điểm về đó để thử lại.
      focusLater('confirm')

      return
    }

    apply(uploaded.mediaUrl)
    dropPreview()
    setSelected(null)
    focusLater('upload')
  }

  const handleCancel = () => {
    op.cancel()
    setCanceled(true)
    focusLater('confirm')
  }

  const handleDiscardSelection = () => {
    dropPreview()
    setSelected(null)
    setFileError(null)
    setCanceled(false)
    op.clearError()
    focusLater('upload')
    inputRef.current?.click()
  }

  const uploading = op.state.status === 'working' && activity === 'upload'
  const toolActive = op.state.status === 'working' && activity === 'tool'
  const error = op.state.status === 'error' && activity === 'upload' ? op.state.message : fileError
  const legend = isImage ? text.imageLegend : text.audioLegend
  const kept = isImage ? text.keptImage : text.keptAudio
  const progress = op.state.status === 'working' ? op.state.progress : null
  const showBroken = isImage && url !== undefined && brokenUrl === url

  return (
    <fieldset className="space-y-3 rounded-xl border-2 border-ink/10 p-3" aria-describedby={`${id}-hint`}>
      <legend className="px-1 text-base font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        <p id={`${id}-hint`}>
          {isImage ? text.imageHint : text.audioHint} {text.safetyNote}
        </p>
        {isMock('media') ? <MockBadge /> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {url ? (
          isImage ? (
            showBroken ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                <Icon name="alert" className="h-4 w-4 shrink-0" />
                {text.imageBroken}
              </p>
            ) : (
              <img
                src={url}
                alt={text.currentImageAlt}
                onError={() => setBrokenUrl(url)}
                className="h-24 w-24 rounded-xl border-2 border-ink/10 bg-paper object-contain"
              />
            )
          ) : (
            // Âm thanh của giáo viên: để trình duyệt hiện bộ điều khiển có sẵn (phát, tạm dừng, thanh tua), đã có bàn phím và nhãn.
            <audio controls preload="none" src={url} aria-label={text.currentAudioLabel} className="h-12 max-w-full" />
          )
        ) : (
          <p className="text-sm text-ink-soft">{isImage ? text.noImage : text.noAudio}</p>
        )}
      </div>

      {selected ? (
        <div className="space-y-3 rounded-xl border-2 border-brand/30 bg-brand-soft/30 p-3">
          <p id={`${id}-selected`} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
            <Icon name="file" className="h-4 w-4 shrink-0" />
            <span>{text.selectedFile}:</span>
            <span className="[overflow-wrap:anywhere]">{selected.file.name}</span>
            <span className="font-normal text-ink-soft">({formatFileSize(selected.file.size)})</span>
          </p>
          {selected.previewUrl ? (
            <img src={selected.previewUrl} alt={text.selectedPreviewAlt} className="h-24 w-24 rounded-xl border-2 border-ink/10 bg-paper object-contain" />
          ) : null}
          {uploading ? (
            <OperationStatus
              label={progress === 100 ? text.scanning : text.uploading}
              progress={progress}
              cancelLabel={text.cancelUpload}
              onCancel={handleCancel}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button id={`${id}-confirm`} type="button" aria-describedby={`${id}-selected`} onClick={() => void handleConfirm()} disabled={toolActive}>
                {text.confirm}
              </Button>
              <Button type="button" variant="secondary" onClick={handleDiscardSelection}>
                {text.discardSelection}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button id={`${id}-upload`} type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={op.busy}>
            <Icon name="upload" className="mr-2 h-5 w-5" />
            {url ? (isImage ? text.replaceImage : text.replaceAudio) : isImage ? text.uploadImage : text.uploadAudio}
          </Button>
          {url ? (
            <Button type="button" variant="secondary" onClick={() => {
                apply(undefined)
                focusLater('upload')
              }}
              disabled={op.busy}
            >
              {isImage ? text.removeImage : text.removeAudio}
            </Button>
          ) : null}
        </div>
      )}

      <input
        ref={inputRef}
        id={`${id}-file`}
        type="file"
        accept={ACCEPT[kind]}
        aria-label={isImage ? text.uploadImage : text.uploadAudio}
        tabIndex={-1}
        // Nút hiển thị đã mở hộp chọn tệp; ô thật chỉ là phương tiện, ẩn khỏi cây truy cập để không xuất hiện hai điều khiển cùng tên.
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => void handleChoose(event)}
      />

      {error ? (
        <p role="alert" className="flex items-start gap-2 text-sm font-semibold text-rose-800">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {error}
            {url ? ` ${kept}` : ''}
          </span>
        </p>
      ) : null}
      {/* Vùng thông báo luôn có mặt (chỉ đổi chữ) thì trình đọc màn hình mới đọc nội dung mới. */}
      <div role="status" className="empty:hidden">
        {canceled && !uploading ? (
          <p className="text-sm text-ink-soft">
            {text.canceled}
            {url ? ` ${kept}` : ''}
          </p>
        ) : null}
      </div>

      {tools
        ? tools({
            op,
            toolActive,
            toolError: op.state.status === 'error' && activity === 'tool' ? op.state.message : null,
            runTool,
            apply,
            disabled: op.busy,
          })
        : null}
    </fieldset>
  )
}
