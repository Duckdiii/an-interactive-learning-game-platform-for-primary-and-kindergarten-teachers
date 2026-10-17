import { useEffect, useMemo, useState } from 'react'
import { browserSpeaker, browserSynth, type Speaker } from './browserSpeech'
import {
  formatReport,
  localDateString,
  probeVoices,
  SAMPLE_TEXT,
  summarizeProbe,
  type ProbeEnvironment,
  type ProbeResult,
  type SpeechSynthesisLike,
  type VoiceLike,
} from './ttsProbe'

interface TtsProbeLabProps {
  /** Cho test truyền bản giả; mặc định dùng `speechSynthesis` của trình duyệt. */
  /** `null` = không có `speechSynthesis` (mô phỏng trình duyệt không hỗ trợ); bỏ trống = dùng của trình duyệt. */
  synth?: SpeechSynthesisLike | null
  /** `null` = không có bộ đọc; bỏ trống = bộ đọc thật của trình duyệt. */
  speaker?: Speaker | null
  environment?: ProbeEnvironment
  /** `null` = không có clipboard; bỏ trống = `navigator.clipboard`. */
  clipboard?: Pick<Clipboard, 'writeText'> | null
}

// Ngày theo giờ MÁY (định dạng sv-SE là YYYY-MM-DD); `toISOString()` trả giờ UTC nên lệch ngày vào đầu ngày ở múi giờ +7.
const defaultEnvironment = (): ProbeEnvironment => ({
  userAgent: typeof navigator === 'undefined' ? 'không rõ' : navigator.userAgent,
  date: localDateString(new Date()),
})

function VoiceTable({ title, voices, lang, speaker }: { title: string; voices: readonly VoiceLike[]; lang: 'vi' | 'en'; speaker: Speaker | null }) {
  if (voices.length === 0) return <p>{title}: không có giọng nào.</p>
  return (
    <table className="text-sm">
      <caption className="text-left font-semibold">
        {title} ({voices.length})
      </caption>
      <thead>
        <tr>
          <th scope="col" className="pr-4 text-left">Tên</th>
          <th scope="col" className="pr-4 text-left">Mã</th>
          <th scope="col" className="pr-4 text-left">Nguồn</th>
          <th scope="col" className="text-left">Đọc thử</th>
        </tr>
      </thead>
      <tbody>
        {voices.map((voice) => (
          <tr key={voice.voiceURI || `${voice.name}-${voice.lang}`}>
            <td className="pr-4">
              {voice.name}
              {voice.default ? ' (mặc định)' : ''}
            </td>
            <td className="pr-4">{voice.lang}</td>
            <td className="pr-4">{voice.localService ? 'trên máy' : 'từ xa'}</td>
            <td>
              <button
                type="button"
                disabled={!speaker}
                aria-label={`Đọc thử bằng giọng ${voice.name}`}
                onClick={() => speaker?.speak(voice, SAMPLE_TEXT[lang])}
                className="min-h-11 rounded border bg-white px-3 disabled:opacity-50"
              >
                Đọc thử
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Phòng thăm dò giọng đọc: liệt kê giọng tiếng Việt/Anh của máy đang chạy, cho nghe thử và xuất báo cáo Markdown.
 * Chỉ để thu số liệu cho báo cáo T6; không phải phụ thuộc của game nào.
 */
export default function TtsProbeLab({
  synth = browserSynth() ?? null,
  speaker = browserSpeaker() ?? null,
  environment,
  clipboard = typeof navigator === 'undefined' ? null : (navigator.clipboard ?? null),
}: TtsProbeLabProps) {
  const [result, setResult] = useState<ProbeResult | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'failed'>('idle')

  useEffect(() => {
    const controller = new AbortController()
    probeVoices(synth ?? undefined, { signal: controller.signal }).then(setResult, () => {
      // Hủy khi rời trang là bình thường.
    })
    return () => controller.abort()
  }, [synth])

  const report = useMemo(
    () => (result ? formatReport(result, environment ?? defaultEnvironment()) : ''),
    [result, environment],
  )

  if (!result) return <p role="status" className="p-4">Đang dò giọng đọc…</p>
  if (!result.supported) return <p role="status" className="p-4">Trình duyệt này không hỗ trợ giọng đọc (speechSynthesis).</p>

  const summary = summarizeProbe(result)
  const copy = async () => {
    try {
      if (!clipboard) throw new Error('không có clipboard')
      await clipboard.writeText(report)
      setCopyState('ok')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <div className="space-y-3 p-4">
      <p role="status">
        Tiếng Việt: {summary.hasVietnamese ? 'có' : 'không có'}. Tiếng Anh: {summary.hasEnglish ? 'có' : 'không có'}. Giọng trên máy:{' '}
        {summary.localCount}, giọng từ xa: {summary.remoteCount}.
      </p>
      {result.timedOut && <p>Danh sách giọng vẫn rỗng sau khi chờ; trình duyệt có thể chưa nạp giọng.</p>}
      {summary.remoteCount > 0 && (
        <p>Cảnh báo: giọng "từ xa" có thể gửi văn bản tới máy chủ bên thứ ba; cân nhắc với nội dung của trẻ em.</p>
      )}
      <VoiceTable title="Tiếng Việt" voices={result.vi} lang="vi" speaker={speaker} />
      <VoiceTable title="Tiếng Anh" voices={result.en} lang="en" speaker={speaker} />
      <button type="button" disabled={!speaker} onClick={() => speaker?.cancel()} className="min-h-11 rounded border bg-white px-3 disabled:opacity-50">
        Dừng đọc
      </button>
      <label className="block">
        <span className="font-semibold">Báo cáo (Markdown)</span>
        <textarea readOnly value={report} rows={10} className="block w-full border p-2 font-mono text-xs" />
      </label>
      <button type="button" onClick={() => void copy()} className="min-h-11 rounded border bg-white px-3">
        Sao chép báo cáo
      </button>
      {copyState === 'ok' && <p role="status">Đã sao chép.</p>}
      {copyState === 'failed' && <p role="alert">Không sao chép được: hãy chọn văn bản trong ô và bấm Ctrl+C.</p>}
    </div>
  )
}
