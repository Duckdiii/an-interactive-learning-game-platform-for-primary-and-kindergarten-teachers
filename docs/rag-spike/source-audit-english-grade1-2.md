# Source audit: English Grades 1–2 draft

> **Kiểm toán SGK CTGDPT 2018**: [[Chương trình GDPT 2018 và Curriculum RAG]] | [[source-audit|Báo cáo tổng hợp]]



## Scope and source

- Scope: optional English familiarization program for primary Grades 1 and 2; this is separate from mandatory English Grades 3–5.
- Governing curriculum: `Thông tư 32/2018/TT-BGDĐT`, annex “Làm quen Tiếng Anh lớp 1 và lớp 2”. The 6 Grade 1 and 7 Grade 2 end-of-grade outcomes are in the program’s “Yêu cầu cần đạt” section, printed pages 7 and 8.
- Supporting local files: `backend/src/main/resources/curriculum/spike/english-grade1-2/681_BGDDT-GDTH_452292.doc` and `3818_BGDDT-GDTH_574727.doc`. Công văn 681 confirms Grades 1–2 are optional and says instruction must follow the program annex. The two `32_2018_TT-BGDĐT_403454*.doc` files are duplicate Word documents; they are not the PDF required by the extraction contract.
- The candidate program PDF is available at `tmp/curriculum-source.pdf`; it has 1,555 pages and SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`, matching the inventoried hash. A complete PDFBox 3.0.8 scan of all 1,555 pages found the familiarization annex in this exact-hash file.
- Program text was checked against the annex to TT 32/2018. A searchable copy of the same promulgated program is also available at [HCMUE’s copy of the TT 32 PDF](https://hcmue.edu.vn/images/Etep/Tr%E1%BB%B1c%20ti%E1%BA%BFp%203/TT.32.2018-tt-bgddt-%20%20Ban-hanh-chuong-trinh-giao-duc-pho-thong-moi-1.pdf) and [the indexed full text of the annex](https://static3.luatvietnam.vn/genfile/contentmix/2018/12/26/noi-dung-mix-thong-tu-so-32-2018-tt-bgddt-145515.pdf). These references were used for transcription review; the local exact-hash PDF was subsequently scanned and verified directly.

## Draft data

| Dataset | Primary outcomes | Controls | Declared source pages | State |
| --- | ---: | ---: | --- | --- |
| `english-grade1-draft-v1` | 6 Grade 1 | 7 Grade 2 | PDF 1238–1239 / printed 7–8 / `FULL` | PASS: 13/13 fragments including controls |
| `english-grade2-draft-v1` | 7 Grade 2 | 6 Grade 1 | PDF 1238–1239 / printed 7–8 / `FULL` | PASS: 13/13 fragments including controls |

Each primary chunk is one end-of-grade expected outcome. The adjacent grade rows appear only as controls. A full scan matched the requested title/headings and distinctive YCCĐ phrases on candidate pages; every match page (64, 1232, 1235, 1237–1240, 1245, 1248) was rendered and visually inspected. Page 64 is unrelated Vietnamese curriculum text; 1232 is the annex cover; 1235/1237/1240/1245/1248 are context, objectives, education content or implementation sections. PDF pages 1238 and 1239 are the relevant pages, with printed footers 7 and 8. Page 1238 contains Grade 1 outcomes a–b; page 1239 contains Grade 1 outcomes c–e and all Grade 2 outcomes a–g. `FULL` is the verified extraction region. The earlier 1256/1257 mapping was wrong and has been replaced in both datasets. PDFBox extractor verification passed all 13 unique fragments in each dataset file (including controls), with zero manual transcriptions. See `docs/rag-spike/evidence/english-grade1-2-pdf-scan.json` and per-dataset verification evidence.

## Readiness limits

- Independent review passed the 13 outcomes, their grade assignments, and all cross-grade control rows against sections IV.2.1–2.2 of the official program. The review found no fabricated expected-outcome text. This is a source transcription review, not a curriculum expert’s endorsement.
- The source hash, PDF page count, page-to-printed-page mapping, visual page contents, extraction region and all chunks/controls are verified. Both manifests record `PASS_ALL_CHUNKS_AND_CONTROLS`; the dataset remains draft/extraction-only pending evaluation review, and is not in the production catalog.
- Amendment applicability was reviewed on **2026-10-31** against the amendment chain identified in official Government records: TT 20/2021 (effective 2021-08-16), TT 13/2022 (effective 2022-08-03), and TT 17/2025 (effective 2025-09-12). TT 20/2021 concerns Article 3/effective implementation; TT 13/2022 changes the overall program and History program; TT 17/2025 Article 1 enumerates History & Geography, History Grade 10, Geography, and Civic Education. None lists the English familiarization annex/outcomes for Grades 1–2. This is a scoped amendment review, not legal advice or expert pedagogical approval. Sources: [TT 20/2021 official record](https://vanban.chinhphu.vn/default.aspx?docid=203766&pageid=27160), [TT 13/2022 official record](https://vanban.chinhphu.vn/?docid=206343&pageid=27160), [TT 17/2025 official record and attachment](https://vanban.chinhphu.vn/default.aspx?docid=215347&pageid=27160). No later amendment to TT 32 affecting these outcomes was found in the official Government portal search through 2026-10-31. The outcomes remain grounded in the TT 32 annex; Grades 1–2 familiarization is optional and this dataset does not make it a mandatory subject.
- Data audit: 6 Grade 1 and 7 Grade 2 primary outcomes; 13/13 unique primary texts across both grades; 7 and 6 reciprocal cross-grade controls; no duplicate IDs within each dataset. PDFBox verified every source fragment. Topic paths are indexing labels; outcome wording introduces no extra numeric or pedagogical limits beyond the cited source.
- Evaluation-set review and retrieval evaluation are still pending; datasets remain extraction-only and have not been ingested.
- The spike runner exposes both scopes in extraction-only mode. They are not in the production catalog, must not be ingested, and do not enable Grade 1–2 English generation. Detailed scan and extraction evidence: `docs/rag-spike/evidence/english-grade1-2-pdf-scan.json`, `docs/rag-spike/evidence/english-grade1-source-verification.json`, and `docs/rag-spike/evidence/english-grade2-source-verification.json`.
