#!/usr/bin/env node
// Đo trước cho khóa họ phong cách (bước 0 của GameAssetBinder): trong danh mục hình, bao nhiêu khái niệm có bản ở nhiều
// họ (openmoji, fluent, kenney, custom), và nếu khóa họ phổ biến nhất của mỗi nhóm nghĩa thì giữ được bao nhiêu phần khái niệm.
// Chỉ đọc. Cách gom "cùng khái niệm": cùng nhãn (bỏ tiền tố "con", "cái"...) hoặc chung một từ khóa nhiều chữ. Đây là ước
// lượng thô trước khi có đồ thị khái niệm: có thể gom thiếu (hai tên khác nhau cho cùng vật) hoặc gom nhầm.
// Dùng: node scripts/assets/analyze-style-variants.mjs [--list]
import fs from 'node:fs';

const CATALOG = new URL('../../backend/src/main/resources/assets/game-asset-catalog.json', import.meta.url);
const assets = JSON.parse(fs.readFileSync(CATALOG, 'utf8')).assets;
const showList = process.argv.includes('--list');

// Nhãn so GIỮ DẤU: bỏ dấu thì "bò" trùng "bố", "lười" trùng "lưỡi", "quả cân" trùng "cái cân" (lỗi đã gặp ở lần chạy đầu).
const fold = (s) => s.normalize('NFC').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
// Chỉ bỏ loại từ; không bỏ "hoa", "cây", "bánh" (là một phần của tên vật) và không bỏ "củ" ("cú mèo" sẽ thành "mèo").
const stripPrefix = (s) => s.replace(/^(con|cái|chiếc|đôi) /u, '');

// Từ khóa tiếng Anh làm tín hiệu cùng vật ("elephant"): từ a-z dài từ 4 ký tự và KHÔNG trùng dạng không dấu của bất kỳ chữ
// nào trong nhãn tiếng Việt (nếu không, "trau", "chuoi", "luoi" bị coi là tiếng Anh và gom nhầm do trùng âm).
const ascii = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
const VIET_WORDS = new Set(assets.flatMap((a) => ascii(fold(a.label)).split(' ')));
const ENGLISH = new Set(assets.flatMap((a) => a.keywords.filter((k) => /^[a-z]{4,}$/.test(k) && !VIET_WORDS.has(k))));

// Union-find trên chỉ số hình.
const parent = assets.map((_, i) => i);
const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
const union = (a, b) => { parent[find(a)] = find(b); };

const firstByKey = new Map();
assets.forEach((a, i) => {
  // Nhãn có dấu, cộng từ khóa tiếng Anh (chữ không dấu chỉ gồm a-z, từ 4 ký tự) làm tín hiệu cùng vật ("elephant").
  const keys = new Set([stripPrefix(fold(a.label))]);
  for (const k of a.keywords) if (/^[a-z]{4,}$/.test(k) && ENGLISH.has(k)) keys.add('en:' + k);
  for (const k of keys) {
    if (!k) continue;
    if (firstByKey.has(k)) union(i, firstByKey.get(k));
    else firstByKey.set(k, i);
  }
});

const concepts = new Map();
assets.forEach((a, i) => {
  const root = find(i);
  if (!concepts.has(root)) concepts.set(root, []);
  concepts.get(root).push(a);
});

const byGroup = new Map();
for (const members of concepts.values()) {
  const group = members[0].group;
  if (!byGroup.has(group)) byGroup.set(group, []);
  byGroup.get(group).push(members);
}

const families = (members) => new Set(members.map((m) => m.family));
let total = 0, multi = 0;
const rows = [];
for (const [group, list] of [...byGroup.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const count = new Map();
  for (const members of list) for (const f of families(members)) count.set(f, (count.get(f) ?? 0) + 1);
  const [bestFamily, bestCount] = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
  const multiFamily = list.filter((m) => families(m).size > 1).length;
  total += list.length;
  multi += multiFamily;
  rows.push({ group, concepts: list.length, multiFamily, bestFamily, coverage: bestCount / list.length, mix: Object.fromEntries(count) });
}

console.log(`Hình: ${assets.length} | khái niệm (ước lượng): ${total} | có bản ở ≥2 họ: ${multi} (${Math.round(100 * multi / total)}%)`);
console.log('\nnhóm        khái niệm  nhiều họ  họ phổ biến  phủ nếu khóa  phân bố họ (số khái niệm có bản ở họ đó)');
for (const r of rows) {
  console.log(`${r.group.padEnd(11)} ${String(r.concepts).padStart(9)} ${String(r.multiFamily).padStart(9)}  ${r.bestFamily.padEnd(11)} ${(Math.round(r.coverage * 100) + '%').padStart(12)}  ${JSON.stringify(r.mix)}`);
}

if (showList) {
  console.log('\nKhái niệm có bản ở nhiều họ:');
  for (const members of concepts.values()) {
    if (families(members).size > 1) console.log(' -', members.map((m) => `${m.label} [${m.family}]`).join(' | '));
  }
}
