# WebSocket Message Format v1.0.0

## 1. Tổng quan & Kết nối

Giao thức thời gian thực (Realtime) của hệ thống phục vụ phòng thi đấu lớp học (Live Arena) sử dụng **STOMP over SockJS**.

- **Broker Endpoint:** `/ws/live-arena`
  - URL đầy đủ (giáo viên): `${WS_BASE_URL}/ws/live-arena?token={accessToken}`
  - URL đầy đủ (học sinh): `${WS_BASE_URL}/ws/live-arena` kèm header STOMP `X-Participant-Id: {participantId}`
- **Prefix gửi lệnh (Client ➔ Server):** `/app`
- **Prefix nhận broadcast chung (Server ➔ All Clients):** `/topic`
- **Prefix nhận thông điệp cá nhân (Server ➔ Single Client):** `/user/queue`
- **Chính sách tự động kết nối lại:** Reconnect delay khuyến nghị `3000ms`.

---

## 2. Kênh Client phát (Application Destinations - `/app/...`)

### 2.1 Giáo viên loại học sinh khỏi phiên
- **Đích:** `/app/session/{sessionId}/kick/{participantId}`
- **Ai gửi:** Giáo viên (Host của session).
- **Thân message:** `{}` (hoặc JSON object rỗng).
- **Phân quyền & Ràng buộc bảo mật:**
  - Chỉ đúng giáo viên là Host của `sessionId` mới có quyền gửi lệnh này.
  - Nếu tài khoản gửi không phải Host, Backend ném `AccessDeniedException` (HTTP 403 / STOMP error: *"Chỉ giáo viên mới được loại học sinh khỏi phiên"*).
- **Tác động phía Server:**
  1. Gỡ `participantId` khỏi `SessionParticipantRegistry`.
  2. Bắn thông báo riêng tới `/user/{participantId}/queue/kicked` để học sinh tự ngắt kết nối.
  3. Broadcast danh sách cập nhật tới `/topic/session/{sessionId}/participants`.

---

## 3. Kênh Server phát chung (Broadcast Topics - `/topic/...`)

### 3.1 Danh sách học sinh tham gia
- **Đích:** `/topic/session/{sessionId}/participants`
- **Ai nhận:** Cả Màn hình chiếu (Presentation Screen) và Màn hình điều khiển giáo viên (Teacher Control Panel).
- **Thời điểm phát:** Khi có học sinh mới tham gia, học sinh mất kết nối, hoặc học sinh bị kick.
- **Payload:**
```json
{
  "participants": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Bé Lan",
      "connected": true
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "Bé Hùng",
      "connected": false
    }
  ]
}
```

### 3.2 Trạng thái phiên đấu
- **Đích:** `/topic/session/{sessionId}/state`
- **Ai nhận:** Tất cả client tham gia phiên.
- **Payload:**
```json
{
  "phase": "WAITING_ROOM"
}
```
*(Các phase hợp lệ: `WAITING_ROOM`, `QUESTION`, `LEADERBOARD`, `ENDED`)*

### 3.3 Câu hỏi hiện tại
- **Đích:** `/topic/session/{sessionId}/question`
- **Ai nhận:** Tất cả client trong phòng.
- **Payload:**
```json
{
  "question": {
    "id": "q1",
    "questionText": "Đâu là quả táo?",
    "sceneImageUrl": "https://cdn.example.com/apple.png",
    "timeLimitSeconds": 30
  }
}
```

### 3.4 Bảng xếp hạng
- **Đích:** `/topic/session/{sessionId}/leaderboard`
- **Ai nhận:** Màn hình chiếu và màn hình giáo viên.
- **Payload:**
```json
{
  "entries": [
    { "rank": 1, "name": "Bé Lan", "score": 100 },
    { "rank": 2, "name": "Bé Hùng", "score": 85 }
  ]
}
```

### 3.5 Trạng thái đã trả lời của học sinh (MỚI)
- **Đích:** `/topic/session/{sessionId}/answer-status`
- **Ai nhận:** Màn hình điều khiển giáo viên (`TeacherControlPanel`).
- **Thời điểm phát:** Khi Backend nhận `POST /sessions/{sessionId}/interactions` từ học sinh.
- **Payload:**
```json
{
  "participantId": "550e8400-e29b-41d4-a716-446655440000",
  "answered": true
}
```
> **Ghi chú bảo mật & tối ưu payload:** Kênh này KHÔNG gửi kèm nội dung câu trả lời hoặc tính đúng/sai của câu trả lời, chỉ gửi cờ `answered: true` để tránh lộ đáp án trước khi kết thúc câu, đồng thời giữ payload cực nhẹ cho mạng lớp học.

---

## 4. Kênh Server phát riêng (User Queues - `/user/queue/...`)

### 4.1 Thông báo bị loại khỏi phiên (MỚI)
- **Đích:** `/user/queue/kicked` (gửi trực tiếp tới session của học sinh bị kick).
- **Ai nhận:** Thiết bị của học sinh bị loại.
- **Hành vi phía Client học sinh:**
  - Hiển thị thông báo: *"Con đã được giáo viên đưa ra khỏi phòng chơi"*.
  - Ngắt kết nối WebSocket STOMP ngay lập tức (`client.deactivate()`).
  - Điều hướng trở về trang chủ hoặc màn hình nhập mã PIN.
- **Payload:**
```json
{
  "sessionId": "session-123"
}
```
