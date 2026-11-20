import { Howl } from 'howler'

export class AudioService {
  private cache = new Map<string, Howl>()
  private currentlyPlaying: Howl | null = null

  /**
   * Lấy (hoặc tạo mới nếu chưa có) Howl instance cho 1 URL, có cache để tránh tạo lại.
   */
  private getOrCreate(url: string): Howl {
    if (this.cache.has(url)) {
      return this.cache.get(url)!
    }

    const sound = new Howl({
      src: [url],
      html5: true,
      preload: true,
    })
    this.cache.set(url, sound)
    return sound
  }

  /**
   * Phát audio, tự động dừng audio đang phát trước đó để tránh chồng tiếng.
   */
  play(url: string, onEnd?: () => void): void {
    if (!url || typeof url !== 'string' || !url.trim()) return

    this.stopCurrent()

    const sound = this.getOrCreate(url)
    if (onEnd) {
      sound.once('end', onEnd)
    }
    sound.play()
    this.currentlyPlaying = sound
  }

  /**
   * Dừng audio đang phát hiện tại nếu có.
   */
  stopCurrent(): void {
    if (this.currentlyPlaying) {
      this.currentlyPlaying.stop()
      this.currentlyPlaying = null
    }
  }

  /**
   * Preload trước audio của câu hỏi tiếp theo trong lúc trẻ đang làm câu hiện tại.
   */
  preload(url: string): void {
    if (!url || typeof url !== 'string' || !url.trim()) return
    this.getOrCreate(url)
  }

  /**
   * Dọn cache khi kết thúc 1 game session để giải phóng bộ nhớ.
   */
  clearCache(): void {
    this.cache.forEach((sound) => {
      sound.stop()
      sound.unload()
    })
    this.cache.clear()
    this.currentlyPlaying = null
  }

  /**
   * Phương thức hỗ trợ kiểm thử và theo dõi trạng thái.
   */
  getCacheSize(): number {
    return this.cache.size
  }

  getCurrentlyPlaying(): Howl | null {
    return this.currentlyPlaying
  }
}

export const audioService = new AudioService()
