---
paths:
  - "frontend/src/games/**"
---

# Quy ước UX cho Canvas Engine (đối tượng: trẻ mầm non/lớp 1)

- Touch target tối thiểu 64px.
- Trả lời sai: KHÔNG dùng màu đỏ gắt/rung mạnh/âm thanh phạt. Dùng phản hồi nhẹ nhàng (rung nhẹ, âm thanh trung tính) và ưu tiên chỉ luôn đáp án đúng để trẻ học được.
- Audio prompt luôn có nút "nghe lại" không giới hạn số lần.
- Renderer mới phải hỗ trợ prop `mode: 'preview' | 'play' | 'review'` (`preview` cho Workspace Editor live preview tự so đáp án cục bộ; `play` cho học sinh chơi thật, không tự lộ đáp án đúng, báo kết quả lên component cha qua callback `onAnswered` (bắt buộc ở mode này và PHẢI trả `boolean` hoặc `Promise<boolean>` là đúng/sai thật do Backend chấm; kiểu prop là union theo `mode` nên thiếu là lỗi lúc build); `review` xem lại câu đã trả lời, khoá sẵn, nhận thêm prop `selectedOptionId` cho biết đáp án đã chọn trước đó).
- Renderer nhiều phần tử (Matching, Memory Card — cùng nhóm `PairMatch`, xem ánh xạ trong `CLAUDE.md`) nộp **một lần** sau khi trẻ hoàn thành cả màn, không nộp từng lượt chạm. Payload khác nhau giữa hai loại: Matching là `matches: [{ leftPairId, rightPairId }]`, Memory Card là `matchedPairIds` + `flips`. `MatchingRenderer` ở mode `play` nhận câu hỏi dạng học sinh (`MatchingStudentQuestion`, id mờ, cột đã do Backend xáo, KHÔNG xáo lại ở client); callback trả `MatchingAnswerResult` (`isCorrect` + `correctAnswer.matches` nếu có) để hiện đáp án đúng khi trẻ sai.
- Renderer mới dùng lại phần chung trong `frontend/src/games/common/` (`ResponsiveStage`, `QuestionAudioButton`, `useQuestionAudio`, `useIllustration`/`QuestionIllustration`, `playSound`, `useFeedback`, `measureWrappedTextHeight`) thay vì viết lại. Bố cục tính bằng hàm thuần có test duyệt mọi tổ hợp (`computeQuizLayout`, `computeMatchingLayout`) để không phần nào đè lên phần khác; logic trạng thái tách thành reducer/hàm thuần để test được trong jsdom (không có Canvas).
