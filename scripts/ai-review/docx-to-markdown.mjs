// Chuyển .docx sang Markdown, không dùng thư viện ngoài (chỉ node:zlib).
// Chỉ đọc word/document.xml: đoạn văn, heading, danh sách, bảng. Ảnh/sơ đồ được thay bằng dòng ghi chú.
import { inflateRawSync } from "node:zlib";

/** Đọc một entry trong file zip (đủ cho .docx: STORED hoặc DEFLATE). */
export function readZipEntry(buf, entryName) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("Không phải file zip hợp lệ");
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Central directory hỏng");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    if (name === entryName) {
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(start, start + compSize);
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data);
      throw new Error(`Phương thức nén ${method} chưa hỗ trợ`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`Không thấy ${entryName} trong file`);
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()];
  });

/** Parser XML tối giản, đủ cho document.xml của Word. */
export function parseXml(xml) {
  const root = { name: "#root", attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[5] !== undefined) {
      stack[stack.length - 1].children.push({ name: "#text", text: decode(m[5]) });
    } else if (m[2]) {
      if (m[1]) {
        stack.pop();
      } else {
        const attrs = {};
        for (const a of m[3].matchAll(/([\w:.-]+)="([^"]*)"/g)) attrs[a[1]] = decode(a[2]);
        const node = { name: m[2], attrs, children: [] };
        stack[stack.length - 1].children.push(node);
        if (!m[4]) stack.push(node);
      }
    }
  }
  return root;
}

const kids = (n, name) => n.children.filter((c) => c.name === name);
const kid = (n, name) => n.children.find((c) => c.name === name);

function runText(node) {
  let out = "";
  for (const c of node.children) {
    if (c.name === "w:t") out += c.children.map((t) => t.text ?? "").join("");
    else if (c.name === "w:tab") out += " ";
    else if (c.name === "w:br") out += "<br>";
    else if (c.name === "w:drawing" || c.name === "w:pict" || c.name === "mc:AlternateContent") out += "[hình ảnh]";
    else if (c.name === "w:r" || c.name === "w:hyperlink" || c.name === "w:smartTag" || c.name === "w:sdt" || c.name === "w:sdtContent") out += runText(c);
  }
  return out;
}

function paragraphInfo(p) {
  const pPr = kid(p, "w:pPr");
  const style = pPr && kid(pPr, "w:pStyle")?.attrs["w:val"];
  const numPr = pPr && kid(pPr, "w:numPr");
  const ilvl = numPr ? Number(kid(numPr, "w:ilvl")?.attrs["w:val"] ?? 0) : null;
  return { text: runText(p).replace(/\s+/g, " ").trim(), style: style ?? "", list: numPr ? ilvl : null };
}

// Ký tự | trong ô bảng phải được escape thành \| nếu không sẽ tạo thêm cột và làm lệch dữ liệu.
export const escCell = (s) => s.replace(/\|/g, "\\|");

function tableToMarkdown(tbl) {
  const rows = kids(tbl, "w:tr").map((tr) =>
    kids(tr, "w:tc").map((tc) => {
      const parts = [];
      for (const c of tc.children) {
        if (c.name === "w:p") {
          const t = paragraphInfo(c).text;
          if (t) parts.push(t);
        } else if (c.name === "w:tbl") {
          parts.push("[bảng lồng nhau]");
        }
      }
      return escCell(parts.join("<br>"));
    }),
  );
  if (!rows.length) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r) => [...r, ...Array(width - r.length).fill("")];
  const lines = [`| ${pad(rows[0]).join(" | ")} |`, `| ${Array(width).fill("---").join(" | ")} |`];
  for (const r of rows.slice(1)) lines.push(`| ${pad(r).join(" | ")} |`);
  return lines.join("\n");
}

/** Trả về mảng khối {type, level?, text} theo đúng thứ tự trong tài liệu. */
export function docxToBlocks(docxBuffer) {
  const xml = readZipEntry(docxBuffer, "word/document.xml").toString("utf8");
  const body = kid(kid(parseXml(xml), "w:document"), "w:body");
  const blocks = [];
  for (const c of body.children) {
    if (c.name === "w:p") {
      const { text, style, list } = paragraphInfo(c);
      if (!text) continue;
      const h = /^Heading(\d)$/i.exec(style);
      if (h) blocks.push({ type: "heading", level: Number(h[1]), text });
      else if (list !== null) blocks.push({ type: "list", level: list, text });
      else blocks.push({ type: "para", text });
    } else if (c.name === "w:tbl") {
      const md = tableToMarkdown(c);
      if (md) blocks.push({ type: "table", text: md });
    }
  }
  return blocks;
}

export function blocksToMarkdown(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.type === "heading") out.push(`${"#".repeat(b.level)} ${b.text}`);
    else if (b.type === "list") out.push(`${"  ".repeat(b.level)}- ${b.text}`);
    else out.push(b.text);
  }
  // Dòng danh sách liền nhau thì không chèn dòng trống giữa chúng.
  return out.reduce((acc, line, i) => {
    const prevList = i > 0 && blocks[i - 1].type === "list";
    const curList = blocks[i].type === "list";
    return acc + (i === 0 ? "" : prevList && curList ? "\n" : "\n\n") + line;
  }, "") + "\n";
}
