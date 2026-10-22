import { Howler } from 'howler'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ambience } from '../../../audio/ambience'
import { getAudioService, type AudioService } from '../../../audio/audioService'
import { readBoolPref, SOUND_PREF_KEYS, writeBoolPref } from './soundPrefs'

export interface GardenSound {
  /** Tắt toàn bộ tiếng (nốt nhạc, âm nền, nhạc nền, giọng đọc, lời động viên). */
  muted: boolean
  toggleMuted: () => void
  /** Bật/tắt riêng âm nền (gió, chim, ong vo ve); tắt tiếng chung vẫn tắt cả hai. */
  ambienceOn: boolean
  toggleAmbience: () => void
  /** Gọi từ một cử chỉ của người dùng (bấm «Bắt đầu chơi»): mở khóa âm thanh rồi bật âm nền. */
  begin: () => void
  /** Cho renderer: ong bay thì vo ve, cân trái/phải theo vị trí. */
  follow: (flying: boolean, pan: number) => void
}

interface Options {
  service?: AudioService
  /** Thay được trong test; mặc định bật tắt `Howler` toàn cục (nhạc nền, giọng đọc). */
  setHowlerMuted?: (muted: boolean) => void
}

/**
 * Âm thanh của «Vườn hoa»: nút tắt/bật tiếng, nút tắt âm nền, nhớ lựa chọn trong phiên. AudioContext chỉ dựng sau cử chỉ đầu tiên (`begin`). Tạm dừng âm nền khi tab bị ẩn.
 * Dọn sạch khi đóng: dừng âm nền, gỡ nghe `visibilitychange`, trả lại trạng thái tắt tiếng như lúc vào.
 */
export function useGardenSound({ service = getAudioService(), setHowlerMuted = (value) => Howler.mute(value) }: Options = {}): GardenSound {
  const [muted, setMuted] = useState(() => readBoolPref(SOUND_PREF_KEYS.muted, false))
  const [ambienceOn, setAmbienceOn] = useState(() => readBoolPref(SOUND_PREF_KEYS.ambience, true))
  const ambience = useMemo(() => new Ambience({ getGraph: () => service.getGraph() }), [service])
  const hidden = useRef(typeof document !== 'undefined' && document.hidden)
  const mutedRef = useRef(muted)
  const ambienceOnRef = useRef(ambienceOn)

  // Áp lựa chọn tắt tiếng lên dịch vụ âm thanh và Howler; ngoài ra tạm dừng âm nền khi tắt tiếng hoặc tab bị ẩn.
  useEffect(() => {
    mutedRef.current = muted
    service.setMuted(muted)
    setHowlerMuted(muted)
    ambience.setPaused(muted || hidden.current)
  }, [muted, service, ambience, setHowlerMuted])

  useEffect(() => {
    ambienceOnRef.current = ambienceOn
    if (!ambienceOn) ambience.stop()
    else if (service.isUnlocked) ambience.start()
  }, [ambienceOn, service, ambience])

  useEffect(() => {
    const onVisibility = () => {
      hidden.current = document.hidden
      ambience.setPaused(mutedRef.current || hidden.current)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [ambience])

  useEffect(() => {
    const before = service.isMuted
    return () => {
      ambience.stop()
      service.setMuted(before)
      setHowlerMuted(false)
    }
  }, [service, ambience, setHowlerMuted])

  const toggleMuted = useCallback(() => {
    setMuted((value) => {
      writeBoolPref(SOUND_PREF_KEYS.muted, !value)
      return !value
    })
  }, [])
  const toggleAmbience = useCallback(() => {
    setAmbienceOn((value) => {
      writeBoolPref(SOUND_PREF_KEYS.ambience, !value)
      return !value
    })
  }, [])
  const begin = useCallback(() => {
    void service.unlock().then((ok) => {
      if (ok && ambienceOnRef.current) ambience.start()
    })
  }, [service, ambience])
  const follow = useCallback((flying: boolean, pan: number) => ambience.follow(flying, pan), [ambience])

  return { muted, toggleMuted, ambienceOn, toggleAmbience, begin, follow }
}
