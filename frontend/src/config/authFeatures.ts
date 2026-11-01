// Cờ khả năng cho màn đăng nhập/đăng ký. Bật từng cờ khi Backend đã cài: /auth/forgot-password (forgotPassword),
// trường rememberMe của LoginRequest (rememberMe), trường cấp dạy của RegisterRequest (teachingLevel).
// Khi tắt, phần giao diện tương ứng không hiện; khi bật cũng chưa gửi thêm trường nào lên API (xem LoginPage/RegisterPage).
export const AUTH_FEATURES = {
  forgotPassword: false,
  rememberMe: false,
  teachingLevel: false,
} as const
