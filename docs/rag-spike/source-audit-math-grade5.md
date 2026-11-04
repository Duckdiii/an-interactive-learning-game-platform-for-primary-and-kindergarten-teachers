# Source audit: Math Grade 5 draft

> **Kiểm toán SGK CTGDPT 2018**: [[Chương trình GDPT 2018 và Curriculum RAG]] | [[source-audit|Báo cáo tổng hợp]]



## Scope and source

- Scope: `MATH / GRADE_5`, the YCCĐ in the Grade 5 section of the mathematics curriculum.
- Source: `Thông-tư-32-2018-TT-BGDĐT.pdf`, SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.
- Pages containing the in-scope YCCĐ: PDF 206–211, printed pages 40–45, region `RIGHT` (the YCCĐ column).
- Dataset: `math-grade5-draft-v1`; 53 outcomes, 0 controls, 56 source fragments.

## Verification performed

On 2026-10-31, `scripts/rag-spike.ps1 -Mode Extract -Dataset math-g5-draft` checked the source hash and page count, matched 52 outcomes (55 source fragments) with PDFBox in the declared regions, separately recorded the manually transcribed probability outcome, and verified all six printed-page footers. The evidence report is [math-grade5-source-verification.json](evidence/math-grade5-source-verification.json).

The stacked `2/5` fraction in `math-g5-053` on PDF page 211 is preserved in `text-transcriptions.jsonl` because PDFBox separates the numerator and denominator glyphs. It is reported as a manual transcription, not a PDFBox-verified outcome. The rendered pages 206–211 were inspected to check the grade boundary, outcome column, page continuations, and the stacked fraction. PDF page 212 contains activities after the Grade 5 YCCĐ section and is outside this dataset's fragment set.

## Readiness limits

The dataset remains extraction-only pending independent review and later curriculum applicability/evaluation decisions. It has not been ingested or published. This audit only claims that the transcribed fragments match the supplied PDF; it does not claim that the dataset is a complete or approved production curriculum.
