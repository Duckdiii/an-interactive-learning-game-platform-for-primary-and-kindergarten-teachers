# Source audit: Vietnamese Grade 4 draft

## Scope and source

- Scope: `VIETNAMESE / GRADE_4`, the YCCĐ in the Grade 4 section of the supplied curriculum PDF.
- Source: `Thông-tư-32-2018-TT-BGDĐT.pdf`, SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.
- Pages: PDF 87–91, printed pages 31–35, region `LEFT` (the YCCĐ column).
- Dataset: `vietnamese-grade4-draft-v1`; 42 Grade 4 outcomes, 2 Grade 3 controls, 45 source fragments.

## Verification performed

On 2026-10-31, `scripts/rag-spike.ps1 -Mode Extract -Dataset vietnamese-g4-draft` checked the source hash and page count, matched all 44 chunks across 45 source fragments, and verified all five printed-page footers. The evidence report is [vietnamese-grade4-source-verification.json](evidence/vietnamese-grade4-source-verification.json).

Rendered pages 87–91 were inspected to confirm the Grade 4 section, YCCĐ column, the outcome continuing from page 87 to 88 (`vi-g4-005`), and the two Grade 3 control outcomes at the top of page 87. The Grade 5 section begins after Grade 4 on page 91 and was not included. No manual transcription fallback was needed.

## Readiness limits

The dataset remains extraction-only pending independent review and later curriculum applicability/evaluation decisions. Controls are stored for leakage checks and excluded from retrieval. Nothing has been ingested or published. This audit claims source text matches the supplied PDF; it does not claim production approval.
