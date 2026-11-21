import Button from '../Button'
import FormField from '../ui/FormField'
import Icon from '../ui/Icon'
import { inputClass } from '../ui/formStyles'
import { validateVisualClozeImageInput } from '../../utils/generateRequest'

export interface VisualClozeImageOptionInput {
  imageUrl: string
  visualPrompt: string
}

interface Props {
  mode: 'TEXT' | 'IMAGE'
  sceneImageUrl: string
  optionImages: ReadonlyArray<VisualClozeImageOptionInput>
  onModeChange: (mode: 'TEXT' | 'IMAGE') => void
  onSceneImageUrlChange: (url: string) => void
  onOptionImagesChange: (options: VisualClozeImageOptionInput[]) => void
  onCreate: () => void
  onCancel: () => void
}

export default function VisualClozeSetupForm({
  mode,
  sceneImageUrl,
  optionImages,
  onModeChange,
  onSceneImageUrlChange,
  onOptionImagesChange,
  onCreate,
  onCancel,
}: Props) {
  const problem = mode === 'IMAGE' ? validateVisualClozeImageInput(sceneImageUrl, optionImages) : null
  const optionError = problem === 'optionCount'
    ? 'Thêm từ 2 đến 8 hình lựa chọn.'
    : problem === 'optionFields'
      ? 'Mỗi hình cần URL HTTPS và mô tả; mô tả tối đa 100 ký tự.'
      : problem === 'duplicateOptionUrl'
        ? 'Các hình lựa chọn phải có URL khác nhau.'
        : undefined
  const sceneError = problem === 'sceneUrl' ? 'Nhập URL HTTPS của ảnh cảnh (tối đa 2048 ký tự).' : undefined

  const updateOption = (index: number, patch: Partial<VisualClozeImageOptionInput>) => {
    onOptionImagesChange(optionImages.map((option, current) => current === index ? { ...option, ...patch } : option))
  }

  const addOption = () => {
    if (optionImages.length >= 8) return
    onOptionImagesChange([...optionImages, { imageUrl: '', visualPrompt: '' }])
  }

  const removeOption = (index: number) => {
    if (optionImages.length <= 2) return
    onOptionImagesChange(optionImages.filter((_, current) => current !== index))
  }

  return (
    <section aria-labelledby="visual-cloze-setup-title" className="space-y-5 rounded-3xl border-2 border-brand/20 bg-surface p-5 shadow-sm sm:p-7">
      <div>
        <h2 id="visual-cloze-setup-title" className="font-display text-2xl font-extrabold">Thiết lập Visual Cloze</h2>
        <p className="mt-1 text-sm text-ink-soft">Chọn dạng bài. Với dạng hình ảnh, cung cấp ảnh cảnh và ảnh lựa chọn có sẵn.</p>
      </div>

      <fieldset className="flex flex-wrap gap-3">
        <legend className="mb-2 text-sm font-semibold text-ink">Dạng trò chơi</legend>
        {(['TEXT', 'IMAGE'] as const).map((value) => (
          <label key={value} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 px-4 font-semibold ${mode === value ? 'border-brand bg-brand-soft' : 'border-ink/15'}`}>
            <input type="radio" name="visual-cloze-mode" value={value} checked={mode === value} onChange={() => onModeChange(value)} />
            {value === 'TEXT' ? 'Điền từ vào câu' : 'Điền hình vào ảnh'}
          </label>
        ))}
      </fieldset>

      {mode === 'IMAGE' ? (
        <div className="space-y-5">
          <FormField id="visual-cloze-scene-url" label="URL ảnh cảnh" hint="Dán đường dẫn HTTPS tới ảnh nền; ảnh phải truy cập được từ trình duyệt và backend." error={sceneError}>
            <input
              id="visual-cloze-scene-url"
              type="url"
              inputMode="url"
              maxLength={2048}
              value={sceneImageUrl}
              onChange={(event) => onSceneImageUrlChange(event.target.value)}
              aria-invalid={sceneError ? true : undefined}
              className={inputClass(Boolean(sceneError))}
              placeholder="https://example.com/scene.jpg"
            />
          </FormField>

          <fieldset className="space-y-3" aria-describedby={optionError ? 'visual-cloze-option-error' : 'visual-cloze-option-hint'}>
            <legend className="text-base font-bold">Ảnh lựa chọn do giáo viên cung cấp</legend>
            <p id="visual-cloze-option-hint" className="text-sm text-ink-soft">Thêm 2–8 ảnh. Mỗi ảnh cần URL HTTPS và mô tả để AI đối chiếu. Hệ thống không tạo ảnh.</p>
            <ol className="space-y-3">
              {optionImages.map((option, index) => (
                <li key={index} className="grid gap-3 rounded-xl border-2 border-ink/10 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <FormField id={`visual-cloze-option-url-${index}`} label={`URL ảnh ${index + 1}`}>
                    <input
                      id={`visual-cloze-option-url-${index}`}
                      type="url"
                      inputMode="url"
                      maxLength={2048}
                      value={option.imageUrl}
                      onChange={(event) => updateOption(index, { imageUrl: event.target.value })}
                      className={inputClass(Boolean(optionError))}
                      placeholder="https://example.com/option.jpg"
                    />
                  </FormField>
                  <FormField id={`visual-cloze-option-prompt-${index}`} label={`Mô tả ảnh ${index + 1}`}>
                    <input
                      id={`visual-cloze-option-prompt-${index}`}
                      maxLength={100}
                      value={option.visualPrompt}
                      onChange={(event) => updateOption(index, { visualPrompt: event.target.value })}
                      className={inputClass(Boolean(optionError))}
                      placeholder="Ví dụ: con mèo"
                    />
                  </FormField>
                  <Button type="button" variant="secondary" disabled={optionImages.length <= 2} aria-label={`Xóa ảnh ${index + 1}`} onClick={() => removeOption(index)}>
                    <Icon name="close" className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ol>
            {optionError ? <p id="visual-cloze-option-error" role="alert" className="text-sm font-semibold text-rose-800">{optionError}</p> : null}
            <Button type="button" variant="secondary" disabled={optionImages.length >= 8} onClick={addOption}>Thêm ảnh lựa chọn</Button>
          </fieldset>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" size="lg" disabled={Boolean(problem)} onClick={onCreate}>Tạo Visual Cloze</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Quay lại danh sách kiểu game</Button>
      </div>
    </section>
  )
}
