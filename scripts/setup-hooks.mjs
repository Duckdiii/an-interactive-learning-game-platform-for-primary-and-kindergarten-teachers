// Bật git hook của repo (.githooks/) cho bản clone này. Chạy một lần: node scripts/setup-hooks.mjs
import { execFileSync } from "node:child_process";

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

run("git", ["config", "core.hooksPath", ".githooks"]);
console.log(`core.hooksPath = ${run("git", ["config", "core.hooksPath"])}`);
try {
  console.log(`gitleaks: ${run("gitleaks", ["version"])}`);
} catch {
  console.warn("CẢNH BÁO: chưa cài gitleaks, hook sẽ không quét secret ở máy này. Cài: winget install gitleaks.gitleaks (Windows) hoặc brew install gitleaks.");
}
