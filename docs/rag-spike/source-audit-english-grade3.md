# Source audit: English Grade 3 draft

## Scope and source

- Scope: `ENGLISH / GRADE_3`, language-skill outcomes (listening, speaking, reading and writing).
- Source document: `Thông-tư-32-2018-TT-BGDĐT.pdf`.
- SHA-256: `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.
- PDF length: 1,555 pages.
- Source: PDF pages 1275–1277, printed pages 26–28. Grade 3 outcomes use the `SKILLS` column; three adjacent Grade 4 outcomes on page 1277 use `SKILLS_CONTROL` as controls.
- Dataset: `english-grade3-draft-v1`; 15 primary outcomes, 3 controls, 20 page fragments. Two Grade 3 outcomes span page boundaries and each use two fragments.

## Verification performed

On 2026-10-31, `scripts/rag-spike.ps1 -Mode Extract -Dataset english-g3-draft` verified the source hash, page count and printed-page footer for each page. PDFBox matched all 15 Grade 3 outcomes and all three Grade 4 controls across 20 declared fragments. The verification report is [english-grade3-source-verification.json](evidence/english-grade3-source-verification.json).

The PDF has a four-column table. The extractor selects glyphs from the language-skills x-range and page-specific vertical bands, so the Grade 3 continuation on page 1277 does not include the Grade 4 rows below it. A separate band extracts the three Grade 4 controls. The regression test checks that text in the adjacent language-knowledge column is excluded. Several outcomes continue across page boundaries and remain one chunk with multiple source fragments.

## Readiness limits

This confirms that the listed chunks match the declared source pages, printed-page footers and table regions. It does not claim corpus completeness or amendment applicability review. Evaluation remains pending. This remains extraction-only and is not runtime-published or eligible for production ingest.
