import { useId, useState } from 'react'
import { viText } from '../../constants/viText'
import type { usePublishSettings } from '../../hooks/usePublishSettings'
import { PLATFORM_MASCOT, THEMES } from '../../player/theme/themes'
import type { PublishSettings } from '../../services/publishSettings'

const text = viText.editor.publish.settings
const UI_OPTIONS = ['AUTO', 'BE', 'HOC_SINH'] as const
// Cuối ngày theo giờ Việt Nam (UTC+7) viết dạng UTC, khớp ví dụ ở API-CONTRACT 2.2.
const END_OF_DAY_UTC = 'T16:59:59Z'
const VN_OFFSET_MS = 7 * 60 * 60 * 1000

/** Ngày (YYYY-MM-DD) theo giờ Việt Nam của một mốc ISO; Backend có trả giờ khác 16:59:59Z thì ô ngày vẫn đúng ngày. */
const vnDate = (iso: string) => new Date(Date.parse(iso) + VN_OFFSET_MS).toISOString().slice(0, 10)

const chip = (on: boolean) =>
  `min-h-11 min-w-11 rounded-xl px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${on ? 'bg-brand text-white' : 'bg-paper text-ink ring-1 ring-line hover:bg-brand-soft'}`

function describeCode({ enabled, expiresAt }: PublishSettings) {
  if (!enabled) return text.code.off
  if (!expiresAt) return text.code.unlimited

  const [year, month, day] = vnDate(expiresAt).split('-')

  return text.code.until.replace('{date}', `${day}/${month}/${year}`)
}

// Hàng cài đặt dưới 3 thẻ: đổi lựa chọn nào là lưu ngay. Backend chưa có endpoint thì giữ hàng hiện nhưng khóa kèm "Sắp có"
// (ẩn đi sẽ làm giáo viên không biết tính năng sắp có).
export default function PublishSettingsRow({ state }: { state: ReturnType<typeof usePublishSettings> }) {
  const { settings, supported, loadFailed, save, saving, saved, saveFailed } = state
  const [open, setOpen] = useState(false)
  const panelId = useId()
  // Đang lưu thì khóa luôn: lưu liên tiếp mà phản hồi về lệch thứ tự sẽ ghi giá trị cũ vào bộ nhớ đệm.
  const locked = !settings || saving
  const today = vnDate(new Date().toISOString())

  return (
    <div className="rounded-2xl bg-paper p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <fieldset>
          <legend className="text-sm font-extrabold text-ink">{text.ui.label}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {UI_OPTIONS.map((value) => (
              <button key={value} type="button" disabled={locked} aria-pressed={settings?.uiOverride === value} onClick={() => save({ uiOverride: value })} className={chip(settings?.uiOverride === value)}>
                {text.ui[value]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-extrabold text-ink">{text.theme.label}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={locked} aria-pressed={settings?.themeId === null} onClick={() => save({ themeId: null })} className={chip(settings?.themeId === null)}>
              {text.theme.auto}
            </button>
            {[...THEMES.values()].map((theme) => (
              <button key={theme.id} type="button" disabled={locked} aria-pressed={settings?.themeId === theme.id} onClick={() => save({ themeId: theme.id })} className={chip(settings?.themeId === theme.id)}>
                <span aria-hidden="true">{theme.mascotBase ?? PLATFORM_MASCOT} </span>
                {theme.name}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <p className="text-sm font-extrabold text-ink">{text.code.label}</p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {settings ? describeCode(settings) : text.code.unlimited}
            {' · '}
            <button type="button" disabled={locked} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)} className="min-h-11 font-bold text-brand-strong underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline">
              {text.code.toggle}
            </button>
          </p>
          <div id={panelId} hidden={!open || !settings} className="mt-2 space-y-2">
            <label className="block text-sm font-bold text-ink-soft">
              {text.code.expires}
              <input
                type="date"
                value={settings?.expiresAt ? vnDate(settings.expiresAt) : ''}
                min={today}
                disabled={locked}
                onChange={(event) => {
                  const day = event.target.value

                  // Ngày đã qua thì mã hết hạn ngay: không lưu (ô min chỉ chặn bộ chọn, gõ tay vẫn nhập được).
                  if (day && day < today) return
                  save({ expiresAt: day ? `${day}${END_OF_DAY_UTC}` : null })
                }}
                className="mt-1 block min-h-11 rounded-xl border-2 border-ink/20 bg-surface px-3 text-base text-ink"
              />
              <span className="mt-1 block text-sm font-normal">{text.code.expiresHint}</span>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-ink">
              <input type="checkbox" disabled={locked} checked={settings ? !settings.enabled : false} onChange={(event) => save({ enabled: !event.target.checked })} className="h-5 w-5 accent-brand" />
              {text.code.disable}
            </label>
          </div>
        </div>
      </div>
      <p role="status" className="mt-3 text-sm text-ink-soft">
        {!supported ? text.locked : loadFailed ? text.loadFailed : saveFailed ? text.saveFailed : saving ? text.saving : saved ? text.saved : ''}
      </p>
    </div>
  )
}
