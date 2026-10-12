# Curriculum RAG flow

```mermaid
flowchart TD
    A[Official curriculum sources] --> B[Source inventory and version mapping]
    B --> C[PDF/DOC extraction with page provenance]
    C --> D[Candidate segmentation by outcome or expected result]
    D --> E[Assess every chunk: ID, scope, topic, text hash, source pages]
    E --> F[Verify each fragment against its source PDF page and table region]
    F --> G[AI advisory review per chunk: atomicity, scope, limits]
    G --> H[Teacher review and corrections]
    H --> I{Source verified and human review accepted?}
    I -- No --> J[Hold out of production corpus; record reason per chunk]
    I -- Yes --> K[Versioned reviewed corpus]
    K --> L[Embedding with pinned model and dimension]
    L --> M[Idempotent pgvector indexing]
    M --> N[Retrieval benchmark: positive, near-miss, scope controls]
    N --> O{Scope meets gates?}
    O -- No --> P[Mark failed or not validated; revise data/config]
    O -- Yes --> Q[Enable scope in curriculum catalog]

    REQ[Teacher request: topic + subject/domain + grade/age] --> RESOLVE[Resolve supported curriculum scope]
    Q --> RESOLVE
    RESOLVE --> FILTER[Filter by education level, subject/domain, grade/age, content type, dataset/version, embedding model]
    FILTER --> RETRIEVE[Retrieve top-k evidence and citations]
    RETRIEVE --> SUFFICIENT{Evidence sufficient?}
    SUFFICIENT -- No --> U[Return insufficient evidence; do not call Gemini]
    SUFFICIENT -- Retrieval error --> V[Return service unavailable; do not call Gemini]
    SUFFICIENT -- Yes --> PROMPT[Build game strategy prompt with evidence]
    PROMPT --> GEMINI[Gemini structured output]
    GEMINI --> VALIDATE[Schema, safety, and game validation]
    VALIDATE -- Retry --> GEMINI
    VALIDATE -- Valid --> POSTCHECK[Check generated claims and limits against retrieved evidence]
    POSTCHECK --> GROUNDED{Evidence supports content and scope?}
    GROUNDED -- No --> REJECT[Reject or regenerate with same evidence; otherwise fail closed]
    GROUNDED -- Yes --> DONE[Game plus traceable curriculum evidence]

    Q --> AA[Generation evaluation]
    AA --> AB[Matched runs with and without RAG]
    AB --> AC[Score grounding, correctness, age fit, limits, playability]
    AC --> AD[One combined report + per-scope/run JSON/CSV]
```

**Current spike position (2026-10-12):** target denominator is 15 primary scopes; source extraction, 558/558 chunk provenance, and 558/558 Supabase vectors are complete. Reingest wrote 0 and skipped all 558. Exploratory retrieval ran on 8/15 scopes: 80/80 positive Hit@3, 19/24 negative rejection, 5 false acceptances, 33/33 controls excluded and zero leakage; the aggregate gate FAILS. Seven scopes remain NOT_RUN after Gemini's 1,000-request daily embedding quota was exhausted. Independent holdout is still only MATH G1–G3 and all three FAIL; calibration is NOT_RUN. Semantic/pedagogical chunk review, live claim-checker review, teacher review and production end-to-end generation across the 15 scopes remain NOT_RUN/PENDING. Strategy comparison remains Math G1 level: 6 paired outputs, 4 provider errors. See the consolidated report and linked JSON/CSV evidence.

## Ready-to-post team summary

> Flow triển khai hiện tại: nguồn chính thức → extract theo trang → chunk theo yêu cầu cần đạt → lưu ID/scope/topic/hash/trang → đối chiếu text hoặc transcription với ảnh → ingest pgvector idempotent → benchmark theo scope. Corpus 15/15 và vector 558/558 đã sẵn sàng. Retrieval exploratory chỉ 8/15 do quota; 7 scope NOT_RUN, kết quả tổng thể FAIL vì false acceptance. Holdout ba scope đều FAIL nên chưa có cơ sở gọi cả hệ thống đạt ngưỡng. Khi sinh game: subject/lớp/topic → filter bắt buộc → retrieval kèm nguồn → evidence check → prompt strategy + context → Gemini structured output → schema/safety validation → advisory claim review. Live generation E2E, live claim-checker review, cảnh báo trên UI và teacher review vẫn NOT_RUN/PENDING. Kết quả so sánh có/không RAG còn ở strategy level. Xem báo cáo tổng hợp và liên kết JSON/CSV để biết từng scope/run.

