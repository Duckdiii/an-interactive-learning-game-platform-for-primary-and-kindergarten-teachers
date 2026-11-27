// Kiểm docs/FEATURE-MAP.md còn khớp code: endpoint ở mục "Đã có code" phải có controller, endpoint ở mục "Frontend gọi nhưng
// backend chưa có" thì chưa được có, mọi endpoint của controller phải có mặt trong map, và mọi trích dẫn C/ T/ F/ có số dòng
// trỏ tới file có thật với số dòng không vượt độ dài file. Không kiểm nội dung dòng được trích (map tự ghi "số dòng có thể lệch").
// Dùng: node scripts/verify/check-feature-map.mjs [gốc-repo]   (exit 1 nếu có lỗi)
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { controllerEndpoints, normalize } from "../openapi/compare-endpoints.mjs";

const PREFIX = {
  C: "backend/src/main/java/com/aigameplatform/backend/",
  T: "backend/src/test/java/com/aigameplatform/backend/",
  F: "frontend/src/",
};
const ENDPOINT = /`(GET|POST|PUT|PATCH|DELETE) (\/[^`\s]*)`/;
// Dấu "/" trước chữ cái tắt không được là một phần đường dẫn khác (ví dụ `a/C/x`), và bỏ đường dẫn có `*` (glob).
const CITE = /(?<![\w/])([CTF])\/([\w./-]+\.\w+)(?::(\d+))?/g;
const OPENAPI_LINE_CITE = /\bOA:\d+\b/;
const key = (method, path) => `${method} ${normalize(path)}`;
const SECTIONS = { implemented: "## Đã có code", missing: "## Frontend gọi nhưng backend chưa có" };

export function checkRouteMatrix(matrix, paths, app, fileExists) {
  // Only literal ROUTES references are supported; comments/string examples cannot register a route.
  const literalsAndComments = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
  paths = paths.replace(literalsAndComments, m => m.startsWith('/') ? ' ' : m);
  app = app.replace(literalsAndComments, ' ');
  const routes = new Map([...paths.matchAll(/\b(\w+):\s*['"](\/[^'"]*)['"]/g)].map(m => [m[1], m[2]]));
  const errors = [];
  const seen = new Set();
  if (!routes.size) errors.push('Cannot read ROUTES');
  for (const row of matrix) {
    if (seen.has(row.key)) errors.push(`Duplicate route ${row.key}`);
    seen.add(row.key);
    if (routes.get(row.key) !== row.path) errors.push(`Route ${row.key} differs from paths.ts`);
    if (!app.includes(`path={ROUTES.${row.key}}`)) errors.push(`Route ${row.key} is not registered in App.tsx`);
    if (!['real', 'mixed', 'mock', 'unverified'].includes(row.state)) errors.push(`Invalid state ${row.key}`);
    if (!Array.isArray(row.checks) || (row.state !== 'unverified' && !row.checks.length)) {
      errors.push(`No evidence entry for ${row.key}`);
    }
    else for (const file of row.checks) if (!fileExists(file)) errors.push(`Missing evidence ${file}`);
  }
  for (const key of routes.keys()) if (!seen.has(key)) errors.push(`Route ${key} has no coverage entry`);
  return errors;
}

/** Số dòng như `wc -l` cộng dòng cuối không có xuống dòng (file kết thúc bằng "\n" không có thêm dòng rỗng). */
export const countLines = (text) => (text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0));

/**
 * map: nội dung FEATURE-MAP.md; codeOps: [{method, path, file, line}]; lineCount(path) trả số dòng của file (đường dẫn từ gốc
 * repo) hoặc null nếu không có. Trả về mảng lỗi (chuỗi).
 */
export function checkFeatureMap(map, codeOps, lineCount) {
  const errors = [];
  const implemented = new Map(), missing = new Map();
  let section = null;
  const seen = new Set();
  map.split(/\r?\n/).forEach((line, i) => {
    const at = `FEATURE-MAP.md:${i + 1}`;
    if (/^## /.test(line)) {
      section = Object.keys(SECTIONS).find((s) => line.startsWith(SECTIONS[s])) ?? null;
      if (section) seen.add(section);
    }
    const ep = line.startsWith("|") && ENDPOINT.exec(line);
    if (ep && section) (section === "implemented" ? implemented : missing).set(key(ep[1], ep[2]), at);
    for (const m of line.matchAll(CITE)) {
      const path = PREFIX[m[1]] + m[2];
      const n = lineCount(path);
      if (n == null) errors.push(`${at}: ${m[0]} trỏ tới file không có (${path})`);
      else if (m[3] && Number(m[3]) > n) errors.push(`${at}: ${m[0]} vượt độ dài file (${n} dòng)`);
    }
    if (OPENAPI_LINE_CITE.test(line)) errors.push(`${at}: tra OpenAPI bằng phương thức và đường dẫn trong INDEX.md`);
  });
  // Đổi tên tiêu đề thì cả mục bị bỏ qua mà không ai biết, nên thiếu tiêu đề cũng là lỗi.
  for (const s of Object.keys(SECTIONS)) if (!seen.has(s)) errors.push(`FEATURE-MAP.md: không thấy tiêu đề "${SECTIONS[s]}"`);
  const code = new Map(codeOps.map((o) => [key(o.method, o.path), o]));
  for (const [k, at] of implemented) if (!code.has(k)) errors.push(`${at}: ${k} ghi "đã có code" nhưng không controller nào có`);
  for (const [k, at] of missing) if (code.has(k)) errors.push(`${at}: ${k} ghi "backend chưa có" nhưng đã có ở ${code.get(k).file}:${code.get(k).line}`);
  for (const [k, o] of code) {
    if (!implemented.has(k)) errors.push(`${o.file}:${o.line}: ${k} có trong controller nhưng chưa có trong mục "Đã có code" của FEATURE-MAP.md`);
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
  const lineCount = (path) => {
    const file = join(root, path);
    return existsSync(file) ? countLines(readFileSync(file, "utf8")) : null;
  };
  const { codeOps, unreadable } = controllerEndpoints(root);
  // Endpoint không đọc được sẽ bị coi như không có (báo sai lý do, hoặc endpoint mới lọt), nên chặn luôn thay vì chỉ nhắc.
  const errors = [
    ...unreadable.map((u) => `${u.file}:${u.line}: không đọc được ${u.text} (viết đường dẫn dạng chuỗi, hoặc nâng cấp compare-endpoints)`),
    ...checkFeatureMap(readFileSync(join(root, "docs/FEATURE-MAP.md"), "utf8"), codeOps, lineCount),
    ...checkRouteMatrix(JSON.parse(readFileSync(join(root, 'docs/harness-evals/route-matrix.json'), 'utf8')),
      readFileSync(join(root, 'frontend/src/routes/paths.ts'), 'utf8'),
      readFileSync(join(root, 'frontend/src/App.tsx'), 'utf8'), path => existsSync(join(root, path))),
  ];
  for (const e of errors) console.error(`[LỖI] ${e}`);
  if (errors.length) process.exit(1);
  console.log(`FEATURE-MAP.md: khớp code (${codeOps.length} endpoint).`);
}
