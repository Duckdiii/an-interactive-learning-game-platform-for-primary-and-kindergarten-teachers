#!/usr/bin/env node
// In đồ thị khái niệm (backend/src/main/resources/assets/concepts/*.json) thành sơ đồ Mermaid để dán vào Obsidian hoặc GitHub
// mà xem bằng mắt. Chỉ đọc. Cạnh liền: thuộc nhóm cha; cạnh đứt: dễ nhầm. Không in id hình để sơ đồ gọn (dùng --assets để in).
// Dùng: node scripts/assets/concept-graph-mermaid.mjs [animal] [--assets]
import fs from 'node:fs';

const DIR = new URL('../../backend/src/main/resources/assets/concepts/', import.meta.url);
const args = process.argv.slice(2);
const withAssets = args.includes('--assets');
const only = args.find((a) => !a.startsWith('--'));
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && (!only || f === only + '.json'));
if (files.length === 0) throw new Error('Không có file đồ thị khái niệm' + (only ? ` tên ${only}.json` : ''));

// Phía Java coi synonyms/confusableWith/assets là tùy chọn, nên điền mảng rỗng khi thiếu.
const concepts = files
  .flatMap((f) => JSON.parse(fs.readFileSync(new URL(f, DIR), 'utf8')).concepts)
  .map((c) => ({ ...c, synonyms: c.synonyms ?? [], confusableWith: c.confusableWith ?? [], assets: c.assets ?? [] }));
const node = (id) => id.replace(/[^A-Za-z0-9_]/g, '_');
const label = (c) => {
  const extra = c.synonyms.length ? `<br/><i>${c.synonyms.join(', ')}</i>` : '';
  const assets = withAssets && c.assets.length ? `<br/>${c.assets.join('<br/>')}` : c.assets.length ? `<br/>${c.assets.length} hình` : '';
  return `${node(c.id)}["${c.labelVi}${extra}${assets}"]`;
};

const lines = ['graph LR'];
for (const c of concepts) lines.push('  ' + label(c));
for (const c of concepts) if (c.parent) lines.push(`  ${node(c.parent)} --> ${node(c.id)}`);
const seen = new Set();
for (const c of concepts) {
  for (const other of c.confusableWith) {
    const key = [c.id, other].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`  ${node(c.id)} -. dễ nhầm .- ${node(other)}`);
  }
}
console.log(lines.join('\n'));
