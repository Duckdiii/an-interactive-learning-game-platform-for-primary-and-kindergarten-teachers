# Source audit: Math Grade 3 draft

> **Kiểm toán SGK CTGDPT 2018**: [[Chương trình GDPT 2018 và Curriculum RAG]] | [[source-audit|Báo cáo tổng hợp]]



## Scope and source

- Scope: `MATH / GRADE_3`, the outcomes under the Grade 3 section of the mathematics curriculum.
- Source: `Thông-tư-32-2018-TT-BGDĐT.pdf`.
- SHA-256: `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.
- PDF length: 1,555 pages.
- Pages: PDF 195–199, printed 29–33, `RIGHT` outcome column.
- Dataset: `math-grade3-draft-v1`; 51 outcomes, 0 controls, 51 source fragments.

## Verification performed

On 2026-10-31, `scripts/rag-spike.ps1 -Mode Extract -Dataset math-g3-draft` checked the PDF hash and page count, matched 49 outcome fragments with PDFBox, and checked all five printed-page footers. The evidence report is [math-grade3-source-verification.json](evidence/math-grade3-source-verification.json).

The two fraction outcomes on PDF page 197 (`math-g3-022` and `math-g3-023`) are recorded in `text-transcriptions.jsonl`. PDFBox reads their stacked numerator/denominator glyphs as separate number sequences, so the report lists these two separately as manual transcriptions and does not count them among the 49 PDFBox matches. Their wording was compared visually against page 197 on 2026-10-31. The fallback file is declared in the manifest and checked against the chunk and source-fragment coordinates.

## Readiness limits

The dataset remains extraction-only. Amendment applicability and an evaluation set are pending; no rows have been ingested or published. The source transcription is limited to this PDF and does not claim broader curriculum review.
