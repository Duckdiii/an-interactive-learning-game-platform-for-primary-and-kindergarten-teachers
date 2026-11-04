# Source audit: Math Grade 4 draft

> **Kiểm toán SGK CTGDPT 2018**: [[Chương trình GDPT 2018 và Curriculum RAG]] | [[source-audit|Báo cáo tổng hợp]]



## Scope and source

- Scope: `MATH / GRADE_4`, the YCCĐ in the Grade 4 section of the mathematics curriculum.
- Source: `Thông-tư-32-2018-TT-BGDĐT.pdf`, SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.
- Pages: PDF 200–205, printed pages 34–39, region `RIGHT` (the YCCĐ column).
- Dataset: `math-grade4-draft-v1`; 53 outcomes, 0 controls, 57 source fragments.

## Verification performed

On 2026-10-31, `scripts/rag-spike.ps1 -Mode Extract -Dataset math-g4-draft` checked the source hash and page count, matched all 53 outcome chunks across 57 fragments in their declared PDF regions, and verified all six printed-page footers. The evidence report is [math-grade4-source-verification.json](evidence/math-grade4-source-verification.json).

The rendered PDF pages 200–205 were inspected to confirm the Grade 4 section boundary, column layout, and outcomes that cross page breaks. The cross-page chunks are `math-g4-006`, `math-g4-027`, `math-g4-036`, and `math-g4-046`; each keeps one outcome and records its fragments on the corresponding pages. No manual transcription fallback was needed.

## Readiness limits

The dataset remains extraction-only pending independent review and later curriculum applicability/evaluation decisions. It has not been ingested or published. This audit only claims that the transcribed fragments match the supplied PDF; it does not claim that the dataset is a complete or approved production curriculum.
