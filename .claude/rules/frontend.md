---
paths:
  - "frontend/**"
---

# Frontend (`frontend/`)

- **Chỉ dùng Context API + `useState`/`useReducer` của React cho client state** — tuyệt đối không thêm Zustand, Redux, Jotai, hay bất kỳ state-management library nào khác.
- `@tanstack/react-query` chỉ dùng cho data fetching/cache từ API (loading, error, retry), không dùng để thay thế client state.
- Gọi API qua `src/api/axiosInstance.ts` (đã có interceptor đính token + xử lý 401), không tạo thêm axios instance khác trừ khi có lý do rõ ràng.
- Đọc/ghi session qua `useAuth()` (từ `AuthContext`), không thao tác trực tiếp `localStorage` ở nơi khác.
- Tailwind v4: cấu hình qua `@tailwindcss/vite` plugin + `@import "tailwindcss"` trong `index.css`. `tailwind.config.js` được nạp qua `@config` — nếu sửa `content` globs thì sửa ở đây.

## Thư viện frontend đã duyệt sẵn

`react-konva`, `howler`, `qrcode.react`, `@stomp/stompjs`, `sockjs-client`, `use-image` (cùng axios, react-router-dom, @tanstack/react-query đã cài). Chỉ hỏi user khi cần thêm thư viện NGOÀI danh sách này.
