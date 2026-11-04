# Source audit: Vietnamese Grade 5 draft

> **Kiểm toán SGK CTGDPT 2018**: [[Chương trình GDPT 2018 và Curriculum RAG]] | [[source-audit|Báo cáo tổng hợp]]



## Scope and source

- Scope: `VIETNAMESE / GRADE_5`, the YCCĐ in the Grade 5 section of the supplied curriculum PDF.
- Source: `Thông-tư-32-2018-TT-BGDĐT.pdf`, SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.
- Pages: PDF 91–96, printed pages 35–40, region `LEFT` (the YCCĐ column). Page 91 contains the two Grade 4 controls immediately before the Grade 5 section.
- Dataset: `vietnamese-grade5-draft-v1`; 40 Grade 5 outcomes, 2 Grade 4 controls, 45 source fragments.

## Verification performed

On 2026-10-31, `scripts/rag-spike.ps1 -Mode Extract -Dataset vietnamese-g5-draft` checked the source hash and page count, matched all 42 chunks across 45 source fragments, and verified all six printed-page footers. The evidence report is [vietnamese-grade5-source-verification.json](evidence/vietnamese-grade5-source-verification.json).

Rendered pages 91–96 were inspected to confirm the Grade 5 section and the YCCĐ column. The cross-page outcomes `vi-g5-012`, `vi-g5-022`, and `vi-g5-039` retain their page-specific source fragments. The Grade 6 heading begins on page 96 after the Grade 5 outcome; Grade 6 material was excluded. No manual transcription fallback was needed.

## Readiness limits

The dataset remains extraction-only pending independent review and later curriculum applicability/evaluation decisions. Controls are stored for leakage checks and excluded from retrieval. Nothing has been ingested or published. This audit claims source text matches the supplied PDF; it does not claim production approval.
