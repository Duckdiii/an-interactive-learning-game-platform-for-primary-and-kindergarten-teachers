// Cờ khả năng cho màn đăng nhập/đăng ký. Bật từng cờ khi Backend đã cài: /auth/forgot-password (forgotPassword),
// trường rememberMe của LoginRequest (rememberMe), trường cấp dạy của RegisterRequest (teachingLevel).
// Khi tắt, phần giao diện tương ứng không hiện. rememberMe bật thì gửi kèm LoginRequest; teachingLevel bật vẫn chưa gửi lên API (RegisterRequest chưa có trường này).
export const AUTH_FEATURES = {
  forgotPassword: true,
  rememberMe: true,
  teachingLevel: false,
} as const
