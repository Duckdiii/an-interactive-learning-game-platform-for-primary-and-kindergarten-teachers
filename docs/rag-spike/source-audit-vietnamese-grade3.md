# Source audit: Vietnamese Grade 3 draft

> **Kiểm toán SGK CTGDPT 2018**: [[Chương trình GDPT 2018 và Curriculum RAG]] | [[source-audit|Báo cáo tổng hợp]]



## Scope and source

- Scope: `VIETNAMESE / GRADE_3`, the YCCĐ in the Grade 3 section of the supplied curriculum PDF.
- Source: `Thông-tư-32-2018-TT-BGDĐT.pdf`, SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.
- Pages: PDF 82–87, printed pages 26–31, region `LEFT` (the YCCĐ column).
- Dataset: `vietnamese-grade3-draft-v1`; 45 Grade 3 outcomes, 2 Grade 4 controls, 50 source fragments.

## Verification performed

On 2026-10-31, `scripts/rag-spike.ps1 -Mode Extract -Dataset vietnamese-g3-draft` checked the source hash and page count, matched all 47 chunks in their declared regions (45 outcomes and 2 controls), and verified all six printed-page footers. The evidence report is [vietnamese-grade3-source-verification.json](evidence/vietnamese-grade3-source-verification.json).

The two Grade 4 controls come from the Grade 4 section printed on the same PDF page 87 as the final Grade 3 outcomes. Rendered pages 82–87 were inspected to confirm section boundaries, the YCCĐ column, page continuations, and those controls. No manual transcription fallback was needed.

## Readiness limits

The dataset remains extraction-only pending independent review and later curriculum applicability/evaluation decisions. Controls are stored for leakage checks and excluded from retrieval. Nothing has been ingested or published. This audit claims source text matches the supplied PDF; it does not claim production approval.
