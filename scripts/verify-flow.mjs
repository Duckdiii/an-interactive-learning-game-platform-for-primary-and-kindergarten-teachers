// Chạy luồng chính của giáo viên qua HTTP thật (login → understand → generate → get → put → revise)
// rồi in nơi lưu bằng chứng từng bước.
// Dùng: node scripts/verify-flow.mjs          (TeacherFlowVerificationTest, AI giả, miễn phí, chạy được trên CI)
//       node scripts/verify-flow.mjs --live   (TeacherFlowLiveTest, Gemini thật, TỐN QUOTA: chỉ chạy khi được yêu cầu)
// Giới hạn: DB là H2 trong bộ nhớ (schema do Hibernate tạo), chưa kiểm schema Supabase thật.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Chỉ đếm file của lớp được chạy. Test @Disabled generatedGameHasCurriculumReview (docs/KNOWN-GAPS.md) khi bật lại tự
// đăng ký, đăng nhập, sinh game rồi gọi curriculum-review: thêm 4 file, khi đó số này là 12.
export const EXPECTED_STEPS = 8; // register, login, understand, generate, get, put, get-after-put, revise

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = join(root, "backend");
const evidence = join(backend, "target", "verify-evidence");
const live = process.argv.includes("--live");

if (live && !process.env.GEMINI_API_KEY) {
  console.error("--live cần biến môi trường GEMINI_API_KEY.");
  process.exit(2);
}
// Xoá bằng chứng cũ trước: nếu build lỗi biên dịch, test không chạy và file cũ sẽ bị đọc nhầm là kết quả mới.
rmSync(evidence, { recursive: true, force: true });

const env = { ...process.env };
if (live) env.RUN_LIVE_TEACHER_FLOW = "true";
else delete env.RUN_LIVE_TEACHER_FLOW;
const testClass = live ? "TeacherFlowLiveTest" : "TeacherFlowVerificationTest";
// Đường dẫn tuyệt đối: cmd.exe trên một số máy không tìm lệnh trong thư mục hiện tại.
const mvnw = process.platform === "win32" ? `"${join(backend, "mvnw.cmd")}"` : "./mvnw";
const run = spawnSync(mvnw, ["--batch-mode", "-q", "test", `-Dtest=${testClass}`, "-Djacoco.skip=true"],
  { cwd: backend, env, stdio: "inherit", shell: process.platform === "win32" });

const files = existsSync(evidence) ? readdirSync(evidence).filter((f) => f.endsWith(".json")).sort() : [];
// Maven có thể thoát 0 mà không chạy test nào (lớp bị đổi tên, @Disabled): thiếu bước thì coi là FAIL.
const ok = run.status === 0 && files.length === EXPECTED_STEPS;
console.log(`\nverify-flow (${live ? "LIVE Gemini" : "AI giả"}): ${ok ? "PASS" : "FAIL"} (${files.length}/${EXPECTED_STEPS} bước)`);
for (const f of files) {
  const { step, request, status } = JSON.parse(readFileSync(join(evidence, f), "utf8"));
  console.log(`  ${f.padEnd(26)} ${String(status).padEnd(4)} ${request.method} ${request.path}  (${step})`);
}
console.log(files.length ? `Bằng chứng: ${evidence}` : "Không có bằng chứng (test không chạy tới bước nào; xem log Maven ở trên).");
process.exit(ok ? 0 : 1);
