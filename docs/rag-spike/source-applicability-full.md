# Source applicability — three primary subjects

**Audit cut:** 2026-10-12  
**Source:** user-supplied TT32/2018 PDF, 1,555 PDF pages; SHA-256 `cd59f67d72fceb17902be95000e9c49f00a2c389d4ba617264bbb27db2472013`.  
**Official publication:** [TT32/2018, Government document record](https://vanban.chinhphu.vn/?docid=195209&pageid=27160).

This audit sets the target to 15 primary-school curriculum scopes: `MATH`, `VIETNAMESE`, and `ENGLISH` across grades 1–5. These are subject × grade/program scopes. The 10 game types form a separate generation matrix; they do not increase the curriculum-scope denominator. Kindergarten development areas and preschool English are outside this target. The corpus now contains 497 primary outcomes and 61 cross-scope controls (558 chunks); all 558 have source text/page verification and are indexed. Semantic/pedagogical and teacher reviews remain open.

## Exact source table pages and processing state

PDF page indices below are one-based. The ending page is the page immediately before the next grade heading or the end of the grade table. All listed source pages are in the PDFBox raw extraction evidence file; text extraction does not mean a page has been parsed into a source-verified outcome chunk.

| Scope | Program variant | TT32 PDF pages | Source classification | Outcome chunks + controls | Ingest/eval state |
|---|---|---:|---|---|---|
| MATH GRADE_1 | Required primary Math | 187–189 | Local PDF SHA verified | 23 outcomes, plus 5 separately labelled controls; source text/region verified for all 28 | Existing dataset; exploratory + independent holdout (FAIL near-miss); 6/10 strategy pairs captured |
| MATH GRADE_2 | Required primary Math | 190–194 | Same verified TT32 PDF | 43 outcomes + 4 controls; 47/47 source verified | Indexed; exploratory and holdout ran, both retain separate gates |
| MATH GRADE_3 | Required primary Math | 195–199 | Same verified TT32 PDF | 51 outcomes + 4 controls; 55/55 source verified | Indexed; exploratory and holdout ran, both FAIL |
| MATH GRADE_4 | Required primary Math | 200–205 | Same verified TT32 PDF | 53 outcomes + 4 controls; 57/57 source verified | Indexed; retrieval/holdout NOT_RUN (Gemini daily quota) |
| MATH GRADE_5 | Required primary Math | 206–211 | Same verified TT32 PDF | 53 outcomes + 4 controls; 57/57 source verified | Indexed; retrieval/holdout NOT_RUN (Gemini daily quota) |
| VIETNAMESE GRADE_1 | Required primary Vietnamese | 74–77 | Same verified TT32 PDF; appendix title is “Ngữ văn”, primary program is named Tiếng Việt | 36 outcomes + 4 controls; 40/40 source verified | Indexed; retrieval/holdout NOT_RUN (Gemini daily quota) |
| VIETNAMESE GRADE_2 | Required primary Vietnamese | 78–82 | Same verified TT32 PDF | 42 outcomes + 4 controls; 46/46 source verified | Indexed; retrieval/holdout NOT_RUN (Gemini daily quota) |
| VIETNAMESE GRADE_3 | Required primary Vietnamese | 82–87 | Same verified TT32 PDF | 45 outcomes + 4 controls; 49/49 source verified | Indexed; exploratory 10/10 positive, 2/3 negative rejection; FAIL |
| VIETNAMESE GRADE_4 | Required primary Vietnamese | 87–91 | Same verified TT32 PDF | 42 outcomes + 4 controls; 46/46 source verified | Indexed; exploratory 10/10 positive, 2/3 negative rejection; FAIL |
| VIETNAMESE GRADE_5 | Required primary Vietnamese | 92–96 | Same verified TT32 PDF | 41 outcomes + 4 controls; 45/45 source verified | Indexed; exploratory 10/10 positive, 2/3 negative rejection; FAIL |
| ENGLISH GRADE_1 | Optional “Làm quen Tiếng Anh” program | 1241–1243 | Same verified TT32 PDF | 14 outcomes + 4 controls; 18/18 source verified | Indexed; exploratory 10/10 positive, 3/3 negative rejection; PASS |
| ENGLISH GRADE_2 | Optional “Làm quen Tiếng Anh” program | 1243–1244 | Same verified TT32 PDF | 13 outcomes + 4 controls; 17/17 source verified | Indexed; exploratory 10/10 positive, 3/3 negative rejection; PASS |
| ENGLISH GRADE_3 | Required English Foreign Language 1 | 1275–1277 | Same verified TT32 PDF | 15 outcomes + 4 controls; 19/19 source verified | Indexed; retrieval/holdout NOT_RUN (Gemini daily quota) |
| ENGLISH GRADE_4 | Required English Foreign Language 1 | 1277–1279 | Same verified TT32 PDF | 14 outcomes + 4 controls; 18/18 source verified | Indexed; retrieval/holdout NOT_RUN (Gemini daily quota) |
| ENGLISH GRADE_5 | Required English Foreign Language 1 | 1279–1280 | Same verified TT32 PDF | 12 outcomes + 4 controls; 16/16 source verified | Indexed; retrieval/holdout NOT_RUN (Gemini daily quota) |

All 15 rows now have source-backed outcome chunks and cross-scope controls. The verifier matched 558/558 text fragments/pages against the official PDF; pages with visual transcriptions have retained rendered evidence. This confirms provenance, not semantic atomicity, pedagogical limits, or teacher acceptance. The vectors use one pinned Gemini embedding model and were counted in Supabase at 558/558; repeating ingest wrote 0 and skipped 558.

## Amendment applicability

| Instrument | Finding for the three target subjects | Use decision |
|---|---|---|
| TT20/2021 | The supplied amendment concerns an Informatics implementation fallback in lower-secondary education. It does not amend Math, Vietnamese or English primary outcome tables. | Record as applicability review only; do not append to the three subject corpora. [Official legal database](https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=150034). |
| TT13/2022 | The changes address the General Program and high-school History; no grade 1–5 outcomes in these three programs were found amended. | Record as applicability review only. [Government publication](https://vanban.chinhphu.vn/?docid=206343&pageid=27160). |
| TT17/2025 | The amendment names primary History and Geography grades 4–5 and other secondary content. History and Geography are not among the three enum subjects. | Not applicable to these 15 scope rows; keep out of their retrieval corpora. [Official Government PDF](https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/9/17-bgddt.pdf). |

These decisions do not establish that TT32 is the latest applicable instrument for subjects outside the three-scope target. The full PDF contains many other curriculum programs, but only the three selected programs and their outcome/content tables belong in this RAG corpus.

## Extraction and review evidence

- PDFBox 3.0.8 extracted 58 unique pages covered by the 15 grade tables from the verified TT32 source; raw page evidence is in `evidence/source-pages/tt32-2018-primary-scopes-pdfbox.txt` and rendered pages are linked by scope audit. Page ranges vary for continuation rows, so see the per-scope manifests for exact page indices.
- Current source evidence covers all 15 scopes (558/558 fragments matched). Some fragments required visual transcription from rendered column/table regions. These are provenance checks, not semantic or pedagogical approval.
- One Gemini advisory run reviewed those 28 Math G1/control chunks. Its result is not a gold label, source approval or teacher review.
- No outcomes were authored from memory or generated by Gemini. Retrieval exploratory ran on 8/15 scopes (80/80 positive Hit@3, 19/24 negative rejection, 5 false acceptances, zero leakage); seven remain NOT_RUN after the Gemini free-tier daily embedding limit of 1,000 requests was exhausted. Holdout remains limited to MATH G1–G3 and fails all three; generation end-to-end and semantic/pedagogical review remain NOT_RUN.

Detailed coverage is in [`results/scope-coverage.csv`](results/scope-coverage.csv); the aggregate status and score investigation are in [`results/curriculum-rag-summary.md`](results/curriculum-rag-summary.md).
