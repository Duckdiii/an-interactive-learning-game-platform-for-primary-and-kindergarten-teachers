// Kiểm tra JSON theo một tập con của JSON Schema, không dùng thư viện ngoài.
// Cố ý ném lỗi khi gặp từ khóa chưa hỗ trợ để schema không bị "bỏ qua" âm thầm.
const SUPPORTED = new Set([
  "$schema", "title", "description", "type", "enum", "const", "required", "properties",
  "additionalProperties", "items", "minItems", "maxItems", "minLength", "maxLength",
  "minimum", "maximum", "pattern",
]);

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);
const matchesType = (v, t) => (t === "number" ? typeof v === "number" : typeOf(v) === t);

export function validate(value, schema, path = "$") {
  const errors = [];
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED.has(key)) throw new Error(`Từ khóa schema chưa hỗ trợ: ${key} (tại ${path})`);
  }
  if ("const" in schema && value !== schema.const) errors.push(`${path}: phải bằng ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: phải thuộc ${JSON.stringify(schema.enum)}`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push(`${path}: sai kiểu (cần ${types.join("|")}, nhận ${typeOf(value)})`);
      return errors;
    }
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: ngắn hơn ${schema.minLength} ký tự`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path}: dài hơn ${schema.maxLength} ký tự`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: không khớp mẫu ${schema.pattern}`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: nhỏ hơn ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: lớn hơn ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: ít hơn ${schema.minItems} phần tử`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: nhiều hơn ${schema.maxItems} phần tử`);
    if (schema.items) value.forEach((v, i) => errors.push(...validate(v, schema.items, `${path}[${i}]`)));
  }
  if (typeOf(value) === "object") {
    for (const r of schema.required ?? []) if (!(r in value)) errors.push(`${path}: thiếu trường bắt buộc "${r}"`);
    const props = schema.properties ?? {};
    for (const [k, v] of Object.entries(value)) {
      if (k in props) errors.push(...validate(v, props[k], `${path}.${k}`));
      else if (schema.additionalProperties === false) errors.push(`${path}: trường không được phép "${k}"`);
    }
  }
  return errors;
}
