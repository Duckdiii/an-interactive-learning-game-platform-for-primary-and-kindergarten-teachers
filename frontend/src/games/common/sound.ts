import { Howl } from 'howler'

// Mỗi file âm thanh chỉ tạo `Howl` một lần rồi phát lại (tạo mới mỗi lần phát sẽ để lại một audio node và
// một buffer đã giải mã, bộ nhớ tăng dần trong phiên chơi dài). Tạo lười để import module không sinh `Howl`.
// Các âm phản hồi ngắn dùng suốt vòng đời ứng dụng nên không gọi `unload()`.
const sounds = new Map<string, Howl>()

/** Phát một âm phản hồi ngắn (đúng, sai, nối được một cặp...), dùng lại `Howl` đã tạo cho cùng `src`. */
export function playSound(src: string) {
  let sound = sounds.get(src)
  if (!sound) {
    sound = new Howl({ src: [src] })
    sounds.set(src, sound)
  }
  sound.play()
}
