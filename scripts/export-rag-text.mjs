import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resources = path.join(root, 'backend/src/main/resources/curriculum/spike');
const evidence = path.join(root, 'docs/rag-spike/evidence');
const output = path.join(evidence, 'text');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const lines = async file => (await readFile(file, 'utf8')).split(/\r?\n/).filter(x => x.trim()).map(JSON.parse);
const catalog = await json(path.join(resources, 'catalog.json'));
const scopes = [];
const pages = new Map();
await mkdir(path.join(output, 'raw-pages'), { recursive: true });

for (const name of catalog.datasets) {
  const manifest = await json(path.join(resources, name, 'manifest.json'));
  const chunks = await lines(path.join(resources, name, 'chunks.jsonl'));
  const extracted = path.join(root, 'backend/target/curriculum-spike/extracted', manifest.datasetVersion);
  const verification = await json(path.join(extracted, 'source-verification.json'));
  if (verification.verifiedChunks !== chunks.length || verification.sourceSha256 !== manifest.sourceSha256
      || verification.chunks.length !== chunks.length
      || verification.chunks.some(c => {
        const chunk = chunks.find(x => x.chunkId === c.chunkId);
        return !chunk || !c.sourceFragmentsMatched
          || chunk.subject !== c.subject || chunk.gradeLevel !== c.gradeLevel
          || chunk.topic !== c.topic || chunk.control !== c.control
          || JSON.stringify([...new Set(chunk.sourceFragments.map(f => f.pdfPage))]) !== JSON.stringify(c.sourcePdfPages)
          || JSON.stringify([...new Set(chunk.sourceFragments.map(f => f.printedPage))]) !== JSON.stringify(c.sourcePrintedPages)
          || !['PDF_TEXT_LAYER', 'AI_REVIEWED_TEXT_TRANSCRIPTION'].includes(c.sourceVerificationMethod)
          || createHash('sha256').update(chunk.text, 'utf8').digest('hex') !== c.chunkTextSha256;
      })) {
    throw new Error(`Incomplete source verification: ${name}. Run Extract and resolve pending transcriptions.`);
  }
  await copyFile(path.join(extracted, 'outcomes.md'), path.join(output, `${name}.md`));
  await copyFile(path.join(extracted, 'source-verification.json'), path.join(output, `${name}-verification.json`));
  // Refresh the prior audit location too, so it cannot retain the old automatic visual-review claim.
  await mkdir(path.join(evidence, 'chunk-audit', name), { recursive: true });
  await copyFile(path.join(extracted, 'source-verification.json'), path.join(evidence, 'chunk-audit', name, 'source-verification.json'));
  for (const file of await readdir(extracted)) {
    if (/^page-\d+\.txt$/.test(file)) {
      await copyFile(path.join(extracted, file), path.join(output, 'raw-pages', file));
    }
  }
  const primary = chunks.filter(c => !c.control);
  scopes.push({ name, subject: primary[0].subject, grade: primary[0].gradeLevel, count: primary.length });
  for (const chunk of primary) {
    for (const fragment of chunk.sourceFragments) {
      const key = `${chunk.subject}/${chunk.gradeLevel}/${fragment.pdfPage}`;
      const page = pages.get(key) ?? { manifest, chunks: new Map(), fragment };
      page.chunks.set(chunk.chunkId, chunk);
      pages.set(key, page);
    }
  }
}

for (const [key, page] of pages) {
  const [subject, gradeLabel, pageNumber] = key.split('/');
  const grade = gradeLabel.replace('GRADE_', '');
  const replacementName = `${subject.toLowerCase()}-grade${grade}-pdf-${pageNumber}.md`;
  const raw = await readFile(path.join(output, 'raw-pages', `page-${pageNumber}.txt`), 'utf8');
  let text = `# ${subject.toUpperCase()} GRADE_${grade} — PDF ${pageNumber}\n\n`;
  text += `Source: ${page.manifest.sourceDocument}\n\nSHA-256: ${page.manifest.sourceSha256}\n\n`;
  text += 'This is a text replacement for the earlier page image. PDFBox text below is uncorrected; '
    + 'stacked fractions and superscripts may be reordered. The separately checked UTF-8 outcomes follow. '
    + 'AI transcription review does not constitute teacher approval.\n\n## Source text (PDFBox)\n\n```text\n' + raw + '\n```\n';
  text += '\n## Outcome transcriptions and citations\n';
  for (const chunk of page.chunks.values()) {
    text += `\n### ${chunk.chunkId} — ${chunk.topic}\n\n${chunk.text}\n\n`;
    for (const fragment of chunk.sourceFragments) {
      text += `PDF ${fragment.pdfPage}; printed page ${fragment.printedPage}; method ${fragment.region}.\n`;
    }
  }
  await writeFile(path.join(output, replacementName), text, 'utf8');
}

let index = '# Tài liệu Curriculum RAG dạng văn bản\n\n';
index += 'Toán, Tiếng Việt và Tiếng Anh lớp 1–5. Tất cả tài liệu ở đây là UTF-8 có thể đọc, sao chép và tìm kiếm. '
  + 'PDF gốc được giữ làm nguồn; không dùng PNG/ảnh làm tài liệu RAG.\n\n';
index += '| Môn | Lớp | Outcome chunks | Nội dung và trang nguồn |\n|---|---|---:|---|\n';
for (const scope of scopes) index += `| ${scope.subject} | ${scope.grade} | ${scope.count} | [${scope.name}](${scope.name}.md) |\n`;
index += '\n`raw-pages/` chứa bản trích xuất PDFBox nguyên trạng. Các bản chép phân số/ký hiệu được đối chiếu riêng '
  + 'trong `backend/src/main/resources/curriculum/spike/text-transcriptions.jsonl`, có hash nguồn, trang, người đối chiếu và ngày. '
  + 'Việc đối chiếu này do AI thực hiện, không phải phê duyệt sư phạm.\n\n';
index += 'Tạo lại: chạy `scripts/rag-spike.ps1 -Mode Extract` với PDF nguồn, sau đó `node scripts/export-rag-text.mjs`. '
  + 'Script dừng nếu bất kỳ scope nào chưa được xác minh đầy đủ.\n';
await writeFile(path.join(output, 'README.md'), index, 'utf8');
console.log(`Exported ${scopes.length} scope documents and ${pages.size} page documents; source pages are searchable TXT.`);
