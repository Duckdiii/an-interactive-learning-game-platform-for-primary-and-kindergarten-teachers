// Phân tích unified diff của GitHub: với mỗi file, ghi lại các dòng có thể gắn comment (phía RIGHT).
// Trả về Map<đường-dẫn, Map<số-dòng-mới, nội-dung-dòng>>. Gồm cả dòng thêm và dòng ngữ cảnh trong hunk.

const HUNK = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

function cleanPath(raw) {
  let p = raw.replace(/\t.*$/, "").trim();
  // Đường dẫn có ký tự đặc biệt được GitHub bọc trong dấu nháy (không giải mã escape bát phân).
  if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1);
  return p;
}

export function parseDiff(text) {
  const files = new Map();
  let current = null;
  let oldLeft = 0;
  let newLeft = 0;
  let right = 0;
  for (const line of text.split("\n")) {
    if (oldLeft > 0 || newLeft > 0) {
      // Đang trong hunk: đếm theo số dòng khai báo để không nhầm dòng nội dung bắt đầu bằng "+++ ".
      const c = line[0];
      if (c === "\\") continue;
      if (c === "+") {
        current?.set(right, line.slice(1));
        right++;
        newLeft--;
      } else if (c === "-") {
        oldLeft--;
      } else {
        current?.set(right, line.slice(1));
        right++;
        oldLeft--;
        newLeft--;
      }
      continue;
    }
    if (line.startsWith("diff --git ")) {
      current = null;
    } else if (line.startsWith("+++ ")) {
      const p = cleanPath(line.slice(4));
      if (p === "/dev/null") {
        current = null;
      } else {
        const name = p.replace(/^b\//, "");
        current = files.get(name) ?? new Map();
        files.set(name, current);
      }
    } else {
      const m = HUNK.exec(line);
      if (m) {
        oldLeft = m[1] === undefined ? 1 : Number(m[1]);
        newLeft = m[3] === undefined ? 1 : Number(m[3]);
        right = Number(m[2]);
      }
    }
  }
  return files;
}
