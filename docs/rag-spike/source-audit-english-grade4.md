# Source audit: English Grade 4 draft

## Scope and source

- Scope: `ENGLISH / GRADE_4`, language skills in the supplied curriculum PDF.
- Source: `Thông-tư-32-2018-TT-BGDĐT.pdf`, SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.
- Pages: PDF 1277–1279, printed pages 28–30. The skills column is extracted within grade-specific vertical bands (`SKILLS_G3`, `SKILLS_G4`); three Grade 3 writing outcomes on page 1277 are controls.
- Dataset: `english-grade4-draft-v1`; 14 Grade 4 outcomes, 3 Grade 3 controls, 19 source fragments.

## Verification performed

On 2026-10-31, `scripts/rag-spike.ps1 -Mode Extract -Dataset english-g4-draft` checked the source hash and page count, matched all 17 chunks across 19 source fragments, and verified all three printed-page footers. The evidence report is [english-grade4-source-verification.json](evidence/english-grade4-source-verification.json).

Rendered pages 1277–1279 were inspected to confirm the skill column, Grade 4 start, three Grade 3 controls, and Grade 5 boundary. The outcomes `en-g4-004` and `en-g4-013` continue across page boundaries and retain fragments from each page. Page 1279's `SKILLS_G4` band covers the Grade 4 writing continuation above Grade 5. No manual transcription fallback was needed.

## Readiness limits

The dataset remains extraction-only pending independent review and later curriculum applicability/evaluation decisions. Controls are stored for leakage checks and excluded from retrieval. Nothing has been ingested or published. This audit claims source text matches the supplied PDF; it does not claim production approval.
