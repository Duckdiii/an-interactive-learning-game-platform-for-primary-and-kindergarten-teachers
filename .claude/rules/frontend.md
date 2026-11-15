---
paths:
  - "frontend/**"
---

# Frontend (`frontend/`)

- **Chỉ dùng Context API + `useState`/`useReducer` của React cho client state** — tuyệt đối không thêm Zustand, Redux, Jotai, hay bất kỳ state-management library nào khác.
- `@tanstack/react-query` chỉ dùng cho data fetching/cache từ API (loading, error, retry), không dùng để thay thế client state.
- Gọi API qua `src/api/axiosInstance.ts` (đã có interceptor đính token + xử lý 401): file khác không tạo axios instance và không gọi request bằng axios trực tiếp, chỉ dùng phần tiện ích (`isAxiosError`, `isCancel`, `CanceledError`, kiểu). `src/api/frontendRules.test.ts` chặn việc này; có lý do rõ ràng để làm khác thì hỏi user rồi sửa danh sách trong test.
- Ranh giới import do `frontend/.dependency-cruiser.cjs` chặn (`npm run depcruise`, chạy trên CI): không vòng import, chỉ `App.tsx` nạp `pages/` và `player/pages/`, `types/constants/utils/config/routes` không phụ thuộc API/service/UI, `api/services` không phụ thuộc UI, `games/` chỉ dùng thêm `player/theme` và `services/pipeline`, code chạy thật không import test hay devDependency. Luật tầng và vòng chỉ xét import chạy thật (`import type` được phép).
- Đọc/ghi session qua `useAuth()` (từ `AuthContext`), không thao tác trực tiếp `localStorage` ở nơi khác.
- Tailwind v4: cấu hình qua `@tailwindcss/vite` plugin + `@import "tailwindcss"` trong `index.css`. `tailwind.config.js` được nạp qua `@config` — nếu sửa `content` globs thì sửa ở đây.

## Thư viện frontend đã duyệt sẵn

`react-konva`, `howler`, `qrcode.react`, `@stomp/stompjs`, `sockjs-client`, `use-image` (cùng axios, react-router-dom, @tanstack/react-query đã cài). Chỉ hỏi user khi cần thêm thư viện NGOÀI danh sách này.
