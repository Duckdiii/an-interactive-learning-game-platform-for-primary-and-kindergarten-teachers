# Source audit: Vietnamese Grade 1 draft

> **Kiểm toán SGK CTGDPT 2018**: [[Chương trình GDPT 2018 và Curriculum RAG]] | [[source-audit|Báo cáo tổng hợp]]



## Scope and source

- Subject/scope: `VIETNAMESE / GRADE_1`; curriculum source section is the Grade 1 outcome table in the Vietnamese language arts (`Ngữ văn`) program.
- Source document: `Thông-tư-32-2018-TT-BGDĐT.pdf`.
- SHA-256: `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.
- PDF length: 1,555 pages.
- Outcome column: PDF pages 74–77, printed pages 18–21, PDFBox region `LEFT`.
- Dataset: `vietnamese-grade1-draft-v1`; 36 primary outcomes, no controls yet.

## Verification performed

On 2026-10-31, `scripts/rag-spike.ps1 -Mode Extract -Dataset vietnamese-g1-draft -SkipBuild` checked the source hash and page count and verified all 36 chunk fragments against their declared PDF page and region. The machine-readable result is [vietnamese-grade1-source-verification.json](evidence/vietnamese-grade1-source-verification.json).

The outcome spanning PDF pages 74–75 and the outcome spanning pages 76–77 each remain one chunk with two source fragments. No automatic character-window chunking was used.

## Readiness limits

This is source-text verified, not curriculum-expert approved. The applicability of amendments to this subject/grade, the completeness of the 36-item transcription, control examples, a natural-language evaluation set and retrieval quality remain unreviewed. The runner permits this dataset in extraction mode only; it is not published to the runtime catalog and must not be ingested for production.
