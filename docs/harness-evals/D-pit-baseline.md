# D: mutation testing bằng PIT cho các module kiểm duyệt game (2026-11-15)

Mục tiêu: đo test có thật sự bắt được lỗi hay không, thay vì chỉ đo dòng nào đã chạy qua (JaCoCo). PIT cố ý sửa code
(đảo điều kiện, bỏ lời gọi, đổi giá trị trả về...), mỗi bản sửa gọi là một mutant, rồi chạy test. Test đỏ thì mutant
"bị giết"; test vẫn xanh thì mutant "sống", tức là có một lỗi thật mà test để lọt.

## Cách chạy

```bash
cd backend && ./mvnw test-compile org.pitest:pitest-maven:mutationCoverage
```

- Báo cáo: `backend/target/pit-reports/index.html` (và `mutations.xml`).
- Plugin không gắn vào phase nào, nên `mvn test`, `mvn install` và CI không chạy PIT. Đã kiểm `clean install -DskipTests` không gọi PIT.
- Phạm vi (`backend/pom.xml`): mutant sinh ở `service.validation.rule` (Layer 2), `service.validation.ai` (kiểm đầu ra AI) và `service.validation.safety` (Layer 3); chỉ chạy test trong `service.validation.*`.
- Thời gian 2–4 phút trên máy dev (gồm biên dịch), 4 luồng.
- Phiên bản: `pitest-maven` 1.30.2, `pitest-junit5-plugin` 1.2.3.

## Kết quả lần đầu

PIT 1.30.2, chạy trên JDK 25 ở máy dev. Chạy hai lần, cùng tổng số. Số liệu dưới đây lấy từ `mutations.xml` của lần hai.

| Chỉ số | Giá trị |
|---|---|
| Mutant sinh ra | 294 |
| Bị giết | 273 (93%) |
| Không test nào chạy tới | 10 |
| Test strength (bị giết / có test chạy tới) | 96% |
| Line coverage của các lớp bị mutate | 449/475 (95%) |

Theo lớp (bị giết / tổng):

| Lớp | Điểm | Lớp | Điểm |
|---|---|---|---|
| QuizRule | 57/57 | QuizArithmeticAnswerVerifier | 33/41 |
| RuleSupport | 26/27 | OpenAiModerationClient | 23/25 |
| MatchingRule | 19/20 | GameTextExtractor | 16/16 |
| AiOutputValidator | 14/15 | OrderingRule | 14/16 |
| DragDropRule | 11/12 | VisualClozeRule | 11/11 |
| WordScrambleRule | 11/11 | BlockedWordList | 9/9 |
| AbstractGameRule | 7/7 | OddOneOutRule | 6/7 |
| AudioVisualMatchRule | 6/6 | MemoryCardRule | 4/4 |
| AiOutputSchemas | 2/5 | OpenAiModerationClient$1 | 2/3 |
| AiOutputReport | 2/2 | **Tổng** | **273/294** |

## Mutant sống, đã phân loại

Lỗi thật mà test để lọt (ghi ở `docs/KNOWN-GAPS.md` #25):

| Chỗ | Mutant | Nghĩa là |
|---|---|---|
| `QuizArithmeticAnswerVerifier.calculate:118`, `numericValue`, `wholeExpressionValue` | 8 mutant không có test nào chạy tới | Chưa có câu quiz phép chia/chia lấy dư nào được test, nên đáp án sai của dạng này lọt. |
| `OrderingRule.checkQuestion:29`, `DragDropRule.checkQuestion:33` | bỏ `checkUnique` | Không test nào đưa vào id trùng của `steps` (Ordering) hay của `dropZones` (DragDrop; id trùng của `items` thì đã có test). |
| `OddOneOutRule.checkQuestion:26` | bỏ `checkPositionalIds` | Không test id lựa chọn sai thứ tự. |
| `MatchingRule.hasText:51` | luôn trả true | Không test cặp ghép có chữ rỗng. |
| `RuleSupport.sideKey:50`, `OrderingRule.stepKey:47` | trả chuỗi rỗng | Khoá dùng để so trùng chưa được test riêng. |

Giá trị thấp hoặc khó test bằng unit test (để nguyên):
- `OpenAiModerationClient.requestFactory` (timeout của HTTP client).
- `OpenAiModerationClient$1.removeEldestEntry` (biên của bộ nhớ đệm).
- `AiOutputSchemas.load` và `forLlm` (nạp schema cho prompt): `AiOutputSchemasTest` có, nhưng không kiểm chuỗi trả về của hai hàm này.
- `AiOutputValidator.validate:91`: không test nào chạy tới dòng này (chưa xem kỹ là đường nào).

Lần chạy đầu có 1 `RUN_ERROR` ở `OddOneOutRule`: một tiến trình con của PIT thoát bất thường. Lần hai mutant này bị giết, nên đó là trục trặc của lần chạy, không phải lỗ hổng của test.

## Bước tiếp

1. Viết test lấp các mutant sống thật ở trên (đúng việc của `test-writer`), rồi chạy lại PIT.
2. Khi điểm ổn định, cân nhắc thêm `mutationThreshold` và một job CI chạy PIT cho riêng các module này (job chậm hơn, cần người dùng chốt).
3. Stryker cho frontend chưa làm (chưa được duyệt).
