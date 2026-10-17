/**
 * Thăm dò Web Speech API (`speechSynthesis`): chỉ LIỆT KÊ giọng tiếng Việt và tiếng Anh có sẵn trên máy đang chạy
 * để ghi vào báo cáo. KHÔNG phải phụ thuộc của renderer nào: không import từ mã game, không dùng trong luồng chính.
 */

/** Phần của `SpeechSynthesisVoice` mà bộ thăm dò đọc. */
export interface VoiceLike {
  name: string
  lang: string
  localService: boolean
  default: boolean
  voiceURI: string
}

/** Phần của `speechSynthesis` mà bộ thăm dò dùng, để thay bằng bản giả khi test. */
export interface SpeechSynthesisLike {
  getVoices(): readonly VoiceLike[]
  addEventListener(type: 'voiceschanged', listener: () => void): void
  removeEventListener(type: 'voiceschanged', listener: () => void): void
}

export type VoiceLanguage = 'vi' | 'en' | 'other'

/**
 * Nhóm ngôn ngữ của một mã `lang`. Chấp nhận `vi-VN`, `vi_VN` (một số bản Android dùng gạch dưới), hoa/thường,
 * và mã ba chữ `vie`/`eng`. Không đoán bừa: mã lạ là `other`.
 */
export function languageOf(lang: string): VoiceLanguage {
  const base = lang.trim().toLowerCase().split(/[-_]/)[0]
  if (base === 'vi' || base === 'vie') return 'vi'
  if (base === 'en' || base === 'eng') return 'en'
  return 'other'
}

export interface ProbeResult {
  supported: boolean
  /** Danh sách giọng vẫn rỗng sau khi chờ `voiceschanged` hết thời gian. */
  timedOut: boolean
  vi: readonly VoiceLike[]
  en: readonly VoiceLike[]
  /** Số giọng ngôn ngữ khác (không liệt kê). */
  otherCount: number
}

const byLangThenName = (a: VoiceLike, b: VoiceLike) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name)

/** Tách giọng thành tiếng Việt, tiếng Anh và đếm phần còn lại; mỗi nhóm sắp theo mã ngôn ngữ rồi tên. */
export function classifyVoices(voices: readonly VoiceLike[]): Pick<ProbeResult, 'vi' | 'en' | 'otherCount'> {
  const vi: VoiceLike[] = []
  const en: VoiceLike[] = []
  let otherCount = 0
  for (const voice of voices) {
    const language = languageOf(voice.lang)
    if (language === 'vi') vi.push(voice)
    else if (language === 'en') en.push(voice)
    else otherCount += 1
  }
  return { vi: vi.sort(byLangThenName), en: en.sort(byLangThenName), otherCount }
}

export const DEFAULT_PROBE_TIMEOUT_MS = 2000

/**
 * Đọc danh sách giọng. Nhiều trình duyệt trả rỗng ở lần gọi đầu và chỉ có giọng sau sự kiện `voiceschanged`, nên
 * nếu rỗng thì chờ sự kiện đó (hoặc hết `timeoutMs`) rồi đọc lại. `synth` là `undefined` nghĩa là trình duyệt không
 * hỗ trợ.
 */
export function probeVoices(
  synth: SpeechSynthesisLike | undefined,
  { timeoutMs = DEFAULT_PROBE_TIMEOUT_MS, signal }: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<ProbeResult> {
  const unsupported: ProbeResult = { supported: false, timedOut: false, vi: [], en: [], otherCount: 0 }
  if (!synth) return Promise.resolve(unsupported)

  const first = synth.getVoices()
  if (first.length > 0) return Promise.resolve({ supported: true, timedOut: false, ...classifyVoices(first) })

  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (timedOut: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      synth.removeEventListener('voiceschanged', onChanged)
      signal?.removeEventListener('abort', onAbort)
      const voices = synth.getVoices()
      resolve({ supported: true, timedOut: timedOut && voices.length === 0, ...classifyVoices(voices) })
    }
    const onChanged = () => finish(false)
    const onAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      synth.removeEventListener('voiceschanged', onChanged)
      reject(new DOMException('Đã hủy thăm dò giọng.', 'AbortError'))
    }
    const timer = setTimeout(() => finish(true), timeoutMs)
    synth.addEventListener('voiceschanged', onChanged)
    if (signal?.aborted) onAbort()
    else signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export interface ProbeSummary {
  hasVietnamese: boolean
  hasEnglish: boolean
  /** Giọng `localService = false` có thể gửi văn bản tới máy chủ bên thứ ba: cần cân nhắc với dữ liệu trẻ em. */
  remoteCount: number
  localCount: number
}

export function summarizeProbe(result: ProbeResult): ProbeSummary {
  const listed = [...result.vi, ...result.en]
  return {
    hasVietnamese: result.vi.length > 0,
    hasEnglish: result.en.length > 0,
    remoteCount: listed.filter((voice) => !voice.localService).length,
    localCount: listed.filter((voice) => voice.localService).length,
  }
}

/** Ngày theo giờ MÁY dạng YYYY-MM-DD (không dùng `toISOString()` vì đó là UTC, lệch ngày vào đầu ngày ở múi giờ +7). */
export function localDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export interface ProbeEnvironment {
  /** Chuỗi `navigator.userAgent`; ghi để biết kết quả thuộc máy/trình duyệt nào. */
  userAgent: string
  /** Ngày ghi (YYYY-MM-DD), do người gọi cấp để hàm này thuần. */
  date: string
}

/** Một ô bảng Markdown: gộp xuống dòng/khoảng trắng, thoát `\` và `|` để một giọng luôn nằm trên một dòng. */
export function escapeCell(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
}

const voiceRow = (voice: VoiceLike) =>
  `| ${escapeCell(voice.name)} | ${escapeCell(voice.lang)} | ${voice.localService ? 'trên máy' : 'từ xa'} | ${voice.default ? 'có' : ''} |`

function voiceTable(title: string, voices: readonly VoiceLike[]): string[] {
  if (voices.length === 0) return [`**${title}:** không có giọng nào.`, '']
  return [`**${title}** (${voices.length}):`, '', '| Tên | Mã ngôn ngữ | Nguồn | Mặc định |', '|---|---|---|---|', ...voices.map(voiceRow), '']
}

/** Báo cáo dạng Markdown để dán vào `docs/experiments`. Hàm thuần: không đọc môi trường. */
export function formatReport(result: ProbeResult, environment: ProbeEnvironment): string {
  const lines = [`### Thăm dò giọng đọc (Web Speech API), ${environment.date}`, '', `Trình duyệt: ${environment.userAgent.replace(/\s+/g, ' ').trim()}`, '']
  if (!result.supported) {
    lines.push('Trình duyệt này KHÔNG hỗ trợ `speechSynthesis`.')
    return lines.join('\n')
  }
  const summary = summarizeProbe(result)
  lines.push(
    `Tiếng Việt: ${summary.hasVietnamese ? 'có' : 'KHÔNG có'}. Tiếng Anh: ${summary.hasEnglish ? 'có' : 'KHÔNG có'}. ` +
      `Giọng trên máy: ${summary.localCount}, giọng từ xa: ${summary.remoteCount}. Giọng ngôn ngữ khác (không liệt kê): ${result.otherCount}.`,
    '',
  )
  if (result.timedOut) lines.push('Lưu ý: danh sách giọng vẫn rỗng sau khi chờ; trình duyệt có thể chưa nạp giọng.', '')
  if (summary.remoteCount > 0) {
    lines.push('Cảnh báo: giọng "từ xa" có thể gửi văn bản tới máy chủ bên thứ ba; cân nhắc trước khi dùng với nội dung của trẻ em.', '')
  }
  lines.push(...voiceTable('Tiếng Việt', result.vi), ...voiceTable('Tiếng Anh', result.en))
  lines.push(
    'Chỉ phản ánh MÁY và TRÌNH DUYỆT đã chạy thăm dò, tại thời điểm đọc đầu tiên (một số trình duyệt nạp thêm giọng trực tuyến muộn hơn); máy khác có thể có giọng khác. Cờ "trên máy" do trình duyệt tự khai. Chưa kiểm chứng trên điện thoại hay máy tính bảng.',
  )
  return lines.join('\n')
}

/** Câu đọc thử cố định (không dữ liệu người dùng). */
export const SAMPLE_TEXT: Readonly<Record<'vi' | 'en', string>> = {
  vi: 'Xin chào các bạn nhỏ. Hôm nay chúng ta cùng học nhé.',
  en: 'Hello, little friends. Let us learn together today.',
}
