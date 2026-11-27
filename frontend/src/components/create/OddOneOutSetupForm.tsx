import Button from '../Button'

interface Props {
  mode: 'TEXT' | 'IMAGE'
  onModeChange: (mode: 'TEXT' | 'IMAGE') => void
  onCreate: () => void
  onCancel: () => void
}

export default function OddOneOutSetupForm({ mode, onModeChange, onCreate, onCancel }: Props) {
  return <section className="space-y-4 rounded-3xl border-2 border-brand/20 bg-surface p-5" aria-labelledby="odd-setup-title">
    <h2 id="odd-setup-title" className="font-display text-2xl font-extrabold">Thiết lập tìm hình khác loại</h2>
    <fieldset className="flex flex-wrap gap-3">
      <legend className="mb-2 font-semibold">Dạng trò chơi</legend>
      <label className="flex items-center gap-2 rounded-xl border-2 px-4 py-3">
        <input type="radio" name="odd-mode" checked={mode === 'TEXT'} onChange={() => onModeChange('TEXT')} /> Tìm từ khác loại
      </label>
      <label className="flex items-center gap-2 rounded-xl border-2 px-4 py-3">
        <input type="radio" name="odd-mode" checked={mode === 'IMAGE'} onChange={() => onModeChange('IMAGE')} /> Tìm hình khác loại
      </label>
    </fieldset>
    {mode === 'IMAGE' && <p className="text-sm text-ink-soft">Hình được chọn từ thư viện Noto Emoji. Giáo viên cần kiểm tra nội dung và hình trước khi xuất bản.</p>}
    <div className="flex gap-3"><Button type="button" onClick={onCreate}>Tạo trò chơi</Button>
      <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button></div>
  </section>
}
