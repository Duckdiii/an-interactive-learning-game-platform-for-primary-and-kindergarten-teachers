# Source audit: English Grade 5 draft

> **Kiểm toán SGK CTGDPT 2018**: [[Chương trình GDPT 2018 và Curriculum RAG]] | [[source-audit|Báo cáo tổng hợp]]



## Scope and source

- Scope: `ENGLISH / GRADE_5`, language skills in the supplied curriculum PDF.
- Source: `Thông-tư-32-2018-TT-BGDDT.pdf`, SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.
- Pages: PDF 1278–1281, printed pages 29–32. The Grade 4 writing controls start on page 1278 and continue on page 1279; Grade 5 skills occupy the grade-scoped bands on pages 1279–1281.
- Dataset: `english-grade5-draft-v1`; 15 Grade 5 outcomes, 2 Grade 4 controls, 18 source fragments.

## Verification performed

On 2026-10-31, `scripts/rag-spike.ps1 -Mode Extract -Dataset english-g5-draft` checked the source hash and page count and matched 16 of 17 chunks across 18 source fragments. PDFBox matched 14 primary outcomes and both controls. It reads the initial `Đ` in `en-g5-012` as `Ð`; the visual source was checked and the correct text is recorded in `text-transcriptions.jsonl`, declared in the manifest, and counted separately as one manual transcription. All four printed-page footers passed. The evidence report is [english-grade5-source-verification.json](evidence/english-grade5-source-verification.json).

Rendered pages 1279–1281 were inspected to confirm the Grade 5 start, skills column, and Grade 6 boundary. Page 1278 was also checked for the continuing Grade 4 control outcome. Grade-specific vertical bands exclude neighboring grade tables. No other manual fallback was needed.

## Readiness limits

The dataset remains extraction-only pending independent review and later curriculum applicability/evaluation decisions. Controls are stored for leakage checks and excluded from retrieval. Nothing has been ingested or published. This audit claims source text matches the supplied PDF; it does not claim production approval.
