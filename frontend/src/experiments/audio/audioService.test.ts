import { describe, expect, it, vi } from 'vitest'
import {
  AudioService,
  attachUnlockListeners,
  DEFAULT_MAX_ACTIVE_NOTES,
  DEFAULT_VOLUME,
  getAudioService,
  MASTER_HEADROOM,
  worstCaseTotalPeak,
} from './audioService'
import { FakeAudioContext, type FakeContextOptions } from './fakeAudioContext'
import { ATTACK_SECONDS, MAX_PEAK, RELEASE_SECONDS, soundPlan } from './tones'

function setup(options: { context?: FakeContextOptions; service?: ConstructorParameters<typeof AudioService>[0] } = {}) {
  const contexts: FakeAudioContext[] = []
  const createContext = vi.fn(() => {
    const context = new FakeAudioContext(options.context)
    contexts.push(context)
    return context
  })
  let time = 1000
  const clock = { advance: (ms: number) => (time += ms) }
  const service = new AudioService({ createContext, now: () => time, ...options.service })
  return { service, createContext, contexts, clock, context: () => contexts[contexts.length - 1] }
}

async function unlocked(options: Parameters<typeof setup>[0] = {}) {
  const ctx = setup(options)
  await ctx.service.unlock()
  return ctx
}

/** Chờ các Promise đang treo (unlock, then) chạy xong. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('AudioService: mở khóa', () => {
  it('không dựng AudioContext khi tạo service hay khi phát trước mở khóa', () => {
    const { service, createContext } = setup()
    expect(service.play('correct')).toBe(false)
    expect(createContext).not.toHaveBeenCalled()
    expect(service.isUnlocked).toBe(false)
  })

  it('unlock dựng context một lần, resume, trả true', async () => {
    const { service, createContext, context } = setup()
    await expect(service.unlock()).resolves.toBe(true)
    expect(createContext).toHaveBeenCalledTimes(1)
    expect(context().resumeCalls).toBe(1)
    expect(service.isUnlocked).toBe(true)
    // Gọi lại: dùng lại context cũ, chỉ resume thêm.
    await service.unlock()
    expect(createContext).toHaveBeenCalledTimes(1)
    expect(context().resumeCalls).toBe(2)
  })

  it('createContext ném lỗi (trình duyệt không hỗ trợ): trả false, không ném', async () => {
    const service = new AudioService({
      createContext: () => {
        throw new Error('không hỗ trợ')
      },
    })
    await expect(service.unlock()).resolves.toBe(false)
    expect(service.isUnlocked).toBe(false)
    expect(service.play('correct')).toBe(false)
  })

  it('resume bị từ chối: trả false, không ném', async () => {
    const { service } = setup({ context: { resumeRejects: true } })
    await expect(service.unlock()).resolves.toBe(false)
    expect(service.isUnlocked).toBe(false)
  })

  it('resume xong mà context vẫn suspended: coi là chưa mở khóa', async () => {
    const { service } = setup({ context: { resumeTo: 'suspended' } })
    await expect(service.unlock()).resolves.toBe(false)
    expect(service.isUnlocked).toBe(false)
  })

  it('gọi unlock đồng thời dùng chung một lượt: một context, một resume, cùng kết quả', async () => {
    const { service, createContext, context } = setup()
    const results = await Promise.all([service.unlock(), service.unlock(), service.unlock()])
    expect(results).toEqual([true, true, true])
    expect(createContext).toHaveBeenCalledTimes(1)
    expect(context().resumeCalls).toBe(1)
  })

  describe('điều kiện đua với dispose', () => {
    it('dispose trong lúc unlock đang chờ resume: lượt đó trả false, không mở khóa, không phát', async () => {
      const { service, contexts } = setup({ context: { deferResume: true } })
      service.play('correct') // xếp hàng
      const pending = service.unlock()
      await flush()
      await service.dispose()
      contexts[0].releaseResume()
      await expect(pending).resolves.toBe(false)
      expect(service.isUnlocked).toBe(false)
      expect(contexts[0].oscillators).toHaveLength(0)
    })

    it('unlock A treo, dispose, unlock B: B mở khóa, A không đụng vào trạng thái của B', async () => {
      const { service, contexts } = setup({ context: { deferResume: true } })
      const a = service.unlock()
      await flush()
      await service.dispose()
      const b = service.unlock()
      await flush()
      expect(contexts).toHaveLength(2)
      contexts[0].releaseResume()
      await expect(a).resolves.toBe(false)
      expect(service.isUnlocked).toBe(false) // A không được tự đặt trạng thái theo context của B
      contexts[1].releaseResume()
      await expect(b).resolves.toBe(true)
      expect(service.isUnlocked).toBe(true)
    })
  })
})

describe('AudioService: phát âm', () => {
  it('lên lịch đúng số nốt, đúng tần số, loại sóng và thời điểm bắt đầu/dừng', async () => {
    const { service, context } = await unlocked()
    expect(service.play('correct')).toBe(true)
    const plan = soundPlan('correct')
    const oscillators = context().oscillators
    expect(oscillators).toHaveLength(plan.length)
    const t0 = context().currentTime + 0.02
    plan.forEach((step, index) => {
      const osc = oscillators[index]
      expect(osc.type).toBe(step.type)
      expect(osc.frequency.value).toBeCloseTo(step.freq, 6)
      expect(osc.startedAt).toBeCloseTo(t0 + step.start, 6)
      expect(osc.stoppedAt!).toBeGreaterThan(t0 + step.start + step.duration + RELEASE_SECONDS)
    })
  })

  it('mỗi nốt có envelope: 0 → đỉnh → giữ → 0, không bước nhảy đột ngột', async () => {
    const { service, context } = await unlocked()
    service.play('tryAgain')
    const [step] = soundPlan('tryAgain')
    // gains[0] là master; envelope đầu tiên là gains[1].
    const envelope = context().gains[1]
    const t0 = context().currentTime + 0.02 + step.start
    expect(envelope.gain.events).toEqual([
      { kind: 'set', value: 0, time: t0 },
      { kind: 'ramp', value: step.peak, time: t0 + ATTACK_SECONDS },
      { kind: 'set', value: step.peak, time: t0 + step.duration },
      { kind: 'ramp', value: 0, time: t0 + step.duration + RELEASE_SECONDS },
    ])
  })

  it('đường nối: dao động → envelope → master → destination', async () => {
    const { service, context } = await unlocked()
    service.play('correct')
    const [master, envelope] = context().gains
    expect(context().oscillators[0].connections).toEqual([envelope])
    expect(envelope.connections).toEqual([master])
    expect(master.connections).toEqual([context().destination])
  })

  it('chỉ dựng một master gain cho nhiều lần phát', async () => {
    const { service, context, clock } = await unlocked()
    service.play('correct')
    clock.advance(500)
    service.play('tryAgain')
    const masters = context().gains.filter((gain) => gain.connections.includes(context().destination))
    expect(masters).toHaveLength(1)
  })

  it('nốt phát xong thì ngắt kết nối dao động và envelope (không rò rỉ nút)', async () => {
    const { service, context } = await unlocked()
    service.play('correct')
    const [, ...envelopes] = context().gains
    for (const osc of context().oscillators) osc.finish()
    expect(context().oscillators.every((osc) => osc.disconnected)).toBe(true)
    expect(envelopes.every((envelope) => envelope.disconnected)).toBe(true)
  })

  it('âm dài hơn giới hạn đồng thời thì bị bỏ hẳn (không phát nửa chừng)', async () => {
    const { service, context } = await unlocked({ service: { maxActiveNotes: 3 } })
    expect(service.play('complete')).toBe(false) // 4 nốt > 3
    expect(context().oscillators).toHaveLength(0)
  })

  it('giới hạn đồng thời: hết chỗ thì bỏ lệnh mới, nốt xong thì phát được lại', async () => {
    const { service, context, clock } = await unlocked({ service: { maxActiveNotes: 3, minGapMs: 0 } })
    expect(service.play('correct')).toBe(true)
    clock.advance(10)
    expect(service.play('correct')).toBe(false)
    for (const osc of context().oscillators) osc.finish()
    clock.advance(10)
    expect(service.play('correct')).toBe(true)
  })

  it('chống bấm dồn: cùng một âm trong khoảng minGapMs bị bỏ, âm khác hoặc sau khoảng đó thì phát', async () => {
    const { service, context, clock } = await unlocked({ service: { minGapMs: 100 } })
    expect(service.play('tryAgain')).toBe(true)
    clock.advance(99)
    expect(service.play('tryAgain')).toBe(false)
    expect(service.play('correct')).toBe(true)
    clock.advance(1)
    expect(service.play('tryAgain')).toBe(true)
    expect(context().oscillators.length).toBe(2 + 3 + 2)
  })

  describe('context bị ngắt sau khi đã mở khóa (ví dụ iOS)', () => {
    it('xếp hàng, báo chưa mở khóa, rồi tự resume và phát khi hồi phục', async () => {
      const { service, context } = await unlocked()
      context().state = 'interrupted'
      expect(service.play('correct')).toBe(false)
      expect(context().oscillators).toHaveLength(0)
      expect(service.getSnapshot().unlocked).toBe(false)
      await flush()
      expect(context().resumeCalls).toBe(2) // lần mở khóa đầu + lần tự hồi phục
      expect(service.getSnapshot().unlocked).toBe(true)
      expect(context().oscillators).toHaveLength(soundPlan('correct').length)
    })

    it('resume vẫn bị từ chối thì giữ hàng đợi và không ném', async () => {
      const { service, context } = await unlocked()
      context().state = 'interrupted'
      context().resumeRejects = true
      expect(service.play('correct')).toBe(false)
      await flush()
      expect(service.isUnlocked).toBe(false)
      expect(context().oscillators).toHaveLength(0)
      // Lần sau được phép (cử chỉ hợp lệ) thì phát âm đã chờ.
      context().resumeRejects = false
      await service.unlock()
      expect(context().oscillators).toHaveLength(soundPlan('correct').length)
    })
  })

  describe('giới hạn tổng biên độ (an toàn cho tai trẻ nhỏ)', () => {
    it('trường hợp xấu nhất mặc định không vượt 1: không cắt đỉnh ngay cả khi âm lượng = 1', () => {
      expect(worstCaseTotalPeak()).toBeLessThanOrEqual(1)
      expect(DEFAULT_MAX_ACTIVE_NOTES * MAX_PEAK * MASTER_HEADROOM).toBeLessThanOrEqual(1)
    })

    it('master = âm lượng × hệ số chừa chỗ, không phải âm lượng thẳng', async () => {
      const { service, context } = await unlocked()
      service.setVolume(1)
      service.play('correct')
      expect(context().gains[0].gain.value).toBeCloseTo(MASTER_HEADROOM, 10)
    })

    it('đầy giới hạn đồng thời thì mọi lệnh thêm bị bỏ: tổng nốt không bao giờ vượt maxActiveNotes', async () => {
      const { service, context, clock } = await unlocked({ service: { minGapMs: 0 } })
      for (const name of ['correct', 'tryAgain', 'correct', 'tryAgain', 'correct', 'complete'] as const) {
        service.play(name)
        clock.advance(1)
      }
      expect(context().oscillators.length).toBeLessThanOrEqual(DEFAULT_MAX_ACTIVE_NOTES)
    })
  })

  describe('dispose khi đang phát', () => {
    it('đặt lại bộ đếm nốt: sau khi mở khóa lại vẫn phát được', async () => {
      const { service } = await unlocked({ service: { maxActiveNotes: 3, minGapMs: 0 } })
      expect(service.play('correct')).toBe(true) // đầy 3/3, nốt không bao giờ onended
      await service.dispose()
      await service.unlock()
      expect(service.play('correct')).toBe(true)
    })

    it('onended muộn của context cũ không trừ nhầm vào bộ đếm của context mới', async () => {
      const { service, contexts, clock } = await unlocked({ service: { maxActiveNotes: 3, minGapMs: 0 } })
      service.play('correct')
      await service.dispose()
      await service.unlock()
      clock.advance(10)
      expect(service.play('correct')).toBe(true) // context mới đầy 3/3
      for (const osc of contexts[0].oscillators) osc.finish() // nốt cũ báo xong muộn
      clock.advance(10)
      expect(service.play('correct')).toBe(false) // bộ đếm không bị trừ nhầm nên vẫn đầy
    })
  })
})

describe('AudioService: hàng đợi khi chưa mở khóa', () => {
  it('phát các lệnh đã chờ ngay sau khi mở khóa', async () => {
    const { service, context } = setup()
    service.play('correct')
    await service.unlock()
    expect(context().oscillators).toHaveLength(soundPlan('correct').length)
  })

  it('chỉ giữ vài lệnh gần nhất, bỏ lệnh cũ nhất', async () => {
    const { service, context, clock } = setup({ service: { maxQueue: 2, minGapMs: 0 } })
    service.play('correct')
    clock.advance(10)
    service.play('tryAgain')
    clock.advance(10)
    service.play('complete')
    await service.unlock()
    // 'correct' bị bỏ; còn tryAgain (2 nốt) + complete (4 nốt).
    expect(context().oscillators).toHaveLength(2 + 4)
  })

  it('cùng một âm bấm nhiều lần trước khi mở khóa chỉ phát một lần (không chồng nốt)', async () => {
    const { service, context, clock } = setup()
    service.play('correct')
    clock.advance(5)
    service.play('correct')
    clock.advance(5)
    service.play('correct')
    await service.unlock()
    expect(context().oscillators).toHaveLength(soundPlan('correct').length)
  })

  it('cùng âm xếp hàng thì giữ lệnh mới nhất (đẩy ra sau các âm khác)', async () => {
    const { service, context, clock } = setup({ service: { maxQueue: 2 } })
    service.play('correct')
    clock.advance(10)
    service.play('tryAgain')
    clock.advance(10)
    service.play('correct') // làm mới 'correct', không chiếm thêm chỗ
    await service.unlock()
    expect(context().oscillators).toHaveLength(soundPlan('tryAgain').length + soundPlan('correct').length)
  })

  it('lệnh chờ quá hạn bị bỏ', async () => {
    const { service, context, clock } = setup({ service: { queueTtlMs: 2000 } })
    service.play('correct')
    clock.advance(2001)
    await service.unlock()
    expect(context().oscillators).toHaveLength(0)
  })

  it('lệnh chờ đúng hạn vẫn phát (ranh giới)', async () => {
    const { service, context, clock } = setup({ service: { queueTtlMs: 2000 } })
    service.play('correct')
    clock.advance(2000)
    await service.unlock()
    expect(context().oscillators).toHaveLength(3)
  })

  it('mở khóa thất bại thì giữ hàng đợi, lần mở khóa sau mới phát đúng âm đã chờ', async () => {
    const { service, context } = setup({ context: { resumeRejects: true } })
    service.play('correct')
    await expect(service.unlock()).resolves.toBe(false)
    expect(context().oscillators).toHaveLength(0)
    context().resumeRejects = false
    await expect(service.unlock()).resolves.toBe(true)
    expect(context().oscillators).toHaveLength(soundPlan('correct').length)
  })

  it('createContext lỗi lần đầu: lần sau dựng được thì phát âm đã chờ', async () => {
    const contexts: FakeAudioContext[] = []
    const createContext = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('lần đầu lỗi')
      })
      .mockImplementation(() => {
        const context = new FakeAudioContext()
        contexts.push(context)
        return context
      })
    const service = new AudioService({ createContext })
    service.play('correct')
    await expect(service.unlock()).resolves.toBe(false)
    await expect(service.unlock()).resolves.toBe(true)
    expect(contexts[0].oscillators).toHaveLength(soundPlan('correct').length)
  })
})

describe('AudioService: tắt tiếng và âm lượng', () => {
  it('tắt tiếng thì không phát gì', async () => {
    const { service, context } = await unlocked()
    service.setMuted(true)
    expect(service.play('correct')).toBe(false)
    expect(context().oscillators).toHaveLength(0)
  })

  it('tắt tiếng bỏ hàng đợi: bật lại và mở khóa không phát âm cũ', async () => {
    const { service, context } = setup()
    service.play('correct')
    service.setMuted(true)
    service.setMuted(false)
    await service.unlock()
    expect(context().oscillators).toHaveLength(0)
  })

  it('tắt tiếng cắt âm đang phát bằng đường dốc ngắn (không "tách") rồi bật lại trả âm lượng', async () => {
    const { service, context } = await unlocked()
    service.setVolume(0.4)
    service.play('correct')
    const master = context().gains[0]
    const target = 0.4 * MASTER_HEADROOM
    expect(master.gain.value).toBeCloseTo(target, 10)
    master.gain.events.length = 0

    service.setMuted(true)
    const now = context().currentTime
    // Bắt đầu từ giá trị hiện tại rồi dốc về 0 trong khoảng ngắn, không gán thẳng.
    expect(master.gain.events).toEqual([
      { kind: 'set', value: target, time: now },
      { kind: 'ramp', value: 0, time: now + 0.02 },
    ])
    expect(master.gain.value).toBe(0)

    service.setMuted(false)
    expect(master.gain.value).toBeCloseTo(target, 10)
  })

  it('tắt tiếng trước khi có master rồi phát sau khi bật lại: master dùng đúng âm lượng', async () => {
    const { service, context } = await unlocked()
    service.setMuted(true)
    service.setMuted(false)
    service.play('correct')
    expect(context().gains[0].gain.value).toBeCloseTo(DEFAULT_VOLUME * MASTER_HEADROOM, 10)
  })

  it('đang tắt tiếng thì master (dựng muộn) bắt đầu ở 0', async () => {
    const { service, context } = await unlocked()
    service.setMuted(true)
    service.setMuted(false)
    service.setMuted(true)
    expect(service.play('correct')).toBe(false)
    expect(context().gains).toHaveLength(0)
  })

  it.each([
    [0.5, 0.5],
    [0, 0],
    [1, 1],
    [-3, 0],
    [7, 1],
    [Number.NaN, DEFAULT_VOLUME],
    [Number.POSITIVE_INFINITY, DEFAULT_VOLUME],
  ])('setVolume(%s) → %s', (input, expected) => {
    const { service } = setup()
    service.setVolume(input)
    expect(service.currentVolume).toBe(expected)
  })
})

describe('AudioService: trạng thái cho giao diện', () => {
  it('snapshot giữ nguyên danh tính khi không đổi và báo người nghe khi đổi', async () => {
    const { service } = setup()
    const listener = vi.fn()
    const unsubscribe = service.subscribe(listener)
    const first = service.getSnapshot()
    service.setMuted(false) // không đổi
    expect(service.getSnapshot()).toBe(first)
    expect(listener).not.toHaveBeenCalled()
    service.setMuted(true)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(service.getSnapshot()).toEqual({ muted: true, volume: DEFAULT_VOLUME, unlocked: false })
    await service.unlock()
    expect(service.getSnapshot().unlocked).toBe(true)
    unsubscribe()
    service.setVolume(0.1)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('AudioService: dispose', () => {
  it('đóng context, quên trạng thái mở khóa', async () => {
    const { service, context } = setup()
    await service.unlock()
    const first = context()
    await service.dispose()
    expect(first.closeCalls).toBe(1)
    expect(service.isUnlocked).toBe(false)
    expect(service.play('tryAgain')).toBe(false)
  })

  it('bỏ hàng đợi: mở khóa lại không phát âm cũ', async () => {
    const { service, context } = setup()
    service.play('correct')
    await service.dispose()
    await service.unlock()
    expect(context().oscillators).toHaveLength(0)
  })

  it('mở khóa lại sau dispose thì dựng context mới', async () => {
    const { service, createContext } = setup()
    await service.unlock()
    await service.dispose()
    await service.unlock()
    expect(createContext).toHaveBeenCalledTimes(2)
  })

  it('dispose khi chưa mở khóa không ném', async () => {
    const { service } = setup()
    await expect(service.dispose()).resolves.toBeUndefined()
  })
})

describe('attachUnlockListeners', () => {
  const newService = (options: FakeContextOptions = {}) => {
    const contexts: FakeAudioContext[] = []
    const service = new AudioService({
      createContext: () => {
        const context = new FakeAudioContext(options)
        contexts.push(context)
        return context
      },
    })
    return { service, contexts, unlock: vi.spyOn(service, 'unlock') }
  }

  it.each(['pointerup', 'click', 'touchend', 'keydown'])('sự kiện %s mở khóa', async (type) => {
    const target = new EventTarget()
    const { service, unlock } = newService()
    attachUnlockListeners(service, target)
    target.dispatchEvent(new Event(type))
    await flush()
    expect(unlock).toHaveBeenCalledTimes(1)
    expect(service.isUnlocked).toBe(true)
  })

  it.each(['pointerdown', 'mousemove', 'focus'])('sự kiện %s KHÔNG mở khóa (không phải cử chỉ kích hoạt)', async (type) => {
    const target = new EventTarget()
    const { service, unlock } = newService()
    attachUnlockListeners(service, target)
    target.dispatchEvent(new Event(type))
    await flush()
    expect(unlock).not.toHaveBeenCalled()
  })

  it('mở khóa thành công thì tự gỡ: cử chỉ sau không gọi unlock nữa', async () => {
    const target = new EventTarget()
    const { service, unlock } = newService()
    attachUnlockListeners(service, target)
    target.dispatchEvent(new Event('pointerup'))
    await flush()
    target.dispatchEvent(new Event('keydown'))
    target.dispatchEvent(new Event('click'))
    await flush()
    expect(unlock).toHaveBeenCalledTimes(1)
  })

  it('mở khóa THẤT BẠI thì giữ bộ nghe để thử lại ở cử chỉ sau (lỗi nghiêm trọng đã được review chỉ ra)', async () => {
    const target = new EventTarget()
    const { service, contexts, unlock } = newService({ resumeRejects: true })
    attachUnlockListeners(service, target)
    target.dispatchEvent(new Event('keydown')) // ví dụ phím Esc không được tính là kích hoạt
    await flush()
    expect(service.isUnlocked).toBe(false)
    contexts[0].resumeRejects = false // cử chỉ kế tiếp là kích hoạt hợp lệ
    target.dispatchEvent(new Event('touchend'))
    await flush()
    expect(unlock).toHaveBeenCalledTimes(2)
    expect(service.isUnlocked).toBe(true)
    // Thành công rồi thì mới gỡ.
    target.dispatchEvent(new Event('click'))
    await flush()
    expect(unlock).toHaveBeenCalledTimes(2)
  })

  it('hàm gỡ thủ công thì cử chỉ không mở khóa nữa, gỡ hai lần không lỗi', async () => {
    const target = new EventTarget()
    const { service, unlock } = newService()
    const detach = attachUnlockListeners(service, target)
    detach()
    detach()
    target.dispatchEvent(new Event('pointerup'))
    await flush()
    expect(unlock).not.toHaveBeenCalled()
  })
})

describe('getAudioService', () => {
  it('trả cùng một bản dùng chung và không dựng AudioContext lúc tạo', () => {
    const a = getAudioService()
    expect(getAudioService()).toBe(a)
    expect(a.isUnlocked).toBe(false)
  })
})
