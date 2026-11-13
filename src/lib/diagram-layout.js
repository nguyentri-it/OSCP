// Bố cục dùng chung cho sơ đồ: component (ConceptMap, SequenceDiagram) vẽ theo các hàm này,
// và scripts/check-diagrams.mjs dùng đúng các hàm này để kiểm tra lúc build.
// Sửa ở đây là sửa cả hai nơi, nên phép kiểm tra luôn khớp với hình người học thấy.

// ---- Đo chữ ----
// Ước lượng bề rộng chữ (px) theo font Be Vietnam Pro / font mono của trang.
// Cố ý ước hơi rộng hơn thực tế một chút để ô luôn đủ chỗ cho chữ.
const NARROW = new Set([...'iljI.,:;\'|!`']);
const SEMI = new Set([...'ftr()[]{}/\\-"*']);
const WIDE = new Set([...'mwMW@%']);

/**
 * @param {string} text
 * @param {number} size cỡ chữ (px)
 * @param {{ bold?: boolean, mono?: boolean }} [opt]
 */
export function textWidth(text, size, opt = {}) {
  // Font mono: mọi ký tự rộng như nhau (~0.6em), in đậm không làm rộng thêm.
  if (opt.mono) return [...text].length * size * 0.61;
  let em = 0;
  for (const ch of text) {
    const base = ch.normalize('NFD')[0];
    if (ch === ' ') em += 0.29;
    else if (NARROW.has(base)) em += 0.3;
    else if (SEMI.has(base)) em += 0.42;
    else if (WIDE.has(base)) em += 0.9;
    else if (base >= 'A' && base <= 'Z') em += 0.7;
    else if (base >= '0' && base <= '9') em += 0.63;
    else em += 0.6;
  }
  // Hệ số đã đối chiếu với bề rộng đo thật trên trình duyệt (getBBox), dư khoảng 0–9%.
  return em * size * (opt.bold ? 1.07 : 1.03);
}

// ---- ConceptMap ----
export const CMAP = {
  defaultW: 156,
  defaultH: 52,
  padX: 13, // đệm trái/phải giữa chữ và mép ô
  label: { size: 13, bold: true },
  sub: { size: 11 },
  zoneLabel: { size: 12 },
  edgeLabel: { size: 11, bold: true },
};

// Chia nhãn dài thành tối đa 2 dòng: chọn chỗ cắt cho hai dòng dài gần bằng nhau,
// nhưng không để số thứ tự ("1.") đứng một mình cuối dòng hay "&", "+", "-" đứng đầu dòng.
function splitLines(label, maxW) {
  const lw = (t) => textWidth(t, CMAP.label.size, CMAP.label);
  if (lw(label) <= maxW) return [label];
  let best = null;
  for (let i = 1; i < label.length - 1; i++) {
    if (label[i] !== ' ') continue;
    const a = label.slice(0, i);
    const b = label.slice(i + 1);
    let score = Math.max(lw(a), lw(b));
    if (/^\d+\.$/.test(a.trim()) || /^[&+\-–→]/.test(b)) score += 1000;
    if (!best || score < best.score) best = { score, lines: [a, b] };
  }
  // Chỉ còn chỗ cắt xấu thì giữ một dòng, để ô tự nới rộng.
  return best && best.score < 1000 ? best.lines : [label];
}

/** Kích thước ô: tự nới rộng cho vừa chữ. */
export function nodeSize(n) {
  const baseW = n.w ?? CMAP.defaultW;
  const lines = splitLines(n.label, baseW - CMAP.padX * 2);
  const textW = Math.max(
    ...lines.map((l) => textWidth(l, CMAP.label.size, CMAP.label)),
    n.sub ? textWidth(n.sub, CMAP.sub.size) : 0,
  );
  const w = Math.max(baseW, Math.ceil(textW + CMAP.padX * 2));
  const h = n.h ?? (lines.length > 1 && n.sub ? 62 : lines.length > 1 ? 56 : CMAP.defaultH);
  return { w, h, lines, textW };
}

/** Hình chữ nhật của ô. */
export function nodeRect(n) {
  const { w, h } = nodeSize(n);
  return { x1: n.x - w / 2, y1: n.y - h / 2, x2: n.x + w / 2, y2: n.y + h / 2 };
}

/** Điểm trên mép ô mà đường nối từ tâm đi ra cắt qua (chừa 4px cho mũi tên). */
export function edgePoint(n, tx, ty) {
  const { w: nw, h: nh } = nodeSize(n);
  const w = nw / 2 + 4;
  const h = nh / 2 + 4;
  const dx = tx - n.x;
  const dy = ty - n.y;
  if (dx === 0 && dy === 0) return { x: n.x, y: n.y };
  const s = Math.min(Math.abs(w / (dx || 1e-9)), Math.abs(h / (dy || 1e-9)));
  return { x: n.x + dx * s, y: n.y + dy * s };
}

/** Toạ độ đường nối và ô nhãn của nó. */
export function edgeGeom(a, b, label) {
  const p1 = edgePoint(a, b.x, b.y);
  const p2 = edgePoint(b, a.x, a.y);
  // Nhãn lệch về phía gốc (0.46) để chừa chỗ cho đầu mũi tên.
  const lx = p1.x + (p2.x - p1.x) * 0.46;
  const ly = p1.y + (p2.y - p1.y) * 0.46;
  const lw = label ? Math.max(46, Math.ceil(textWidth(label, CMAP.edgeLabel.size, CMAP.edgeLabel) + 16)) : 0;
  const pill = label ? { x1: lx - lw / 2, y1: ly - 10, x2: lx + lw / 2, y2: ly + 10 } : null;
  return { p1, p2, lx, ly, lw, pill };
}

/** Khung chữ tên vùng. */
export function zoneLabelRect(z) {
  const w = textWidth(z.label, CMAP.zoneLabel.size);
  return { x1: z.x + 12, y1: z.y + 8, x2: z.x + 12 + w, y2: z.y + 24 };
}

// ---- SequenceDiagram ----
export const SEQ = {
  row: 54,
  top: 64,
  actor: { size: 14, bold: true },
  label: { size: 13, mono: true },
  selfW: 160,
};

export function seqLayout(actorCount) {
  const width = Math.max(420, actorCount * 180);
  const gap = width / actorCount;
  return { width, gap, x: (i) => gap * i + gap / 2 };
}

export function seqActorWidth(name, gap) {
  return Math.min(gap - 12, Math.max(140, textWidth(name, SEQ.actor.size, SEQ.actor) + 24));
}
