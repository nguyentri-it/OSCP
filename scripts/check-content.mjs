// Kiểm tra nội dung trước khi build: đủ 52 bài, mã bài không trùng, frontmatter hợp lệ,
// và mỗi file bài học import đúng những component mà nó dùng trong thân bài.
// Chạy: node scripts/check-content.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src/content/lessons');
const EXPECTED = 52;

const errors = [];
const warnings = [];

function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const obj = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (mm) obj[mm[1]] = mm[2].replace(/^["']|["']$/g, '');
  }
  return obj;
}

const files = readdirSync(dir).filter((f) => f.endsWith('.mdx'));
const codes = new Map();

for (const file of files) {
  // Chuẩn hoá xuống dòng: bản clone trên Windows (core.autocrlf) dùng CRLF.
  const src = readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n');
  const fm = frontmatter(src);
  const where = `lessons/${file}`;

  if (!fm) {
    errors.push(`${where}: thiếu frontmatter`);
    continue;
  }
  for (const key of ['title', 'code', 'level', 'summary', 'duration']) {
    if (!fm[key]) errors.push(`${where}: thiếu trường "${key}"`);
  }
  if (fm.code) {
    if (!/^\d\.\d$/.test(fm.code)) errors.push(`${where}: code "${fm.code}" sai định dạng (cần dạng N.N)`);
    if (codes.has(fm.code)) errors.push(`${where}: trùng code "${fm.code}" với ${codes.get(fm.code)}`);
    codes.set(fm.code, file);
  }

  // Mỗi component xuất hiện trong thân bài phải được import ở đầu file.
  const body = src.replace(/^---\n[\s\S]*?\n---/, '');
  // Bỏ khối code và code trong dòng: chữ như `http://<IP Kali>/` ở đó không phải component.
  const prose = body.replace(/^\s*```[\s\S]*?^\s*```/gm, '').replace(/`[^`\n]*`/g, '');
  const imported = new Set();
  for (const m of src.matchAll(/import\s+(\w+)\s+from/g)) imported.add(m[1]);
  for (const m of prose.matchAll(/<([A-Z]\w+)[\s/>]/g)) {
    if (!imported.has(m[1])) {
      errors.push(`${where}: dùng <${m[1]}> nhưng chưa import`);
      break;
    }
  }

  // Thành phần React tương tác nên có chỉ thị client:* để hoạt động trên trang tĩnh.
  for (const comp of ['Quiz', 'SequenceDiagram', 'ConceptMap', 'Checklist', 'DecisionTree', 'CodeStepper', 'OsiLayers', 'SubnetCalculator', 'FakeTerminal', 'PermissionViz', 'HashDemo', 'QueryDemo', 'PhishingSpotter', 'CvssCalc', 'Walkthrough', 'FraudScoring', 'PromptInjectionLab', 'PatchTriage', 'ContainmentRace', 'DetectionMap', 'EmailAuthLab', 'ScenarioLab', 'ReconPathLab', 'PrivescTriage', 'PivotLab', 'ReportEvidenceLab', 'AdPathLab', 'DualMachineLab']) {
    const re = new RegExp(`<${comp}(\\s[^>]*)?>`, 's');
    const mm = body.match(re);
    if (mm && !/client:/.test(mm[0])) {
      warnings.push(`${where}: <${comp}> có thể thiếu chỉ thị client:* (sẽ không tương tác được)`);
    }
  }

  // Cảnh báo đoạn văn bản thuần liên tục quá dài (> 450 từ) không có điểm ngắt thị giác (bảng, code, callout, mô phỏng).
  const chunks = body.split(/(?:^#{2,3}\s+.*$|^```[\s\S]*?^```|^\|.*\|$|^\s*<[A-Z]\w+[\s\S]*?(?:\/>|<\/[A-Z]\w+>))/gm);
  for (const ch of chunks) {
    const words = ch.trim().split(/\s+/).filter(Boolean).length;
    if (words > 450) {
      warnings.push(`${where}: có đoạn chữ thuần liên tục ~${words} từ (>450), nên chèn bảng/sơ đồ/callout để tránh wall-of-text`);
      break;
    }
  }
}

if (files.length !== EXPECTED) {
  warnings.push(`Có ${files.length} bài, dự kiến ${EXPECTED}.`);
}

// Phải có bài ở mọi cấp (0–8).
const levels = new Set([...codes.keys()].map((c) => c.split('.')[0]));
for (const lv of ['0', '1', '2', '3', '4', '5', '6', '7', '8']) {
  if (!levels.has(lv)) errors.push(`Thiếu bài nào thuộc Cấp ${lv}`);
}

// Mọi tham chiếu "bài x.y" trong bài học, và mọi mã bài trong từ điển thuật ngữ và nhánh phòng thủ,
// phải trỏ tới một bài có thật. Bắt lỗi khi đổi mã bài mà quên sửa chỗ nhắc tới nó.
const REF = /[Bb]ài\s+(\d\.\d(?:(?:\s*,\s*|\s+và\s+|\s+hoặc\s+|\s+tới\s+)\d\.\d)*)/g;
for (const file of files) {
  const src = readFileSync(join(dir, file), 'utf8');
  for (const m of src.matchAll(REF)) {
    for (const c of m[1].match(/\d\.\d/g)) {
      if (!codes.has(c)) errors.push(`lessons/${file}: nhắc tới bài ${c} nhưng không có bài nào mang mã này`);
    }
  }
}
for (const [path, re] of [
  ['src/data/glossary.ts', /lesson: '(\d\.\d)'/g],
  ['src/data/defense-track.ts', /code: '(\d\.\d)'/g],
]) {
  const src = readFileSync(join(root, path), 'utf8');
  for (const m of src.matchAll(re)) {
    if (!codes.has(m[1])) errors.push(`${path}: trỏ tới bài ${m[1]} nhưng không có bài nào mang mã này`);
  }
}

for (const w of warnings) console.warn('  cảnh báo:', w);
if (errors.length) {
  console.error(`\n✗ Kiểm tra nội dung thất bại (${errors.length} lỗi):`);
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
console.log(`✓ Nội dung hợp lệ: ${files.length} bài, ${levels.size} cấp, không trùng mã.`);
