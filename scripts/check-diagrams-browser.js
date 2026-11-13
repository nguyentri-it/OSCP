// Kiểm tra sơ đồ SVG trên trang đang mở có bị chồng chéo không.
// Dán vào console của trình duyệt (hoặc chạy qua công cụ tự động) trên một trang bài học.
// Trả về danh sách vấn đề: chữ tràn khỏi ô, ô đè lên nhau, nhãn đè lên ô, đường nối cắt ngang ô khác.
// eslint-disable-next-line no-unused-vars
async function kiemTraSoDo() {
  await document.fonts.ready;
  const issues = [];
  const R = (b) => ({ x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y + b.height });
  const overlap = (a, b, pad = 0.5) =>
    Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1) > pad && Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1) > pad;
  const inside = (a, b, tol = 1) => a.x1 >= b.x1 - tol && a.y1 >= b.y1 - tol && a.x2 <= b.x2 + tol && a.y2 <= b.y2 + tol;
  const grow = (a, d) => ({ x1: a.x1 - d, y1: a.y1 - d, x2: a.x2 + d, y2: a.y2 + d });
  const has = (a, p) => p.x >= a.x1 && p.x <= a.x2 && p.y >= a.y1 && p.y <= a.y2;
  // Đoạn thẳng có cắt hình chữ nhật không (Liang–Barsky).
  function segHits(p, q, r) {
    let t0 = 0, t1 = 1;
    const dx = q.x - p.x, dy = q.y - p.y;
    for (const [pp, qq] of [[-dx, p.x - r.x1], [dx, r.x2 - p.x], [-dy, p.y - r.y1], [dy, r.y2 - p.y]]) {
      if (pp === 0) { if (qq < 0) return false; continue; }
      const t = qq / pp;
      if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return t1 - t0 > 0.02;
  }

  document.querySelectorAll('.sim.cmap').forEach((box, si) => {
    const svg = box.querySelector('svg');
    const name = box.querySelector('.sim-title')?.textContent || `sơ đồ ${si + 1}`;
    const vb = svg.viewBox.baseVal;
    const VB = { x1: 0, y1: 0, x2: vb.width, y2: vb.height };
    const nodes = [...svg.querySelectorAll('g.cmap-node')].map((g) => ({
      label: g.getAttribute('aria-label'),
      rect: R(g.querySelector('rect').getBBox()),
      texts: [...g.querySelectorAll('text')].map((t) => ({ t: t.textContent, b: R(t.getBBox()) })),
    }));
    const zones = [...svg.querySelectorAll('rect.cmap-zone')].map((r) => R(r.getBBox()));
    const zoneTexts = [...svg.querySelectorAll('text.cmap-zone-text')].map((t) => ({ t: t.textContent, b: R(t.getBBox()) }));
    const edgeTexts = [...svg.querySelectorAll('text.cmap-edge-text')].map((t) => ({ t: t.textContent, b: R(t.getBBox()) }));
    const lines = [...svg.querySelectorAll('g.cmap-edge line')].map((l) => ({
      p: { x: +l.getAttribute('x1'), y: +l.getAttribute('y1') },
      q: { x: +l.getAttribute('x2'), y: +l.getAttribute('y2') },
    }));
    const add = (kind, msg) => issues.push({ soDo: name, loai: kind, chiTiet: msg });

    for (const n of nodes) {
      for (const tx of n.texts) if (!inside(tx.b, n.rect, 1)) add('chữ tràn khỏi ô', `"${tx.t}" trong ô "${n.label}"`);
      if (!inside(n.rect, VB, 0)) add('ô ra ngoài khung', `"${n.label}"`);
      const touched = zones.filter((z) => overlap(n.rect, z));
      if (touched.length && !touched.some((z) => inside(n.rect, z, 0))) add('ô nằm vắt qua mép vùng', `"${n.label}"`);
    }
    nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => {
      if (overlap(grow(a.rect, 3), grow(b.rect, 3))) add('ô đè hoặc dính sát nhau', `"${a.label}" và "${b.label}"`);
    }));
    zones.forEach((z) => { if (!inside(z, VB, 0)) add('vùng ra ngoài khung', JSON.stringify(z)); });
    zoneTexts.forEach((zt, i) => {
      if (zones[i] && zt.b.x2 > zones[i].x2 - 4) add('tên vùng tràn khỏi vùng', `"${zt.t}"`);
      nodes.forEach((n) => { if (overlap(zt.b, n.rect)) add('tên vùng đè lên ô', `"${zt.t}" và "${n.label}"`); });
    });
    edgeTexts.forEach((et, i) => {
      nodes.forEach((n) => { if (overlap(et.b, n.rect)) add('nhãn đường nối đè lên ô', `"${et.t}" và "${n.label}"`); });
      edgeTexts.slice(i + 1).forEach((o) => { if (overlap(et.b, o.b)) add('hai nhãn đường nối đè nhau', `"${et.t}" và "${o.t}"`); });
      zoneTexts.forEach((zt) => { if (overlap(et.b, zt.b)) add('nhãn đường nối đè tên vùng', `"${et.t}" và "${zt.t}"`); });
    });
    for (const ln of lines) {
      for (const n of nodes) {
        const g = grow(n.rect, 6);
        if (has(g, ln.p) || has(g, ln.q)) continue;
        if (segHits(ln.p, ln.q, grow(n.rect, -2))) add('đường nối cắt ngang ô', `ô "${n.label}"`);
      }
    }
  });

  // Sơ đồ tuần tự: mở từng tình huống, hiện hết các bước rồi mới đo.
  for (const [si, box] of [...document.querySelectorAll('.sim.seq')].entries()) {
    const name = box.querySelector('.sim-title')?.textContent || `sơ đồ tuần tự ${si + 1}`;
    const tabs = [...box.querySelectorAll('.tabs button')];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const rows = () => box.querySelectorAll('g.seq-row').length;
    for (const tab of tabs.length ? tabs : [null]) {
      if (tab) { tab.click(); await wait(60); }
      const next = [...box.querySelectorAll('.sim-controls button')].find((b) => b.textContent.includes('Tiếp'));
      // Component có thể chưa hydrate: bấm rồi chờ tới khi số bước hiện ra tăng lên.
      for (let k = 0; k < 60 && next && !next.disabled; k++) {
        const before = rows();
        next.click();
        await wait(40);
        if (rows() === before) await wait(250);
      }
      if (next && !next.disabled) issues.push({ soDo: name, loai: 'không mở hết được các bước để đo', chiTiet: tab ? tab.textContent : '' });
      const svg = box.querySelector('svg');
      const vb = svg.viewBox.baseVal;
      const VB = { x1: 0, y1: 0, x2: vb.width, y2: vb.height };
      const sc = tab ? `${name} / ${tab.textContent}` : name;
      const add = (kind, msg) => issues.push({ soDo: sc, loai: kind, chiTiet: msg });
      const actors = [...svg.querySelectorAll('rect.seq-actor')].map((r, i) => ({ r: R(r.getBBox()), t: svg.querySelectorAll('text.seq-actor-text')[i] }));
      actors.forEach((a) => { if (!inside(R(a.t.getBBox()), a.r, 1)) add('tên vai tràn khỏi ô', `"${a.t.textContent}"`); });
      const texts = [];
      svg.querySelectorAll('g.seq-row').forEach((g) => {
        const t = g.querySelector('text');
        const b = R(t.getBBox());
        const self = g.querySelector('rect');
        const line = g.querySelector('line');
        if (self && !inside(b, R(self.getBBox()), 1)) add('nhãn tràn khỏi ô', `"${t.textContent}"`);
        if (line) {
          const x1 = Math.min(+line.getAttribute('x1'), +line.getAttribute('x2'));
          const x2 = Math.max(+line.getAttribute('x1'), +line.getAttribute('x2'));
          if (b.x1 < x1 - 10 || b.x2 > x2 + 10) add('nhãn dài hơn mũi tên', `"${t.textContent}"`);
        }
        if (!inside(b, VB, 0)) add('nhãn ra ngoài khung', `"${t.textContent}"`);
        texts.push({ t: t.textContent, b });
      });
      texts.forEach((a, i) => texts.slice(i + 1).forEach((o) => { if (overlap(a.b, o.b)) add('hai nhãn đè nhau', `"${a.t}" và "${o.t}"`); }));
    }
    if (tabs.length) tabs[0].click();
  }
  return issues;
}
