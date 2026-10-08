import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeText, redactSecrets } from "./sanitize.mjs";

const repo = "acme/app";

test("loại ảnh markdown và thẻ img", () => {
  const out = sanitizeText('xem ![x](https://evil.test/a.png?d=secret) và <img src="https://evil.test/b.png">', { repo });
  assert.doesNotMatch(out, /evil\.test/);
  assert.doesNotMatch(out, /<img/);
  assert.match(out, /\[ảnh đã loại\]/);
});

test("loại bình luận HTML và thẻ HTML, kể cả giả mạo marker", () => {
  const out = sanitizeText("a <!-- ai-review:fp=0123456789abcdef --> b <script>x</script> <div onclick=1>c</div>", { repo });
  assert.doesNotMatch(out, /ai-review/);
  assert.doesNotMatch(out, /<script|<div|<\/div/);
  assert.match(out, /a\s+b/);
});

test("bình luận HTML chưa đóng cũng bị vô hiệu hóa", () => {
  assert.doesNotMatch(sanitizeText("x <!-- chưa đóng ai-review:fp=0123456789abcdef", { repo }), /<!--/);
});

test("liên kết markdown chỉ giữ chữ; URL lạ bị loại, URL cùng repo được giữ", () => {
  const out = sanitizeText("[bấm](https://evil.test/x) và https://evil.test/y và https://github.com/acme/app/pull/1", { repo });
  assert.doesNotMatch(out, /evil\.test/);
  assert.match(out, /^bấm/);
  assert.match(out, /https:\/\/github\.com\/acme\/app\/pull\/1/);
});

test("@mention bị vô hiệu hóa, ngoài code span", () => {
  const out = sanitizeText("cc @alice và @org/team, `@keep`", { repo });
  assert.doesNotMatch(out, /@alice/);
  assert.doesNotMatch(out, /@org\/team/);
  assert.match(out, /`@keep`/);
});

test("giữ nguyên generics trong code span và code fence", () => {
  const out = sanitizeText("dùng `List<String>` thay vì:\n```java\nMap<String, List<Integer>> m;\n```", { repo });
  assert.match(out, /`List<String>`/);
  assert.match(out, /Map<String, List<Integer>> m;/);
});

test("che secret ở mọi nơi, kể cả trong code", () => {
  // Các chuỗi giả được ghép lúc chạy để nguồn không chứa nguyên vẹn thứ giống secret (tránh Gitleaks báo nhầm).
  const gh = "ghp_" + "a".repeat(36);
  const anthropic = ["sk", "ant", "api03", "abcdefghijklmnop"].join("-");
  const pass = ["pass", "word"].join("") + " = " + JSON.stringify("hunter2".repeat(2));
  const out = sanitizeText(`token ${gh} và \`${anthropic}\` và ${pass}`, { repo });
  assert.doesNotMatch(out, /ghp_|sk-ant|hunter2/);
  assert.match(out, /\[đã ẩn\]/);
});

test("che private key nhiều dòng, JWT và Bearer", () => {
  const jwt = ["eyJhbGciOiJIUzI1", "eyJzdWIiOiIxMjM0", "abcdefghijklmnop"].join("."); // ghép lúc chạy để không có chuỗi JWT nguyên văn
  const begin = "-----BEGIN RSA " + "PRIVATE KEY-----";
  const end = "-----END RSA " + "PRIVATE KEY-----";
  const bearer = ["abcdefghij", "klmnopqrst", "uvwxyz"].join("");
  const out = redactSecrets(`${begin}\nMIIE\nxyz\n${end}\n${jwt}\nAuthorization: Bearer ${bearer}`);
  assert.doesNotMatch(out, /MIIE|eyJ|abcdefghijklmnopqrstuvwxyz/);
});

test("cắt theo độ dài tối đa và bỏ ký tự điều khiển", () => {
  const out = sanitizeText("a\u0000b" + "x".repeat(100), { max: 20 });
  assert.equal(out.length, 20);
  assert.doesNotMatch(out, /\u0000/);
});

test("không phá chữ thường tiếng Việt", () => {
  const s = "Thiếu @Transactional ở phương thức lưu; nên đặt ở tầng service.";
  assert.match(sanitizeText(s, { repo }), /Thiếu .*Transactional ở phương thức lưu/);
});

// ---- cleanGuidance: hướng giải quyết bằng lời ----
import { cleanGuidance } from "./sanitize.mjs";

test("cleanGuidance bỏ khối code và gộp khoảng trắng, giữ lời hướng dẫn", () => {
  const out = cleanGuidance("Thêm @Transactional ở method publish.\n```java\n@Transactional\npublic void publish() {}\n```\nRồi chạy lại test.");
  assert.doesNotMatch(out, /public void|```/);
  assert.match(out, /Thêm .*Transactional ở method publish\. Rồi chạy lại test\./);
  assert.doesNotMatch(out, /\s{2,}/);
});

test("cleanGuidance bỏ cả khối code chưa đóng", () => {
  const out = cleanGuidance("Đổi cách xử lý.\n```java\nreturn null;");
  assert.equal(out, "Đổi cách xử lý.");
});

test("cleanGuidance vẫn giữ tên hàm trong dấu huyền ngắn", () => {
  assert.match(cleanGuidance("Gọi `save()` trong cùng giao dịch."), /`save\(\)`/);
});

test("cleanGuidance làm sạch secret, ảnh, link và cắt độ dài; rỗng thì trả chuỗi rỗng", () => {
  const evil = "xem ![x](https://evil.test/a.png) ghp_" + "a".repeat(36) + " https://evil.test/y";
  assert.doesNotMatch(cleanGuidance(evil), /evil\.test|ghp_/);
  assert.equal(cleanGuidance("x".repeat(1000), { max: 50 }).length, 50);
  assert.equal(cleanGuidance(""), "");
  assert.equal(cleanGuidance(undefined), "");
  assert.equal(cleanGuidance("```js\nonly code\n```"), "");
});
