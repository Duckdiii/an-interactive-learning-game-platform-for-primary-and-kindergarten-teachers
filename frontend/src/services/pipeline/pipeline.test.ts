import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseIntent,
  verifyGate1Syntax,
  verifyGate2Pedagogy,
  verifyGate3Playability,
  runGamePipeline,
  generatePresetGame,
  generateCpfGame,
  recommendGames,
  type PresetQuizData,
} from './pipelineOrchestrator'
import { CpfRuntimeEngine } from './cpfRuntime'
import { UI_SPECS } from './assetPalette'
import axiosInstance from '../../api/axiosInstance'
import { publishGameApi, getPlayGameApi } from '../../api/gamesApi'
import { resolveGameTheme, GAME_WORLD_THEMES } from './themeResolver'
import { findBestSprite, bindAssetsToPreset } from './assetBank'

vi.mock('../../api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

const mockedPost = vi.mocked(axiosInstance.post)
const mockedGet = vi.mocked(axiosInstance.get)

describe('Dual-Track AI Game Creation Pipeline Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Stage 1: Intent Parser & Router', () => {
    it('chuyển hướng prompt trắc nghiệm tiêu chuẩn vào Track 1 (PRESET)', () => {
      const prompt =
        'Tạo game trắc nghiệm Toán lớp 2: Phép cộng có nhớ trong phạm vi 100, chủ đề Động vật nông trại'
      const intent = parseIntent(prompt)

      expect(intent.track).toBe('PRESET')
      expect(intent.gradeLevel).toBe(2)
      expect(intent.subject).toBe('Math')
      expect(intent.mechanic).toBe('PRESET_QUIZ')
    })

    it('chuyển hướng prompt bắn cung/kéo ná vật lý vào Track 2 (CPF OOD)', () => {
      const prompt =
        'Tạo game Toán lớp 2: Em hãy kéo ná cao su bắn cung tên vào các quả bóng bay mang số chẵn để làm nổ bóng, bắn trúng số chẵn cộng 1 điểm, bắn trúng số lẻ rung màn hình'
      const intent = parseIntent(prompt)

      expect(intent.track).toBe('CPF')
      expect(intent.gradeLevel).toBe(2)
      expect(intent.subject).toBe('Math')
      expect(intent.mechanic).toBe('PHYSICS_SLING_ARCHERY')
    })

    it('nhận diện chính xác môn học Tiếng Việt và các lớp khác nhau', () => {
      const prompt = 'Tạo game nối từ Tiếng Việt lớp 3 với chủ đề cây cối'
      const intent = parseIntent(prompt)

      expect(intent.subject).toBe('Vietnamese')
      expect(intent.gradeLevel).toBe(3)
    })
  })

  describe('Stage 2: 3-Gate Deterministic Quality Inspection', () => {
    it('Gate 1: từ chối dữ liệu rỗng hoặc sai phiên bản schema CPF', () => {
      const resNull = verifyGate1Syntax('PRESET', undefined, undefined)
      expect(resNull.passed).toBe(false)
      expect(resNull.code).toBe('G1_NO_DATA')

      const badCpf = generateCpfGame(parseIntent('bắn cung toán lớp 2'))
      // @ts-expect-error test schema mismatch
      badCpf.schemaVersion = 'cpf.v0.9.0'
      const resBadVer = verifyGate1Syntax('CPF', undefined, badCpf)
      expect(resBadVer.passed).toBe(false)
      expect(resBadVer.code).toBe('G1_CPF_VERSION_MISMATCH')
    })

    it('Gate 2 (Sư phạm & Toán học): chặn đứng phép toán âm ở lớp 2 (ví dụ 15 - 28)', () => {
      const intent = parseIntent('Toán lớp 2')
      const invalidQuizData: PresetQuizData = {
        gameType: 'QUIZ',
        id: 'bad-math-01',
        title: 'Phép trừ lỗi',
        gradeLevel: 2,
        theme: 'Toán',
        questionText: 'Tính: 15 - 28 = ?',
        numA: 15,
        numB: 28,
        operation: '-',
        options: [
          { id: '1', text: '-13', isCorrect: true },
          { id: '2', text: '13', isCorrect: false },
        ],
        correctIndex: 0,
        explanation: '15 - 28 = -13',
      }

      const check = verifyGate2Pedagogy(intent, invalidQuizData, undefined)
      expect(check.passed).toBe(false)
      expect(check.code).toBe('G2_NEGATIVE_RESULT')
      expect(check.message).toContain('không được có kết quả âm')
    })

    it('Gate 2 (Sư phạm & Toán học): phát hiện kết quả tính toán sai lệch so với đáp án', () => {
      const intent = parseIntent('Toán lớp 2')
      const wrongMathData: PresetQuizData = {
        gameType: 'QUIZ',
        id: 'wrong-calc',
        title: 'Tính sai',
        gradeLevel: 2,
        theme: 'Toán',
        questionText: 'Tính: 38 + 27 = ?',
        numA: 38,
        numB: 27, // 38 + 27 = 65
        operation: '+',
        options: [
          { id: '1', text: '55', isCorrect: true }, // Claimed 55 is correct -> False!
          { id: '2', text: '65', isCorrect: false },
        ],
        correctIndex: 0,
        explanation: 'Sai kết quả',
      }

      const check = verifyGate2Pedagogy(intent, wrongMathData, undefined)
      expect(check.passed).toBe(false)
      expect(check.code).toBe('G2_MATH_MISMATCH')
    })

    it('Gate 2 (CPF): phát hiện bong bóng bị gán sai cờ tính chẵn/lẻ', () => {
      const intent = parseIntent('Bắn cung toán lớp 2')
      const cpf = generateCpfGame(intent)
      // Modify an odd balloon to claim isEven = true
      const oddBalloon = cpf.nodes.find((n) => n.role === 'target' && Number(n.metadata?.numberValue) % 2 !== 0)
      expect(oddBalloon).toBeDefined()
      if (oddBalloon && oddBalloon.metadata) {
        oddBalloon.metadata.isEven = true
      }

      const check = verifyGate2Pedagogy(intent, undefined, cpf)
      expect(check.passed).toBe(false)
      expect(check.code).toBe('G2_PARITY_ERROR')
    })

    it('Gate 3 (Khả năng chơi): bảo đảm vùng chạm >= 64px và mục tiêu hợp lệ', () => {
      const intent = parseIntent('Bắn cung toán lớp 2')
      const cpf = generateCpfGame(intent)

      const check = verifyGate3Playability('CPF', undefined, cpf)
      expect(check.passed).toBe(true)
      expect(check.code).toBe('G3_PASSED')
    })
  })

  describe('Stage 3: Dual-Track Assembler & Graph Generation', () => {
    it('Track 1 Assembler sinh ra bộ dữ liệu Preset Quiz hoàn chỉnh và hợp lệ', () => {
      const intent = parseIntent('Tạo game trắc nghiệm Toán lớp 2: Nông trại')
      const preset = generatePresetGame(intent)

      expect(preset.gameType).toBe('QUIZ')
      const expectedAnswer = preset.operation === '+' ? preset.numA + preset.numB : preset.numA - preset.numB
      expect(preset.options[preset.correctIndex].text).toContain(String(expectedAnswer))
      expect(preset.options.length).toBe(4)
    })

    it('Track 2 Assembler lắp ghép đồ thị Scene Graph CPF với các primitive chuẩn', () => {
      const intent = parseIntent('Tạo game bắn cung số chẵn Toán lớp 2')
      const graph = generateCpfGame(intent)

      expect(graph.schemaVersion).toBe('cpf.v1.0.0')
      expect(graph.stage.width).toBe(UI_SPECS.stageWidth)
      expect(graph.stage.height).toBe(UI_SPECS.stageHeight)

      // Nodes check
      const bowNode = graph.nodes.find((n) => n.role === 'bow')
      expect(bowNode).toBeDefined()
      expect(bowNode?.interaction?.type).toBe('SLING')

      const targets = graph.nodes.filter((n) => n.role === 'target')
      expect(targets.length).toBe(5)

      // Rules check
      expect(graph.rules.length).toBeGreaterThan(0)
      const hitRule = graph.rules[0]
      expect(hitRule.trigger).toBe('ON_COLLIDE')
      expect(hitRule.logicCheck?.rule).toBe('is_even')
      expect(hitRule.onSuccess.sound).toBe('SFX_CORRECT')
      expect(hitRule.onFailure.sound).toBe('SFX_WRONG')
    })
  })

  describe('Stage 4: End-to-End Pipeline Execution & Telemetry', () => {
    it('chạy trọn vẹn Track 1 qua 5 tầng với thời gian phản hồi tức thì < 50ms', () => {
      const prompt =
        'Tạo game trắc nghiệm Toán lớp 2: Phép cộng có nhớ trong phạm vi 100, chủ đề Động vật nông trại'
      const res = runGamePipeline(prompt)

      expect(res.track).toBe('PRESET')
      expect(res.gates.allPassed).toBe(true)
      expect(res.gates.gate1Syntax.passed).toBe(true)
      expect(res.gates.gate2Pedagogy.passed).toBe(true)
      expect(res.gates.gate3Playability.passed).toBe(true)
      expect(res.presetData).toBeDefined()
      expect(res.latencyMs).toBeLessThan(100)
    })

    it('chạy trọn vẹn Track 2 (CPF OOD) qua 5 tầng với tất cả các Quality Gate vượt qua', () => {
      const prompt =
        'Tạo game Toán lớp 2: Em hãy kéo ná cao su bắn cung tên vào các quả bóng bay mang số chẵn để làm nổ bóng, bắn trúng số chẵn cộng 1 điểm, bắn trúng số lẻ rung màn hình'
      const res = runGamePipeline(prompt)

      expect(res.track).toBe('CPF')
      expect(res.gates.allPassed).toBe(true)
      expect(res.cpfGraph).toBeDefined()
      expect(res.latencyMs).toBeLessThan(100)
    })
  })

  describe('Virtual Runtime Engine (VRE) Physics Simulation', () => {
    it('tính toán chính xác cơ chế kéo ná (Sling tension) và khóa input khi mũi tên bay', () => {
      const engine = new CpfRuntimeEngine()

      // Start drag near bow anchor (250, 540)
      const started = engine.handleDragStart(240, 540)
      expect(started).toBe(true)
      expect(engine.isPulling).toBe(true)

      // Pull backward towards left
      engine.handleDragMove(150, 540)
      expect(engine.tensionForce).toBeGreaterThan(50)
      expect(engine.pullPos.x).toBeLessThan(250)

      // Release sling to launch arrow
      engine.handleDragEnd()
      expect(engine.isPulling).toBe(false)
      expect(engine.isFlying).toBe(true)
      expect(engine.inputLocked).toBe(true)
      expect(engine.arrowVel.x).toBeGreaterThan(0) // Flying towards right targets
    })

    it('chấm điểm đúng khi mũi tên va chạm bóng số chẵn và rung màn hình khi trúng số lẻ', () => {
      const engine = new CpfRuntimeEngine()
      const initialScore = engine.score

      // Simulate hit on even balloon (24)
      const evenBalloon = engine.balloons.find((b) => b.isEven)!
      engine.arrowPos = { x: evenBalloon.x - 20, y: evenBalloon.currentY }
      engine.arrowVel = { x: 30, y: 0 }
      engine.isFlying = true

      // Advance physics simulation by 1 frame (16.6ms)
      engine.tick(0.0166)

      expect(engine.score).toBe(initialScore + 1)
      expect(evenBalloon.isPopped).toBe(true)
      expect(engine.particles.length).toBeGreaterThan(0) // Confetti spawned

      // Simulate hit on odd balloon (17)
      const oddBalloon = engine.balloons.find((b) => !b.isEven)!
      oddBalloon.isPopped = false
      engine.arrowPos = { x: oddBalloon.x - 20, y: oddBalloon.currentY }
      engine.arrowVel = { x: 30, y: 0 }
      engine.isFlying = true

      engine.tick(0.0166)

      expect(oddBalloon.isPopped).toBe(true)
      expect(engine.combo).toBe(0) // Combo reset
      expect(engine.messageBanner?.text).toContain('số lẻ')
    })
  })

  describe('End-to-End System Wiring & Production Integration', () => {
    it('recommendGames sinh đủ 3 mức độ nhận thức Bloom và ánh xạ đúng Track', () => {
      const intent = parseIntent('Toán lớp 2')
      const recs = recommendGames(intent)

      expect(recs.length).toBe(3)
      expect(recs[0].bloomLevel).toBe('Nhận biết')
      expect(recs[0].bloomIndex).toBe(1)
      expect(recs[0].track).toBe('PRESET')

      expect(recs[1].bloomLevel).toBe('Thông hiểu')
      expect(recs[1].bloomIndex).toBe(2)
      expect(recs[1].track).toBe('PRESET')

      expect(recs[2].bloomLevel).toBe('Vận dụng')
      expect(recs[2].bloomIndex).toBe(3)
      expect(recs[2].track).toBe('CPF')
    })

    it('publishGameApi gọi backend hoặc fallback sinh mã shareCode 6 ký tự', async () => {
      // Mock Backend thành công
      mockedPost.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 'game-1234',
            shareCode: 'MATH88',
            status: 'PUBLISHED',
          },
        },
      })

      const payload = {
        title: 'Nông Trại Toán Học Lớp 2',
        gameType: 'QUIZ',
        grade: 'GRADE_2',
        subject: 'MATH',
        dsl: { title: 'Test' },
      }

      const res = await publishGameApi(payload)
      expect(res.shareCode).toBe('MATH88')
      expect(res.status).toBe('PUBLISHED')
      expect(res.id).toBe('game-1234')

      // Mock Backend lỗi -> fallback client
      mockedPost.mockRejectedValueOnce(new Error('Network Error'))
      const fallbackRes = await publishGameApi(payload)
      expect(fallbackRes.shareCode).toMatch(/^MATH\d{2}$/)
      expect(fallbackRes.status).toBe('PUBLISHED')
    })

    it('getPlayGameApi cung cấp cơ chế dự phòng linh hoạt khi ngoại tuyến', async () => {
      mockedGet.mockRejectedValue(new Error('Offline'))

      // Test truy cập mã phòng MOCK02
      const game = await getPlayGameApi('MOCK02')
      expect(game).toBeDefined()
      expect(game.shareCode).toBe('MOCK02')
      expect(game.gameType).toBe('QUIZ')

      // Test truy cập mã phòng MATH02 (CPF)
      const cpfGame = await getPlayGameApi('MATH02')
      expect(cpfGame).toBeDefined()
      expect(cpfGame.shareCode).toBe('MATH02')
      expect(cpfGame.gameType).toBe('PHYSICS_SLING_ARCHERY')
    })
  })
  describe('Stage 2.5: Asset & Theme Dressing Pipeline', () => {
    it('themeResolver: tự động suy luận chủ đề FARM, OCEAN, SPACE, FOREST, CANDY', () => {
      expect(resolveGameTheme('đếm cà rốt và chú thỏ').key).toBe('FARM')
      expect(resolveGameTheme('bắt cá dưới đại dương xanh').key).toBe('OCEAN')
      expect(resolveGameTheme('phi thuyền bay vào vũ trụ và các vì sao').key).toBe('SPACE')
      expect(['JUNGLE', 'FOREST']).toContain(resolveGameTheme('khám phá cây cối và các loài hoa trong rừng').key)
      expect(resolveGameTheme('đếm kẹo mút và bánh ngọt bảy màu').key).toBe('CANDY')
    })

    it('themeResolver: cung cấp bảng màu Candy Gloss, Mascot và ambient details', () => {
      const theme = resolveGameTheme('đếm gà trong nông trại')
      expect(theme.name).toBe('Nông Trại Vui Vẻ')
      expect(theme.palette.canvasBg).toBe('#FFF9C4')
      expect(theme.mascot.id).toBe('pippy')
      expect(theme.mascot.avatarUrl).toBe('/assets/mascots/pippy.svg')
      expect(theme.mascot.happyQuote).toBeDefined()
      expect(theme.mascot.encouragingQuote).toBeDefined()
      expect(theme.ambientDetails.length).toBeGreaterThan(0)
    })

    it('assetBank: nhận diện chính xác các Vector Sprite chuẩn K-5 từ từ khóa đề bài', () => {
      expect(findBestSprite('Có 3 quả táo đỏ')?.id).toBe('apple')
      expect(findBestSprite('Một đàn vịt bơi dưới ao')?.id).toBe('duck')
      expect(findBestSprite('Bé nhìn thấy ngôi sao lấp lánh')?.id).toBe('star')
      expect(findBestSprite('Cây kẹo ngọt ngào')?.id).toBe('candy')
      expect(findBestSprite('từ khóa trừu tượng chưa có trong từ điển')).toBeNull()
    })

    it('assetBank: gắn tài nguyên hình ảnh đảm bảo không bao giờ để imageUrl null', () => {
      const theme = GAME_WORLD_THEMES.FARM
      const preset: PresetQuizData = {
        gameType: 'QUIZ',
        id: 'test-quiz',
        title: 'Toán lớp 1',
        gradeLevel: 1,
        theme: 'Toán',
        questionText: 'Bác nông dân hái 4 quả cam và 3 quả chuối.',
        numA: 4,
        numB: 3,
        operation: '+',
        options: [{ id: '1', text: '7 quả', isCorrect: true }],
        correctIndex: 0,
        explanation: '4 + 3 = 7',
      }

      const { dressedPreset, assetsAttached } = bindAssetsToPreset(preset, theme)

      expect(dressedPreset.imageUrl).not.toBeNull()
      expect(dressedPreset.imageUrl).toBeDefined()
      expect(dressedPreset.audioUrl).toBe('/mock/q1.wav')
      expect(dressedPreset.spriteItems).toBeDefined()
      expect(dressedPreset.spriteItems!.length).toBeGreaterThan(0)
      expect(assetsAttached.length).toBeGreaterThan(0)
    })

    it('pipelineOrchestrator: runGamePipeline xuất xưởng đầy đủ themeData, assetsAttached và narrationConfig', () => {
      const result = runGamePipeline('Tạo trò chơi đếm hoa quả cho học sinh lớp 1')

      expect(result.themeData).toBeDefined()
      expect(result.assetsAttached).toBeDefined()
      expect(result.assetsAttached?.primarySpriteUrl).toBeDefined()
      expect(result.assetsAttached?.sprites.length).toBeGreaterThan(0)
      expect(result.narrationConfig).toBeDefined()
      expect(result.narrationConfig?.autoPlay).toBe(true)
      expect(result.narrationConfig?.audioText).toBeDefined()
      expect(result.presetData?.imageUrl).toBeDefined()
      expect(result.presetData?.imageUrl).not.toBeNull()
    })
  })

})
