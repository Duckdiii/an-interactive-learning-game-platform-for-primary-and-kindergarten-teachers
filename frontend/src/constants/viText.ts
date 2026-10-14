// Chuỗi hiển thị cho giáo viên (tiếng Việt). Gom một chỗ để dễ rà soát từ ngữ và không rải chữ trong component.
// Quy ước viết: động từ rõ ràng ("Tạo trò chơi", không "Gửi"), cùng một việc luôn cùng một tên, lỗi nói rõ việc cần làm.

export const viText = {
  appName: 'AI Game Platform',

  // Dữ liệu mô phỏng (cờ VITE_USE_MOCK, xem config/mockMode.ts).
  mock: {
    badge: 'Dữ liệu mô phỏng',
    bannerTitle: 'Đang dùng dữ liệu mô phỏng',
    bannerBody: 'Một số màn hình đang dùng dữ liệu mẫu để thử giao diện, chưa phải dữ liệu thật của bạn.',
    bannerGroups: 'Đang mô phỏng:',
    groups: {
      games: 'danh sách trò chơi',
      editor: 'trình soạn thảo',
      media: 'tải tệp',
      ai: 'kết quả AI',
      sessions: 'phòng chơi',
      results: 'kết quả chơi',
    },
  },

  layout: {
    sidebarSubtitle: 'Dành cho giáo viên',
    fallbackUser: 'Giáo viên',
    signOut: 'Đăng xuất',
    navLabel: 'Điều hướng chính',
    navLabelCompact: 'Điều hướng chính (thanh dưới)',
    skipToContent: 'Bỏ qua điều hướng, tới nội dung chính',
  },

  nav: {
    home: 'Trang chủ',
    myGames: 'Trò chơi của tôi',
    createGame: 'Tạo game mới',
  },

  auth: {
    tabLogin: 'Đăng nhập',
    tabRegister: 'Đăng ký',
    heroKicker: 'Dành cho giáo viên',
    heroTitle: 'Biến ý tưởng bài học thành trò chơi cho cả lớp',
    heroDescription:
      'Soạn trò chơi học tập cho học sinh mầm non và tiểu học nhanh hơn, ngay trên một trang.',
    heroPoints: [
      'Chỉ cần mô tả ý tưởng, trợ lý AI soạn giúp bạn',
      'Nội dung phù hợp lứa tuổi từ mầm non đến lớp 5',
      'Học sinh chơi bằng mã chia sẻ, không cần đăng nhập',
    ],
    footer: 'Nền tảng trò chơi học tập cho trường mầm non và tiểu học.',
    loginKicker: 'Chào mừng quay lại',
    loginDescription:
      'Tiếp tục vào trang giáo viên để soạn và quản lý trò chơi học tập.',
    registerKicker: 'Dành cho giáo viên',
    emailPlaceholder: 'giaovien@example.com',
    showPassword: 'Hiện mật khẩu',
    hidePassword: 'Ẩn mật khẩu',
    passwordHint: 'Ít nhất 8 ký tự',
  },

  home: {
    kicker: 'Trang chủ',
    greeting: 'Xin chào',
    subtitle: 'Hôm nay bạn muốn dạy gì cho các bé?',
    createTitle: 'Tạo trò chơi mới',
    createDescription:
      'Mô tả ý tưởng bài học, trợ lý AI sẽ soạn thành trò chơi cho học sinh.',
    createFromIdea: 'Tạo từ ý tưởng',
    createRandom: 'Tạo ngẫu nhiên',
    statsLabel: 'Thống kê trò chơi',
    statsTotal: 'Tất cả',
    statsDraft: 'Bản nháp',
    statsPublished: 'Đã đăng',
    recentTitle: 'Tiếp tục soạn',
    recentHint: 'Các bản nháp bạn cập nhật gần đây nhất.',
    recentEmpty: 'Bạn không có bản nháp nào đang soạn dở.',
    seeAll: 'Xem tất cả trò chơi',
    topicsTitle: 'Gợi ý chủ đề cho bạn',
    topicsHint: 'Theo khối lớp và môn bạn hay làm gần đây. Bấm vào để bắt đầu.',
    topicsAction: 'Tạo từ gợi ý này',
    firstTitle: 'Bắt đầu với trò chơi đầu tiên',
    firstDescription:
      'Chỉ mất vài phút: mô tả ý tưởng, chọn loại trò chơi AI đề xuất, rồi xem lại trước khi đăng.',
    firstSteps: [
      'Mô tả ý tưởng bài học (hoặc để AI gợi ý)',
      'Chọn loại trò chơi AI đề xuất',
      'Xem lại, chỉnh sửa và đăng cho học sinh',
    ],
    loadingLabel: 'Đang tải trò chơi',
    errorTitle: 'Không thể tải danh sách trò chơi',
    errorFallback: 'Vui lòng thử lại sau ít phút.',
    retry: 'Thử lại',
  },

  myGames: {
    title: 'Trò chơi của tôi',
    description: 'Tất cả bản nháp và trò chơi đã đăng của bạn, mới cập nhật nằm trên cùng.',
    searchLabel: 'Tìm theo tên trò chơi',
    searchPlaceholder: 'Ví dụ: đếm số, chữ cái...',
    statusAll: 'Tất cả',
    statusTabsLabel: 'Lọc theo trạng thái',
    subjectLabel: 'Môn học',
    gradeLabel: 'Khối lớp',
    allOption: 'Tất cả',
    resultsLabel: 'Danh sách trò chơi',
    noMatchTitle: 'Không có trò chơi nào khớp',
    noMatchDescription: 'Thử đổi từ khóa hoặc bỏ bớt bộ lọc.',
    clearFilters: 'Bỏ tìm kiếm và bộ lọc',
    emptyTitle: 'Bạn chưa có trò chơi nào',
    emptyDescription:
      'Khi bạn tạo trò chơi, chúng sẽ hiện ở đây để bạn mở lại, chỉnh sửa và chia sẻ cho học sinh.',
    emptyAction: 'Tạo trò chơi đầu tiên',
  },

  gameCard: {
    updated: 'Cập nhật',
    shareCode: 'Mã chơi',
    copyCode: 'Sao chép mã',
    copyShort: 'Sao chép',
    copied: 'Đã sao chép',
    copyFailed: 'Không sao chép được, hãy chọn và chép mã thủ công.',
    notPublished: 'Chưa đăng, chưa có mã chơi',
    edit: 'Chỉnh sửa',
  },

  generator: {
    kicker: 'Tạo game bằng AI',
    title: 'Tạo game mới',
    description:
      'Mô tả ý tưởng bài học, AI sẽ đề xuất các loại trò chơi phù hợp để bạn chọn. Chưa có ý tưởng? Bấm "Tạo ngẫu nhiên".',
    subjectLabel: 'Môn học',
    gradeLabel: 'Khối lớp',
    contextTitle: 'Bài học dành cho',
    contextHint: 'Không bắt buộc. AI sẽ đoán từ mô tả của bạn, bạn bấm vào để đổi.',
    // Giá trị rỗng của chip khối lớp/môn: chưa có mô tả để đoán, hoặc giáo viên chủ động để trống.
    noValueOption: 'Chưa xác định',
    aiGuessTag: 'AI đoán, bấm để sửa',
    suggestionsTitle: 'Gợi ý nhanh',
    suggestionsHint: 'Gõ mô tả hoặc chọn khối lớp, môn học để xem gợi ý phù hợp.',
    suggestionsNone: 'Chưa có gợi ý cho lựa chọn này, bạn hãy tự viết ý tưởng nhé.',
    suggestionsCount: 'gợi ý phù hợp',
    ideaLabel: 'Ý tưởng bài học',
    ideaHint: 'Viết 1 đến 2 câu: dạy gì, cho lớp nào. Ít nhất 10 ký tự.',
    fileLabel: 'Hoặc tải lên giáo án',
    fileHint: 'Tệp .docx hoặc .pdf, tối đa 10 MB. Có thể dùng cùng với ý tưởng.',
    fileDrop: 'Kéo tệp vào đây hoặc bấm để chọn tệp',
    fileRemove: 'Bỏ tệp',
    fileBadType:
      'Tệp giáo án phải là .docx hoặc .pdf. Hãy chọn tệp khác.',
    fileTooLarge:
      'Tệp vượt quá dung lượng cho phép (tối đa 10 MB). Hãy chọn tệp khác hoặc nén lại.',
    advancedTitle: 'Tùy chọn nâng cao',
    gameTypeLabel: 'Loại trò chơi',
    gameTypeAuto: 'AI sẽ đề xuất sau khi bạn bấm Tạo',
    voiceRegionLabel: 'Giọng đọc vùng miền',
    voiceGenderLabel: 'Giọng đọc',
    // Giá trị (NORTH/CENTRAL/SOUTH, FEMALE/MALE) theo contract GenerateGameRequest.voice.
    voiceRegions: [
      ['NORTH', 'Miền Bắc'],
      ['CENTRAL', 'Miền Trung'],
      ['SOUTH', 'Miền Nam'],
    ] as ReadonlyArray<readonly [string, string]>,
    voiceGenders: [
      ['FEMALE', 'Giọng nữ'],
      ['MALE', 'Giọng nam'],
    ] as ReadonlyArray<readonly [string, string]>,
    submit: 'Tạo trò chơi',
    random: 'Tạo ngẫu nhiên',
    randomHint: 'Chưa có ý tưởng? AI sẽ chọn chủ đề phù hợp lứa tuổi (bạn có thể chọn khối lớp và môn để gợi ý sát hơn).',
    randomBlockedHint: 'Muốn tạo ngẫu nhiên, hãy xóa ý tưởng và tệp giáo án đã nhập.',
    fileSummaryLabel: 'Giáo án',
    summaryTitle: 'Tóm tắt yêu cầu',
    summaryEmpty: 'Chưa chọn',
    errorNeedIdea: 'Hãy mô tả ý tưởng (ít nhất 10 ký tự) hoặc tải lên giáo án.',
    stepsLabel: 'Các bước tạo trò chơi',
    stepDescribe: 'Mô tả ý tưởng',
    stepPick: 'Chọn loại trò chơi',
    randomTopicSummary: 'AI chọn chủ đề',
    suggestStepTitle: 'AI đề xuất các loại trò chơi cho bạn',
    suggestStepRandom: 'AI sẽ chọn chủ đề phù hợp, bạn chọn loại trò chơi muốn tạo.',
    suggestLoading: 'AI đang chọn loại trò chơi phù hợp...',
    suggestPick: 'Chọn loại trò chơi muốn tạo',
    suggestPickHint: 'Chọn một hoặc nhiều loại, tối đa {max} mỗi lần. Loại đầu tiên được chọn sẵn.',
    suggestTopPick: 'Phù hợp nhất',
    suggestHowToPlay: 'Cách chơi',
    suggestSelected: 'Đã chọn',
    suggestLimitReached: 'Đã chọn đủ {max} loại. Bỏ chọn một loại nếu muốn đổi.',
    stepDone: 'đã xong',
    ideaNeedMore: 'Cần thêm {n} ký tự',
    suggestBack: 'Quay lại sửa mô tả',
    suggestCreate: 'Tạo',
    suggestCreateNone: 'Chọn ít nhất 1 loại để tạo',
    suggestErrorTitle: 'Chưa lấy được đề xuất',
    suggestErrorFallback: 'AI chưa đề xuất được lúc này. Bạn thử lại nhé.',
    suggestRetry: 'Thử lại',
    suggestEmptyTitle: 'Chưa có đề xuất cho ý tưởng này',
    suggestEmpty: 'Bạn hãy quay lại, mô tả cụ thể hơn một chút (dạy gì, cho lớp nào) rồi thử lại.',
    notReadyTitle: 'Tính năng tạo game đang được hoàn thiện',
    notReady:
      'Thông tin của bạn đã hợp lệ nhưng hệ thống chưa tạo được trò chơi lúc này. Bạn có thể quay lại sau, chưa có gì bị mất vì chưa gửi đi.',
  },

  editor: {
    kicker: 'Soạn thảo',
    title: 'Trình soạn thảo đang được hoàn thiện',
    description:
      'Khi hoàn thiện, đây là nơi bạn sửa từng câu hỏi của trò chơi, xem thử như học sinh và đăng cho cả lớp.',
    comingTag: 'Đang hoàn thiện',
    comingTitle: 'Bạn sẽ làm được gì ở đây',
    coming: [
      'Sửa câu chữ, đáp án, hình ảnh và âm thanh của từng câu hỏi',
      'Chơi thử như học sinh mà không ghi điểm',
      'Đăng trò chơi và nhận mã chơi để gửi cho học sinh',
    ],
    backToGames: 'Về Trò chơi của tôi',
    createInstead: 'Tạo game mới',
  },

  notFound: {
    title: 'Không tìm thấy trang',
    description:
      'Địa chỉ này không tồn tại. Hãy quay lại Trang chủ để tiếp tục.',
    backHome: 'Về Trang chủ',
  },

  common: {
    loading: 'Đang tải',
  },
} as const
