// So endpoint trong docs/openapi/openapi.yaml với controller Spring trong backend, cả hai chiều. Chỉ báo cáo, luôn exit 0.
// Dùng: node scripts/openapi/compare-endpoints.mjs [gốc-repo]
// Không dùng thư viện YAML (bố cục cố định như build-index.mjs: path 2 dấu cách, method 4, thuộc tính 6).
// shortcut: chỉ đọc @RequestMapping("...") ở mức class và @Get/Post/Put/Patch/DeleteMapping với một đường dẫn chuỗi
// (hoặc không có đường dẫn); dạng mảng, `value =`, `method =` hay hằng số thì chưa hỗ trợ: báo "không đọc được" để người xem.
// Controller có tiền tố class không đọc được thì bỏ cả các endpoint của nó (tránh báo lệch giả ở hai chiều). Nâng cấp
// sang parser Java thật nếu số "không đọc được" tăng.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const METHOD = /^    (get|post|put|patch|delete):\s*$/;
const MAPPING = /@(Get|Post|Put|Patch|Delete|Request)Mapping\b(\(([^)]*)\))?/g;

/** Chuẩn hoá để so: bỏ "/" cuối, mọi tham số {x} thành {}. */
export const normalize = (path) => (path.replace(/\{[^}]+\}/g, "{}").replace(/\/+$/, "") || "/");

/** Các operation trong openapi.yaml: [{method, path, status, line}] (path đã gắn tiền tố của servers[0].url). */
export function openapiOperations(text) {
  const lines = text.split(/\r?\n/);
  const server = /^\s*-\s*url:\s*(\S+)/.exec(lines.find((l) => /^\s*-\s*url:/.test(l)) ?? "");
  // URL tương đối ("/api") cũng được: lấy phần đường dẫn so với một gốc giả.
  const base = server ? new URL(server[1], "http://x").pathname.replace(/\/$/, "") : "";
  const ops = [];
  let inPaths = false, path = null, current = null;
  lines.forEach((line, i) => {
    if (/^paths:\s*$/.test(line)) return void (inPaths = true);
    if (/^\S/.test(line)) return void (inPaths = false);
    if (!inPaths) return;
    const p = /^  (\/\S*):\s*$/.exec(line);
    if (p) return void (path = p[1]);
    const m = METHOD.exec(line);
    if (m && path) return void ops.push((current = { method: m[1].toUpperCase(), path: base + path, status: "", line: i + 1 }));
    const s = /^      x-status:\s*(\S+)/.exec(line);
    if (s && current) current.status = s[1];
  });
  return ops;
}

/** Thay comment bằng khoảng trắng (giữ xuống dòng để số dòng không đổi); chuỗi "..." giữ nguyên, kể cả khi chứa `//`. */
export const stripComments = (source) =>
  source.replace(/"(?:\\.|[^"\\\n])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => (m.startsWith('"') ? m : m.replace(/[^\n]/g, " ")));

const withSlash = (p) => (p && !p.startsWith("/") ? `/${p}` : p);

/** Endpoint trong một file controller: {ops: [{method, path, line}], unreadable: [{line, text}]}. */
export function controllerOperations(raw) {
  const source = stripComments(raw);
  const ops = [], unreadable = [];
  const classAt = source.search(/\bclass\s+\w+/);
  let prefix = "", prefixBroken = false;
  for (const m of source.matchAll(MAPPING)) {
    const line = source.slice(0, m.index).split("\n").length;
    const args = (m[3] ?? "").trim();
    const str = /^"([^"]*)"$/.exec(args);
    const atClass = m[1] === "Request" && m.index < classAt;
    if (args && !str) {
      unreadable.push({ line, text: atClass ? `${m[0]} (tiền tố class: bỏ qua mọi endpoint của file này)` : m[0] });
      if (atClass) prefixBroken = true;
      continue;
    }
    const value = withSlash(str ? str[1] : "");
    if (m[1] === "Request") {
      if (atClass) prefix = value;
      else unreadable.push({ line, text: m[0] });
      continue;
    }
    ops.push({ method: m[1].toUpperCase(), path: prefix + value, line });
  }
  return { ops: prefixBroken ? [] : ops, unreadable };
}

/** So hai tập theo khoá "METHOD đường-dẫn-chuẩn-hoá": {onlyCode, onlySpec, stalePlanned (ghi planned mà code đã có)}. */
export function compare(specOps, codeOps) {
  const key = (o) => `${o.method} ${normalize(o.path)}`;
  const spec = new Set(specOps.map(key)), code = new Set(codeOps.map(key));
  return {
    onlyCode: codeOps.filter((o) => !spec.has(key(o))),
    onlySpec: specOps.filter((o) => !code.has(key(o))),
    stalePlanned: specOps.filter((o) => o.status === "planned" && code.has(key(o))),
  };
}

function javaFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? javaFiles(join(dir, e.name)) : e.name.endsWith(".java") ? [join(dir, e.name)] : []);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
  const specOps = openapiOperations(readFileSync(join(root, "docs/openapi/openapi.yaml"), "utf8"));
  const codeOps = [], unreadable = [];
  for (const file of javaFiles(join(root, "backend/src/main/java"))) {
    const source = readFileSync(file, "utf8");
    if (!/@(Rest)?Controller\b/.test(source)) continue;
    const rel = relative(root, file).replace(/\\/g, "/");
    const found = controllerOperations(source);
    codeOps.push(...found.ops.map((o) => ({ ...o, file: rel })));
    unreadable.push(...found.unreadable.map((u) => ({ ...u, file: rel })));
  }
  const { onlyCode, onlySpec, stalePlanned } = compare(specOps, codeOps);
  console.log(`openapi.yaml: ${specOps.length} operation; controller: ${codeOps.length} endpoint.`);
  console.log(`\nCó trong code, không có trong openapi.yaml (${onlyCode.length}):`);
  for (const o of onlyCode) console.log(`  ${o.method} ${o.path}  (${o.file}:${o.line})`);
  console.log(`\nCó trong openapi.yaml, không có trong code (${onlySpec.length}):`);
  for (const o of onlySpec) console.log(`  ${o.method} ${o.path}  [x-status: ${o.status || "?"}]  (openapi.yaml:${o.line})`);
  const wrong = onlySpec.filter((o) => o.status === "implemented" || o.status === "extended-pending");
  console.log(`  → trong đó ${wrong.length} operation ghi đã cài (implemented/extended-pending) mà không tìm thấy trong code.`);
  console.log(`\nGhi planned nhưng đã có trong code (${stalePlanned.length}):`);
  for (const o of stalePlanned) console.log(`  ${o.method} ${o.path}  (openapi.yaml:${o.line})`);
  if (unreadable.length) {
    console.log(`\nKhông đọc được (${unreadable.length}), cần xem tay:`);
    for (const u of unreadable) console.log(`  ${u.text}  (${u.file}:${u.line})`);
  }
}
