# Tài liệu Curriculum RAG dạng văn bản

Toán, Tiếng Việt và Tiếng Anh lớp 1–5. Tất cả tài liệu ở đây là UTF-8 có thể đọc, sao chép và tìm kiếm. PDF gốc được giữ làm nguồn; không dùng PNG/ảnh làm tài liệu RAG.

| Môn | Lớp | Outcome chunks | Nội dung và trang nguồn |
|---|---|---:|---|
| MATH | GRADE_1 | 23 | [math-grade1](math-grade1.md) |
| MATH | GRADE_2 | 43 | [math-grade2](math-grade2.md) |
| MATH | GRADE_3 | 51 | [math-grade3](math-grade3.md) |
| MATH | GRADE_4 | 53 | [math-grade4](math-grade4.md) |
| MATH | GRADE_5 | 53 | [math-grade5](math-grade5.md) |
| VIETNAMESE | GRADE_1 | 36 | [vietnamese-grade1](vietnamese-grade1.md) |
| VIETNAMESE | GRADE_2 | 42 | [vietnamese-grade2](vietnamese-grade2.md) |
| VIETNAMESE | GRADE_3 | 45 | [vietnamese-grade3](vietnamese-grade3.md) |
| VIETNAMESE | GRADE_4 | 42 | [vietnamese-grade4](vietnamese-grade4.md) |
| VIETNAMESE | GRADE_5 | 41 | [vietnamese-grade5](vietnamese-grade5.md) |
| ENGLISH | GRADE_1 | 14 | [english-grade1-familiarization](english-grade1-familiarization.md) |
| ENGLISH | GRADE_2 | 13 | [english-grade2-familiarization](english-grade2-familiarization.md) |
| ENGLISH | GRADE_3 | 15 | [english-grade3-foreign-language](english-grade3-foreign-language.md) |
| ENGLISH | GRADE_4 | 14 | [english-grade4-foreign-language](english-grade4-foreign-language.md) |
| ENGLISH | GRADE_5 | 12 | [english-grade5-foreign-language](english-grade5-foreign-language.md) |

`raw-pages/` chứa bản trích xuất PDFBox nguyên trạng. Các bản chép phân số/ký hiệu được đối chiếu riêng trong `backend/src/main/resources/curriculum/spike/text-transcriptions.jsonl`, có hash nguồn, trang, người đối chiếu và ngày. Việc đối chiếu này do AI thực hiện, không phải phê duyệt sư phạm.

Tạo lại: chạy `scripts/rag-spike.ps1 -Mode Extract` với PDF nguồn, sau đó `node scripts/export-rag-text.mjs`. Script dừng nếu bất kỳ scope nào chưa được xác minh đầy đủ.
