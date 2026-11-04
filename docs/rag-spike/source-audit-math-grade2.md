# Source audit: Math Grade 2 draft

> **Kiểm toán SGK CTGDPT 2018**: [[Chương trình GDPT 2018 và Curriculum RAG]] | [[source-audit|Báo cáo tổng hợp]]



## Scope and source

- Scope: `MATH / GRADE_2`, outcomes in the Grade 2 table of the Mathematics program.
- Source document: `Thông-tư-32-2018-TT-BGDĐT.pdf`.
- SHA-256: `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.
- PDF length: 1,555 pages.
- Outcome column: PDF pages 190–194, printed pages 24–28, PDFBox region `RIGHT`.
- Dataset: `math-grade2-draft-v1`; 43 primary outcomes, no controls yet.

## Verification performed

On 2026-10-31, `scripts/rag-spike.ps1 -Mode Extract -Dataset math-g2-draft -SkipBuild` verified source hash and page count and matched all 43 fragments to the declared page and region. The report is [math-grade2-source-verification.json](evidence/math-grade2-source-verification.json).

The Grade 2 outcome about measuring capacity spans PDF pages 192–193 and remains one chunk with two source fragments. Page 190 also contains Grade 1 practical-activity content before the Grade 2 heading; the draft includes only fragments from the Grade 2 table.

## Readiness limits

This is source-text verified only. Amendment applicability, curriculum-expert review, completeness, controls from adjacent grades, a natural-language evaluation set and retrieval quality remain unreviewed. The runner permits this dataset in extraction mode only; it is not published to the runtime catalog and must not be ingested for production.
