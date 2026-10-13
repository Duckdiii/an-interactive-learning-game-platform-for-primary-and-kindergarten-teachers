// Chuỗi hiển thị cho giáo viên (tiếng Việt). Gom một chỗ để dễ rà soát từ ngữ và không rải chữ trong component.

export const viText = {
  appName: 'AI Game Platform',

  layout: {
    sidebarSubtitle: 'Dành cho giáo viên',
    headerKicker: 'Trò chơi học tập mầm non và tiểu học',
    headerTitle: 'Trang giáo viên',
    fallbackUser: 'Giáo viên',
    signedIn: 'Đã đăng nhập',
    noSession: 'Chưa đăng nhập',
    signOut: 'Đăng xuất',
    navLabel: 'Điều hướng chính',
    navLabelCompact: 'Điều hướng chính (màn hình nhỏ)',
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
    heroTitle: 'Tạo trò chơi học tập vui nhộn cho lớp của bạn',
    heroDescription:
      'Soạn và quản lý trò chơi học tập cho học sinh mầm non và tiểu học ngay trên một trang.',
    footer: 'Nền tảng trò chơi học tập cho trường mầm non và tiểu học.',
    loginKicker: 'Chào mừng quay lại',
    loginDescription:
      'Tiếp tục vào trang giáo viên để soạn và quản lý trò chơi học tập.',
    registerKicker: 'Dành cho giáo viên',
    emailPlaceholder: 'giaovien@example.com',
  },

  home: {
    kicker: 'Trang chủ',
  },

  generator: {
    kicker: 'Tạo game bằng AI',
    title: 'Tạo game mới',
    description: 'Tính năng tạo trò chơi bằng AI đang được hoàn thiện.',
    emptyTitle: 'Tính năng sắp ra mắt',
    emptyDescription:
      'Bạn sẽ chọn môn học, khối lớp và chủ đề ở đây. Trong lúc chờ, bạn có thể xem các trò chơi của mình ở Trang chủ.',
    backHome: 'Về Trang chủ',
  },

  workspace: {
    kicker: 'Trò chơi của tôi',
    title: 'Bản nháp và trò chơi đã lưu',
    description:
      'Nơi lưu các trò chơi bạn đang soạn. Danh sách tạm thời để trống cho đến khi tính năng lưu được hoàn thiện.',
    createAction: 'Soạn trò chơi mới',
    libraryTitle: 'Kho trò chơi',
    libraryHint: 'Các bản nháp đã lưu sẽ hiện ở đây.',
    libraryCount: '0 trò chơi',
    emptyTitle: 'Bạn chưa có bản nháp nào',
    emptyDescription: 'Hãy mở trình soạn thảo để bắt đầu một trò chơi mới.',
    openEditor: 'Mở trình soạn thảo',
    summaryTitle: 'Tổng quan',
    drafts: 'Bản nháp',
    published: 'Đã đăng',
    shared: 'Đã chia sẻ',
  },

  editor: {
    kicker: 'Soạn thảo',
    title: 'Trình soạn thảo trò chơi',
    description:
      'Khu vực soạn trò chơi học tập. Phần xem trước, tạo bằng AI và kiểm tra nội dung sẽ được gắn vào đây sau.',
    libraryTitle: 'Thư viện',
    add: 'Thêm',
    gameTypes: ['Trắc nghiệm', 'Nối cặp', 'Kéo thả', 'Sắp xếp'],
    previewTitle: 'Xem trước trực tiếp',
    previewHint: 'Trò chơi sẽ hiện trong khu vực này.',
    modes: ['Soạn', 'Xem thử'],
    previewEmptyTitle: 'Chưa có nội dung để xem trước',
    previewEmptyDescription:
      'Trò chơi sẽ hiện ở đây khi bạn thêm câu hỏi vào.',
    inspectorTitle: 'Chi tiết',
    panels: [
      'Thư viện câu hỏi',
      'Xem trước',
      'Cài đặt trò chơi',
      'Ghi chú kiểm tra',
    ],
    panelHint: 'Tính năng này sẽ có sau.',
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
