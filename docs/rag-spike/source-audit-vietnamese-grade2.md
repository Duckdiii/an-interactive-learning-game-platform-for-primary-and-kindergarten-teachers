# Source audit: Vietnamese Grade 2 draft

> **Kiểm toán SGK CTGDPT 2018**: [[Chương trình GDPT 2018 và Curriculum RAG]] | [[source-audit|Báo cáo tổng hợp]]



## Scope and source

- Scope: `VIETNAMESE / GRADE_2`, outcomes in the Grade 2 table of the Vietnamese language arts (`Ngữ văn`) program.
- Source document: `Thông-tư-32-2018-TT-BGDĐT.pdf`.
- SHA-256: `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.
- PDF length: 1,555 pages.
- Outcome column: PDF pages 78–83, printed pages 22–27, PDFBox region `LEFT`. Page 82 contains the Grade 2/3 transition; page 83 contains the continuation of one Grade 3 control outcome.
- Dataset: `vietnamese-grade2-draft-v1`; 42 primary outcomes, 2 Grade 3 controls, 49 source fragments.

## Verification performed

On 2026-10-31, `scripts/rag-spike.ps1 -Mode Extract -Dataset vietnamese-g2-draft -SkipBuild` verified the source hash and page count, matched all 44 chunks across 49 fragments, and verified six printed-page footers. The report is [vietnamese-grade2-source-verification.json](evidence/vietnamese-grade2-source-verification.json).

Two Grade 2 outcomes cross PDF page boundaries (`vi-g2-018`, `vi-g2-027`) and remain one chunk with fragments from both pages. Two others (`vi-g2-016`, `vi-g2-038`) have source fragments split within one PDF page. `vi-g2-007` is wholly on page 78. The two Grade 3 control outcomes begin in the same YCCĐ column on page 82; one continues onto page 83. Controls are stored for leakage checks and excluded from retrieval.

## Readiness limits

This is source-text verified only. Amendment applicability, independent content review, completeness, a natural-language evaluation set and retrieval quality remain unreviewed. The runner permits this dataset in extraction mode only; it is not published to the runtime catalog and must not be ingested for production.
