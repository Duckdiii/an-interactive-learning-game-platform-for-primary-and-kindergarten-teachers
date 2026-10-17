# Khu thử nghiệm (nhánh `experiment/themes-and-new-games`)

Không phải tính năng chính thức; xem `docs/experiments/themes-new-games-plan.md`.

- Chạy: `npm run dev`, mở `/dev/experiments`. Bản build thường không chứa mã này; build riêng để đo: `VITE_EXPERIMENTS=1 npm run build`.
- Dữ liệu mẫu nằm cục bộ trong thư mục này, không gọi mạng, không dùng tài nguyên ngoài (hình là SVG tự vẽ, âm thanh tổng hợp bằng Web Audio).
- Loại game thử nghiệm đăng ký ở `registry.ts`, KHÔNG thêm vào `GAME_TYPES` và không đổi DSL 1.0.0.
