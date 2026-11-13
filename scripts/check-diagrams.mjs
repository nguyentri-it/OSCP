// Kiểm tra hiển thị mọi sơ đồ (ConceptMap, SequenceDiagram) trong bài học, chạy lúc build.
// Đọc toạ độ khai báo trong file .mdx, dựng lại hình học bằng đúng các hàm mà component dùng
// (src/lib/diagram-layout.js), rồi đối chiếu với các tiêu chí hiển thị trong CONTRIBUTING.md.
// Có lỗi thì in ra và thoát với mã 1 để build dừng lại.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  nodeSize, nodeRect, edgeGeom, zoneLabelRect, textWidth,
  CMAP, SEQ, seqLayout, seqActorWidth,
} from '../src/lib/diagram-layout.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src/content/lessons');

// ---- Tiêu chí (đơn vị: px trong hệ toạ độ viewBox) ----
const T = {
  frame: 8, // ô cách mép khung sơ đồ tối thiểu
  gap: 14, // khoảng trống tối thiểu giữa hai ô
  zonePad: 8, // ô cách viền vùng tối thiểu
  minEdge: 22, // đường nối ngắn nhất (đủ chỗ thấy mũi tên)
  edgeClear: 3, // đường nối phải cách ô không liên quan tối thiểu
  maxWidth: 760, // viewBox rộng hơn mức này thì chữ bị thu quá nhỏ
};
const TONES = new Set([undefined, 'accent', 'warn', 'muted', 'bad', 'good']);

// ---- Đọc props JSX từ MDX ----
function readBalanced(s, i, open, close) {
  let depth = 0;
  let q = null;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (q) {
      if (c === '\\') { j++; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') q = c;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return j;
  }
  throw new Error('Không tìm thấy dấu đóng');
}

function parseTags(src, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b`, 'g');
  let m;
  while ((m = re.exec(src))) {
    const props = {};
    let i = m.index + tag.length + 1;
    const line = src.slice(0, m.index).split('\n').length;
    for (;;) {
      while (/\s/.test(src[i])) i++;
      if (src.startsWith('/>', i) || src[i] === '>') break;
      const nm = /^[\w:-]+/.exec(src.slice(i))[0];
      i += nm.length;
      if (src[i] !== '=') { props[nm] = true; continue; }
      i++;
      if (src[i] === '"' || src[i] === "'") {
        const end = src.indexOf(src[i], i + 1);
        props[nm] = src.slice(i + 1, end);
        i = end + 1;
      } else if (src[i] === '{') {
        const end = readBalanced(src, i, '{', '}');
        props[nm] = new Function(`return (${src.slice(i + 1, end)});`)();
        i = end + 1;
      } else throw new Error(`Thuộc tính ${nm} không đọc được`);
    }
    out.push({ line, props });
  }
  return out;
}

// ---- Hình học ----
const grow = (r, d) => ({ x1: r.x1 - d, y1: r.y1 - d, x2: r.x2 + d, y2: r.y2 + d });
const overlap = (a, b) => Math.min(a.x2, b.x2) > Math.max(a.x1, b.x1) && Math.min(a.y2, b.y2) > Math.max(a.y1, b.y1);
const inside = (a, b) => a.x1 >= b.x1 && a.y1 >= b.y1 && a.x2 <= b.x2 && a.y2 <= b.y2;
const zoneRect = (z) => ({ x1: z.x, y1: z.y, x2: z.x + z.w, y2: z.y + z.h });
const has = (r, p) => p.x >= r.x1 && p.x <= r.x2 && p.y >= r.y1 && p.y <= r.y2;
// Đoạn thẳng p→q có đi qua hình chữ nhật r không (Liang–Barsky).
function segHits(p, q, r) {
  let t0 = 0;
  let t1 = 1;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  for (const [pp, qq] of [[-dx, p.x - r.x1], [dx, r.x2 - p.x], [-dy, p.y - r.y1], [dy, r.y2 - p.y]]) {
    if (pp === 0) { if (qq < 0) return false; continue; }
    const t = qq / pp;
    if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return t1 > t0;
}
const fmt = (r) => `[${Math.round(r.x1)},${Math.round(r.y1)}–${Math.round(r.x2)},${Math.round(r.y2)}]`;

// ---- Kiểm tra ConceptMap ----
function checkConceptMap({ props }, add) {
  const W = props.width ?? 640;
  const H = props.height ?? 360;
  const nodes = props.nodes ?? [];
  const edges = props.edges ?? [];
  const zones = props.zones ?? [];
  const frame = { x1: 0, y1: 0, x2: W, y2: H };
  const inner = grow(frame, -T.frame);
  const byId = {};

  if (W > T.maxWidth) add(`khung rộng ${W} > ${T.maxWidth}: chữ sẽ bị thu quá nhỏ, chia thành hai sơ đồ hoặc xếp lại`);
  for (const n of nodes) {
    if (byId[n.id]) add(`trùng id ô "${n.id}"`);
    byId[n.id] = n;
    if (!TONES.has(n.tone)) add(`ô "${n.label}": tone "${n.tone}" không có kiểu hiển thị`);
    if (!n.detail) add(`ô "${n.label}": thiếu phần giải thích (detail)`);
  }
  const rect = Object.fromEntries(nodes.map((n) => [n.id, nodeRect(n)]));

  // 1. Khung và vùng
  for (const n of nodes) {
    if (!inside(rect[n.id], inner)) add(`ô "${n.label}" ${fmt(rect[n.id])} ra sát/ngoài khung ${W}×${H}`);
  }
  zones.forEach((z, i) => {
    const zr = zoneRect(z);
    if (!inside(zr, frame)) add(`vùng "${z.label}" ra ngoài khung ${W}×${H}`);
    const lr = zoneLabelRect(z);
    if (lr.x2 > zr.x2 - 8) add(`tên vùng "${z.label}" dài hơn vùng (cần rộng ≥ ${Math.ceil(lr.x2 - z.x + 8)})`);
    zones.slice(i + 1).forEach((o) => {
      const or = zoneRect(o);
      if (overlap(zr, or) && !inside(zr, or) && !inside(or, zr)) add(`vùng "${z.label}" và "${o.label}" đè lên nhau`);
    });
  });
  for (const n of nodes) {
    const r = rect[n.id];
    const home = zones.filter((z) => has(zoneRect(z), n));
    const z = home.sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (z) {
      const zr = zoneRect(z);
      const room = grow(zr, -T.zonePad);
      if (!inside(r, room)) add(`ô "${n.label}" ${fmt(r)} không nằm gọn trong vùng "${z.label}" (chừa ${T.zonePad}px viền)`);
    }
    for (const o of zones) {
      if (o === z || home.includes(o) && inside(zoneRect(o), zoneRect(z ?? o))) continue;
      if (overlap(r, grow(zoneRect(o), 2)) && !inside(r, zoneRect(o))) add(`ô "${n.label}" vắt qua viền vùng "${o.label}"`);
    }
  }

  // 2. Ô không đè, không dính nhau
  nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => {
    if (overlap(grow(rect[a.id], T.gap / 2), grow(rect[b.id], T.gap / 2))) {
      add(`ô "${a.label}" ${fmt(rect[a.id])} và "${b.label}" ${fmt(rect[b.id])} đè hoặc cách nhau < ${T.gap}px`);
    }
  }));

  // 3. Đường nối và nhãn đường nối
  const pills = [];
  for (const e of edges) {
    const a = byId[e.from];
    const b = byId[e.to];
    if (!a || !b) { add(`đường nối ${e.from}→${e.to} trỏ tới ô không có`); continue; }
    const g = edgeGeom(a, b, e.label);
    const name = `đường nối "${a.label}" → "${b.label}"`;
    const len = Math.hypot(g.p2.x - g.p1.x, g.p2.y - g.p1.y);
    const ax = (b.x - a.x) * (g.p2.x - g.p1.x) + (b.y - a.y) * (g.p2.y - g.p1.y);
    if (ax <= 0 || len < T.minEdge) add(`${name} quá ngắn (${Math.round(ax <= 0 ? 0 : len)}px), không thấy mũi tên: đẩy hai ô xa nhau hơn`);
    for (const n of nodes) {
      if (n === a || n === b) continue;
      if (segHits(g.p1, g.p2, grow(rect[n.id], T.edgeClear))) add(`${name} cắt ngang ô "${n.label}"`);
    }
    for (const z of zones) {
      if (segHits(g.p1, g.p2, zoneLabelRect(z))) add(`${name} cắt ngang tên vùng "${z.label}"`);
    }
    if (g.pill) {
      if (g.lw > len - 16) add(`${name}: nhãn "${e.label}" dài hơn đường nối (${Math.round(len)}px), đẩy hai ô xa nhau hoặc rút gọn nhãn`);
      for (const n of nodes) if (overlap(g.pill, grow(rect[n.id], 3))) add(`nhãn "${e.label}" đè lên ô "${n.label}"`);
      for (const z of zones) if (overlap(g.pill, zoneLabelRect(z))) add(`nhãn "${e.label}" đè lên tên vùng "${z.label}"`);
      if (!inside(g.pill, frame)) add(`nhãn "${e.label}" ra ngoài khung`);
      for (const p of pills) if (overlap(g.pill, grow(p.r, 2))) add(`nhãn "${e.label}" đè lên nhãn "${p.t}"`);
      pills.push({ r: g.pill, t: e.label });
    }
  }
  // Nhãn của mọi đường nối cũng không được nằm trên một đường nối khác.
  for (const e of edges) {
    const a = byId[e.from];
    const b = byId[e.to];
    if (!a || !b) continue;
    const g = edgeGeom(a, b, e.label);
    for (const p of pills) {
      if (p.t === e.label) continue;
      if (segHits(g.p1, g.p2, grow(p.r, -3))) add(`đường nối "${a.label}" → "${b.label}" cắt qua nhãn "${p.t}"`);
    }
  }
  // Tên vùng không bị ô che
  for (const z of zones) for (const n of nodes) {
    if (overlap(zoneLabelRect(z), grow(rect[n.id], 4))) add(`ô "${n.label}" che hoặc dính sát tên vùng "${z.label}"`);
  }
}

// ---- Kiểm tra SequenceDiagram ----
function checkSequence({ props }, add) {
  const actors = props.actors ?? [];
  const { gap, x } = seqLayout(actors.length);
  actors.forEach((a) => {
    const need = textWidth(a, SEQ.actor.size, SEQ.actor) + 16;
    if (need > seqActorWidth(a, gap)) add(`tên vai "${a}" dài hơn ô (cần ${Math.ceil(need)}px, có ${Math.floor(seqActorWidth(a, gap))}px)`);
  });
  const scenarios = props.scenarios ?? [{ name: '', steps: props.steps ?? [] }];
  for (const sc of scenarios) {
    for (const s of sc.steps) {
      const where = sc.name ? `[${sc.name}] ` : '';
      if (s.from >= actors.length || s.to >= actors.length) { add(`${where}bước "${s.label}" trỏ tới vai không có`); continue; }
      const w = textWidth(s.label, SEQ.label.size, { mono: true, bold: true });
      if (s.from === s.to) {
        if (w + 12 > SEQ.selfW) add(`${where}nhãn "${s.label}" dài hơn ô tự xử lý (${Math.ceil(w)}px > ${SEQ.selfW - 12}px)`);
      } else {
        const len = Math.abs(x(s.to) - x(s.from));
        if (w > len + 16) add(`${where}nhãn "${s.label}" dài hơn mũi tên (${Math.ceil(w)}px > ${Math.round(len)}px)`);
      }
    }
  }
}

// ---- In toạ độ để sửa sơ đồ: node scripts/check-diagrams.mjs --dump 3-1-privesc-linux.mdx ----
const dumpAt = process.argv.indexOf('--dump');
if (dumpAt > -1) {
  const src = readFileSync(join(dir, process.argv[dumpAt + 1]), 'utf8');
  for (const { line, props } of parseTags(src, 'ConceptMap')) {
    console.log(`— dòng ${line}: "${props.title}" khung ${props.width ?? 640}×${props.height ?? 360}`);
    for (const z of props.zones ?? []) console.log(`  vùng "${z.label}" x ${z.x}–${z.x + z.w}, y ${z.y}–${z.y + z.h}, tên vùng hết ở x ${Math.ceil(zoneLabelRect(z).x2)}`);
    for (const n of props.nodes ?? []) {
      const r = nodeRect(n);
      const { w, h, lines } = nodeSize(n);
      console.log(`  ${n.id.padEnd(12)} tâm (${n.x}, ${n.y}) ${Math.ceil(w)}×${h} → x ${Math.floor(r.x1)}–${Math.ceil(r.x2)}, y ${r.y1}–${r.y2}${lines.length > 1 ? ' (2 dòng)' : ''}  "${n.label}"`);
    }
  }
  process.exit(0);
}

// ---- Chạy ----
let errors = 0;
let count = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.mdx')).sort()) {
  const src = readFileSync(join(dir, file), 'utf8');
  for (const [tag, fn] of [['ConceptMap', checkConceptMap], ['SequenceDiagram', checkSequence]]) {
    for (const d of parseTags(src, tag)) {
      count++;
      const title = d.props.title ?? tag;
      const found = [];
      try {
        fn(d, (m) => found.push(m));
      } catch (err) {
        found.push(`không đọc được props: ${err.message}`);
      }
      for (const m of [...new Set(found)]) {
        console.error(`✗ ${file}:${d.line} "${title}": ${m}`);
        errors++;
      }
    }
  }
}
if (errors) {
  console.error(`\n${errors} lỗi hiển thị trong ${count} sơ đồ. Xem tiêu chí ở CONTRIBUTING.md, mục "Tiêu chí hiển thị sơ đồ".`);
  process.exit(1);
}
console.log(`✓ ${count} sơ đồ đạt tiêu chí hiển thị.`);
