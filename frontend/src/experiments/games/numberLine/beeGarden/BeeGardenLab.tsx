import { useEffect, useMemo, useState } from 'react'
import '../../../../assets/fonts/nunito/nunito.css'
import { AGE_PROFILES } from '../../../age/ageProfiles'
import { getAudioService } from '../../../audio/audioService'
import { usePrefersReducedMotion } from '../../../feedback/usePrefersReducedMotion'
import ThemeProvider from '../../../theme/ThemeProvider'
import { fontStack, useFontReady } from '../../../theme/useFontReady'
import { TIMES_OF_DAY, type AgeBand, type TimeOfDay } from '../../../theme/themeTypes'
import { isCorrectValue, toStudentQuestion } from '../numberLineLogic'
import type { NumberLineAnswerResult } from '../numberLineTypes'
import BeeGardenRenderer from './BeeGardenRenderer'
import { beeGardenTheme } from './beeGardenTheme'
import { FRAME_ASPECT, FRAME_INSET_PERCENT, interactionModeForBand } from './beeGardenGeometry'
import { BEE_GARDEN_MUSIC_URL, DEFAULT_ROUND_COUNT, demoAudioUrl, makeRounds } from './beeGardenRounds'
import GardenReward from './GardenReward'
import { launchConfetti } from './gardenConfetti'
import { resolveImage } from '../../../assets/imageResolver/resolveImage'
import { useBackgroundMusic } from './useBackgroundMusic'
import GardenButton from './GardenButton'
import { gardenUi, shade } from './gardenUi'
import { useEncouragement } from './useEncouragement'
import { useGardenSound } from './useGardenSound'

/** Hai thẻ chọn độ tuổi: hình minh họa lấy qua `resolveImage` (bộ Fluent), mô tả cách chơi ngắn gọn. */
const BAND_CHOICES: { band: AgeBand; label: string; icon: string; hint: string }[] = [
  { band: 'PRESCHOOL', label: 'Mầm non', icon: 'gà con', hint: 'Chạm vào hoa là ong bay tới' },
  { band: 'GRADE_1_2', label: 'Tiểu học', icon: 'cặp sách', hint: 'Chọn hoa rồi bấm «Xong rồi!»' },
]

/** Kiểm tệp giọng đọc mẫu có thật không: dev server trả `index.html` (200) cho đường dẫn không có, nên phải xem loại nội dung. */
async function audioExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok && (response.headers.get('content-type') ?? '').startsWith('audio')
  } catch {
    return false
  }
}

/**
 * Phòng chơi «Vườn hoa»: năm câu Trục số với chú ong, sưu tầm sao, đọc câu hỏi bằng giọng (nếu đã sinh tệp giọng đọc mẫu).
 * Chế độ `play`: câu hỏi gửi vào renderer không có đáp án, phòng này giả lập Backend chấm.
 */
export default function BeeGardenLab({ roundCount = DEFAULT_ROUND_COUNT, timeOfDay: initialTimeOfDay }: { roundCount?: number; timeOfDay?: TimeOfDay } = {}) {
  // Số câu của một lượt là dữ liệu (mặc định 5), không cố định trong giao diện.
  const rounds = useMemo(() => makeRounds(roundCount), [roundCount])
  const [started, setStarted] = useState(false)
  const [round, setRound] = useState(0)
  // Mỗi câu ghi nhận lần trả lời ĐẦU TIÊN (đúng hay sai) để tính sao; thử lại không đổi sao đã có.
  const [firstTry, setFirstTry] = useState<(boolean | undefined)[]>([])
  const [answered, setAnswered] = useState<NumberLineAnswerResult | null>(null)
  const [attempt, setAttempt] = useState(0)
  // Thời điểm trong ngày: tham số (mặc định «sáng» theo theme); khi phát triển có thêm công cụ chọn để xem cả ba.
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | undefined>(initialTimeOfDay)
  // Đang diễn cảnh rời câu (ong bay ra, bảng bay lên) sau khi bấm «Câu tiếp theo»: khóa hai nút cho tới khi xong (dưới nửa giây) rồi mới sang câu sau.
  const [leaving, setLeaving] = useState(false)
  const [audioReady, setAudioReady] = useState<Record<string, boolean>>({})
  const [musicReady, setMusicReady] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  // Lời động viên bằng giọng đọc của trình duyệt (im lặng nếu máy không có giọng tiếng Việt).
  const encourage = useEncouragement()
  // Âm thanh: nút tắt/bật tiếng, nút tắt âm nền, nhớ trong phiên; AudioContext chỉ dựng sau lần bấm «Bắt đầu chơi».
  const sound = useGardenSound()
  // Giữ nguyên danh tính giữa các lần vẽ để renderer không đặt lại tiếng ong mỗi lần vẽ.
  const ambienceControl = useMemo(() => ({ follow: sound.follow }), [sound.follow])
  const [band, setBand] = useState<AgeBand>('PRESCHOOL')
  const interactionMode = interactionModeForBand(band)
  const theme = beeGardenTheme
  const ui = gardenUi(theme)
  const font = fontStack(theme.font.family, useFontReady(theme.font.family))
  // Vùng chạm tối thiểu theo hồ sơ độ tuổi (T5.1), tính bằng px màn hình.
  const minPx = AGE_PROFILES[band].minTouchTargetPx

  const music = useBackgroundMusic(musicReady ? BEE_GARDEN_MUSIC_URL : undefined)
  const { start: startMusic, stop: stopMusic } = music

  useEffect(() => {
    let alive = true
    void audioExists(BEE_GARDEN_MUSIC_URL).then((exists) => {
      if (alive) setMusicReady(exists)
    })
    void Promise.all(rounds.map(async (question) => [question.id, await audioExists(demoAudioUrl(question))] as const)).then((pairs) => {
      if (alive) setAudioReady(Object.fromEntries(pairs))
    })
    return () => {
      alive = false
    }
  }, [rounds])

  const finished = started && round >= rounds.length
  const question = rounds[Math.min(round, rounds.length - 1)]
  const student = useMemo(() => {
    const base = toStudentQuestion(question)
    return audioReady[question.id] ? { ...base, audioUrl: demoAudioUrl(question) } : base
  }, [question, audioReady])
  // Hoàn thành: dừng nhạc nền, pháo giấy (canvas-confetti, không bắn khi giảm chuyển động) và âm «hoàn thành». Âm đã được mở khóa ở lần bấm «Xem phần thưởng».
  useEffect(() => {
    if (!finished) return
    stopMusic()
    launchConfetti('complete', { reducedMotion })
    getAudioService().play('complete')
  }, [finished, stopMusic, reducedMotion])

  const grade = (value: number): NumberLineAnswerResult => ({
    isCorrect: isCorrectValue(value, question.target, question.tolerance),
    correctValue: question.target,
  })

  const restart = () => {
    setRound(0)
    setFirstTry([])
    setAnswered(null)
    setAttempt(0)
    setStarted(true)
    startMusic() // trong cử chỉ bấm «Bắt đầu chơi»: trình duyệt cho phép phát nhạc
    sound.begin() // và mở khóa Web Audio rồi bật âm nền (gió, chim)
  }

  /** Bấm «Câu tiếp theo»: mở khóa âm thanh ngay trong cử chỉ rồi cho renderer diễn cảnh rời câu; renderer báo xong thì `advance`. */
  const next = () => {
    void getAudioService().unlock() // còn trong cử chỉ bấm: mở khóa để âm «hoàn thành» phát được
    setLeaving(true)
  }
  const advance = () => {
    setLeaving(false)
    setRound((value) => value + 1)
    setAnswered(null)
    setAttempt(0)
  }

  return (
    <div className="mx-auto w-full max-w-[992px] space-y-4 p-4" style={{ fontFamily: font, color: ui.panel.ink }}>
      {/* Hàng âm thanh luôn hiện (màn bắt đầu, lúc chơi, màn kết thúc) để vào chơi không làm khung dịch chỗ; tắt tiếng được ngay từ đầu. */}
      <div className="flex flex-wrap justify-center gap-3">
        <GardenButton tone={ui.secondary} minPx={minPx} aria-pressed={!sound.muted} onClick={sound.toggleMuted}>
          {sound.muted ? '🔇 Tiếng: Tắt' : '🔊 Tiếng: Bật'}
        </GardenButton>
        <GardenButton tone={ui.secondary} minPx={minPx} aria-pressed={sound.ambienceOn} disabled={sound.muted} onClick={sound.toggleAmbience}>
          {sound.ambienceOn ? '🍃 Âm nền: Bật' : '🍃 Âm nền: Tắt'}
        </GardenButton>
        {/* Công cụ cho người làm: chọn thời điểm trong ngày để xem cả ba biến thể. Không bao giờ hiện cho người chơi (chỉ chế độ dev). */}
        {import.meta.env.DEV && theme.ambience && (
          <label className="flex items-center gap-2 text-sm font-bold">
            Thời điểm
            <select
              className="rounded-xl border-2 px-2 py-1"
              style={{ minHeight: 40 }}
              value={timeOfDay ?? theme.ambience.default}
              onChange={(event) => setTimeOfDay(event.target.value as TimeOfDay)}
            >
              {TIMES_OF_DAY.map((time) => (
                <option key={time} value={time}>
                  {theme.ambience!.variants[time].label}
                </option>
              ))}
            </select>
          </label>
        )}
        {started && !finished && music.available && (
          <GardenButton tone={ui.secondary} minPx={minPx} aria-pressed={!music.muted} onClick={music.toggle}>
            {music.muted ? '🔇 Nhạc: Tắt' : '🎵 Nhạc: Bật'}
          </GardenButton>
        )}
      </div>

      {!started && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-3xl p-6 text-center"
          style={{ background: theme.colors.surfaceSelected, marginInline: `${FRAME_INSET_PERCENT}%`, aspectRatio: FRAME_ASPECT }}
        >
          <p className="text-3xl font-extrabold">Vườn hoa của chú ong</p>
          <p className="text-xl font-bold">Giúp chú ong bay tới đúng bông hoa có số nhé!</p>
          <fieldset className="grid grid-cols-2 gap-3 sm:gap-5">
            <legend className="sr-only">Chọn độ tuổi</legend>
            {BAND_CHOICES.map((choice) => {
              const selected = band === choice.band
              const titleId = `bee-garden-band-${choice.band}`
              const edge = selected ? ui.primary.border : ui.panel.border
              return (
                <label
                  key={choice.band}
                  className="relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-3xl px-3 py-4 text-center transition-transform has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-offset-2 motion-reduce:transition-none"
                  style={{
                    minHeight: Math.max(minPx, 176), // cùng chiều cao cho cả hai thẻ
                    background: ui.panel.fill,
                    border: `${ui.strokes.ui}px solid ${edge}`,
                    boxShadow: `0 ${ui.strokes.uiShadow}px 0 ${shade(edge, 0.25)}`,
                    outlineColor: ui.primary.border,
                  }}
                >
                  <input type="radio" name="bee-garden-band" className="sr-only" aria-labelledby={titleId} checked={selected} onChange={() => setBand(choice.band)} />
                  <img src={resolveImage(choice.icon).src} alt="" width={88} height={88} />
                  <span id={titleId} className="text-2xl font-extrabold">
                    {choice.label}
                  </span>
                  <span className="text-sm font-bold">{choice.hint}</span>
                  {selected && (
                    <span
                      aria-hidden="true"
                      className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-lg font-extrabold"
                      style={{ background: ui.primary.face, color: ui.primary.ink, border: `${ui.strokes.ui}px solid ${ui.primary.border}` }}
                    >
                      ✓
                    </span>
                  )}
                </label>
              )
            })}
          </fieldset>
          {/* Cử chỉ bấm này cũng mở khóa âm thanh của trình duyệt để câu hỏi tự được đọc. */}
          <GardenButton tone={ui.primary} minPx={minPx} onClick={restart}>
            Bắt đầu chơi
          </GardenButton>
          {/* Ghi chú cho người làm: chỉ hiện ở chế độ dev, không bao giờ hiện cho người chơi. */}
          {import.meta.env.DEV && (
            <p className="text-sm font-bold">
              {Object.values(audioReady).some(Boolean) ? 'Có giọng đọc mẫu.' : 'Chưa có tệp giọng đọc mẫu (không bắt buộc), xem README thử nghiệm.'}
            </p>
          )}
        </div>
      )}

      {started && !finished && (
        <ThemeProvider theme={theme}>
          <div>
          <BeeGardenRenderer
            key={`${question.id}-${attempt}`}
            mode="play"
            question={student}
            autoPlayAudio
            interactionMode={interactionMode}
            ageBand={band}
            hintDelaySeconds={AGE_PROFILES[band].hintDelaySeconds}
            promptNumber={question.target}
            progress={{ total: rounds.length, earned: firstTry, current: round }}
            ambience={ambienceControl}
            transitions
            timeOfDay={timeOfDay}
            exiting={leaving}
            onExited={advance}
            onAnswered={(value) => {
              const result = grade(value)
              setFirstTry((previous) => {
                if (previous[round] !== undefined) return previous
                const copy = [...previous]
                copy[round] = result.isCorrect
                return copy
              })
              setAnswered(result)
              if (!sound.muted) encourage.say(result.isCorrect ? 'correct' : 'tryAgain')
              return result
            }}
          />
          </div>
          {answered && (
            <div className="flex flex-wrap justify-center gap-3">
              {!answered.isCorrect && (
                <GardenButton tone={ui.secondary} minPx={minPx} disabled={leaving} onClick={() => { setAnswered(null); setAttempt((value) => value + 1) }}>
                  Thử lại
                </GardenButton>
              )}
              <GardenButton tone={ui.primary} minPx={minPx} disabled={leaving} onClick={next}>
                {round + 1 >= rounds.length ? 'Xem phần thưởng' : 'Câu tiếp theo'}
              </GardenButton>
            </div>
          )}
        </ThemeProvider>
      )}

      {finished && <GardenReward earned={firstTry} total={rounds.length} onRestart={restart} tone={ui.primary} minPx={minPx} reducedMotion={reducedMotion} />}
    </div>
  )
}
