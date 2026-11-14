// Ma trận sprite pixel art đa sắc & hàm vẽ nền hầm ngục
export type PixelPalette = Record<string, string>;

// 16x18 Nhân vật chính (mũ xanh, tóc vàng, áo giáp lá, thắt lưng, ủng)
export const HERO_IDLE_ROWS = [
  '.....OOOOOO.....',
  '....OLLLLLLO....',
  '...OLMMMMMMLO...',
  '...OMMMMMMMMO...',
  '..OODDDDDDDDOO..',
  '..OYYYYYYYYYYO..',
  '..OYSSSSSSSSYO..',
  '..OOSKSSSSKSOO..',
  '...OSSSSSSSSO...',
  '...OOMMMMMMOO...',
  '..OOMMLMMMLMOO..',
  '..OSMBBBBBBMSSO.',
  '..OSMGGGGGGMSSO.',
  '...OMMMMMMMMO...',
  '...OMMM..MMMO...',
  '...ODDD..DDDO...',
  '...OBBB..BBBO...',
  '..OOKKO..OKKOO..',
];

export const HERO_WALK_ROWS = [
  '.....OOOOOO.....',
  '....OLLLLLLO....',
  '...OLMMMMMMLO...',
  '...OMMMMMMMMO...',
  '..OODDDDDDDDOO..',
  '..OYYYYYYYYYYO..',
  '..OYSSSSSSSSYO..',
  '..OOSKSSSSKSOO..',
  '...OSSSSSSSSO...',
  '...OOMMMMMMOO...',
  '..OOMMLMMMLMOO..',
  '.OOSMBBBBBBMSS..',
  '.OSSMGGGGGGMSS..',
  '...OMMMMMMMMO...',
  '..OOMMO..OMMOO..',
  '..OBBBO...ODDDO.',
  '..OKKKO....OBBBO',
  '...........OKKKO',
];

export const HERO_GREEN_PAL: PixelPalette = {
  O: '#0b1410',
  L: '#86efac',
  M: '#22c55e',
  D: '#15803d',
  Y: '#facc15',
  S: '#fcd5a5',
  K: '#111827',
  B: '#78350f',
  G: '#fbbf24',
};

export const HERO_GOLD_PAL: PixelPalette = {
  O: '#1f1206',
  L: '#fef08a',
  M: '#f59e0b',
  D: '#b45309',
  Y: '#fde047',
  S: '#fcd5a5',
  K: '#111827',
  B: '#7c2d12',
  G: '#38bdf8',
};

// 16x16 Nhân vật ẩn danh nobody (áo choàng xám chàm, mắt vàng)
export const NOBODY_ROWS = [
  '.....OOOOOO.....',
  '....OCCCCCCCO...',
  '...OCCLLLLCCO...',
  '...OCDDDDDDCO...',
  '..OCDDKKKKDDCO..',
  '..OCDKAAKKADKO..',
  '..OCDDKKKKDDCO..',
  '...OCCCCCCCCO...',
  '..OCCDDDDDDCCO..',
  '..OCDDDDDDDDCO..',
  '..OSCDDDDDDCSO..',
  '..OOCDDDDDDCOO..',
  '...OCDDDDDDCO...',
  '...OCCDDDDCCO...',
  '...OCC....CCO...',
  '..OKKO....OKKO..',
];

export const NOBODY_PAL: PixelPalette = {
  O: '#090d16',
  C: '#475569',
  L: '#94a3b8',
  D: '#334155',
  K: '#0f172a',
  A: '#fbbf24',
  S: '#cbd5e1',
};

// 10x13 Đuốc tường chuyển động 2 khung hình
export const TORCH_A_ROWS = [
  '....WW....',
  '...WYYW...',
  '..WYYYYW..',
  '..OYYYYO..',
  '.OOYYYYOO.',
  '.ORRRRRRO.',
  '..ORRRRO..',
  '..OOOOOO..',
  '..OBBBBO..',
  '...OBBO...',
  '...OBBO...',
  '...OBBO...',
  '..OODDOO..',
];

export const TORCH_B_ROWS = [
  '...WW.....',
  '..WYYWW...',
  '..WYYYYW..',
  '.OOYYYYO..',
  '.OYYYYYOO.',
  '.ORRRRRRO.',
  '..ORRRRO..',
  '..OOOOOO..',
  '..OBBBBO..',
  '...OBBO...',
  '...OBBO...',
  '...OBBO...',
  '..OODDOO..',
];

export const TORCH_PAL: PixelPalette = {
  W: '#fef9c3',
  Y: '#facc15',
  R: '#f97316',
  O: '#1c1917',
  B: '#78350f',
  D: '#451a03',
};

// 16x12 Rương báu đóng và mở
export const CHEST_CLOSED_ROWS = [
  '..OOOOOOOOOOOO..',
  '.OGGGGGGGGGGGGO.',
  '.OGBWWWWWWWWBGO.',
  '.OGBBBBBBBBBBGO.',
  '.OGGGGGGGGGGGGO.',
  'OOGGGGOYYOGGGGOO',
  'OBBBBBOGGOBBBBBO',
  'OBBBBBOOOOBBBBBO',
  'OBBBBBBBBBBBBBBO',
  'ODDDDDDDDDDDDDDO',
  'OGGGGGGGGGGGGGGO',
  '.OOOOOOOOOOOOOO.',
];

export const CHEST_OPEN_ROWS = [
  '..OOOOOOOOOOOO..',
  '.OGBWWWWWWWWBGO.',
  '.OGBBBBBBBBBBGO.',
  '.OGGGGGGGGGGGGO.',
  'OOKKKKKKKKKKKKOO',
  'OKKKKKYYYYKKKKKO',
  'OGGGYYYYYYYYGGGO',
  'OBBBBBBBBBBBBBBO',
  'ODDDDDDDDDDDDDDO',
  'ODDDDDDDDDDDDDDO',
  'OGGGGGGGGGGGGGGO',
  '.OOOOOOOOOOOOOO.',
];

export const CHEST_PAL: PixelPalette = {
  O: '#1c140d',
  G: '#facc15',
  W: '#b45309',
  B: '#92400e',
  D: '#57260b',
  Y: '#fef08a',
  K: '#090d16',
};

// 10x12 Chìa khóa vàng
export const KEY_ROWS = [
  '...OOOO...',
  '..OYYYYO..',
  '.OYO..OYO.',
  '.OYO..OYO.',
  '..OYYYYO..',
  '...OYYO...',
  '...OYYO...',
  '...OYYYO..',
  '...OYYO...',
  '...OYYYO..',
  '...OYYO...',
  '....OO....',
];

export const KEY_PAL: PixelPalette = {
  O: '#422006',
  Y: '#facc15',
};

// 14x13 Cuộn giấy cấu hình
export const SCROLL_ROWS = [
  '..OOOOOOOOOO..',
  '.OWWWWWWWWWWO.',
  'OOWPPWWWWWWPOO',
  'OO.OWWWWWWO.OO',
  '...OWLLLLWO...',
  '...OWWWWWWO...',
  '...OWLLLLWO...',
  '...OWWWWWWO...',
  '...OWRRRRWO...',
  '..OOWWWWWWO...',
  '.OWWWWWWWWWWO.',
  '.OYYYYYYYYYYO.',
  '..OOOOOOOOOO..',
];

export const SCROLL_PAL: PixelPalette = {
  O: '#1e1b18',
  W: '#fef3c7',
  P: '#d97706',
  L: '#64748b',
  R: '#ef4444',
  Y: '#eab308',
};

// 12x15 Kiếm sắt thường / Kiếm SUID phát sáng
export const SWORD_ROWS = [
  '.....OO.....',
  '....OLLO....',
  '....OLLO....',
  '....OMMO....',
  '....OMMO....',
  '....OMMO....',
  '....OMMO....',
  '....OMMO....',
  '....OMMO....',
  '.OOOGGGGOOO.',
  '.OGGGGGGGGO.',
  '..OOOBBOOO..',
  '....OBBO....',
  '....OGGO....',
  '.....OO.....',
];

export const SWORD_IRON_PAL: PixelPalette = {
  O: '#0f172a',
  L: '#e2e8f0',
  M: '#94a3b8',
  G: '#64748b',
  B: '#475569',
};

export const SWORD_SUID_PAL: PixelPalette = {
  O: '#2e0b16',
  L: '#fef08a',
  M: '#ef4444',
  G: '#facc15',
  B: '#991b1b',
};

// 16x16 Trụ mắt giám sát SSH (Phòng 6)
export const SENTRY_EYE_ROWS = [
  '....OOOOOOOO....',
  '...OSSSSSSSSO...',
  '..OSLLLLLLLLSO..',
  '..OSDDDDDDDDSO..',
  '.OOSDDKKKKDDSOO.',
  '.OSDDKWWWWKDDOS.',
  '.OSDDKWCCWKDDOS.',
  '.OSDDKWWWWKDDOS.',
  '..OSDDKKKKDDSO..',
  '..OSSSSSSSSSSO..',
  '..OSDDDDDDDDSO..',
  '.OOSGGGGGGGGSOO.',
  '.OSSDDDDDDDDSSO.',
  '.OSSDDDDDDDDSSO.',
  'OOSSDDDDDDDDSSOO',
  'OOOOOOOOOOOOOOOO',
];

export const SENTRY_EYE_PAL: PixelPalette = {
  O: '#0f172a',
  S: '#64748b',
  L: '#cbd5e1',
  D: '#334155',
  K: '#090d16',
  W: '#f8fafc',
  C: '#ef4444',
  G: '#38bdf8',
};

// 16x11 Huy hiệu vàng hoàn thành 6/6 phòng
export const CREST_ROWS = [
  '.......OO.......',
  '......OYYO......',
  '.....OYYYYO.....',
  '....OYYWWYYO....',
  '...OYYYYYYYYO...',
  '..OYYOYYYYOYYO..',
  '..OYYO.OO.OYYO..',
  '.OYYYYO..OYYYYO.',
  'OYYWWYYOOYYWWYYO',
  'OYYYYYYYYYYYYYYO',
  'OOOOOOOOOOOOOOOO',
];

export const CREST_PAL: PixelPalette = {
  O: '#422006',
  Y: '#facc15',
  W: '#fef9c3',
};

// 14x8 Bụi cây sân ngoài
export const BUSH_ROWS = [
  '....OOOOOO....',
  '..OOLHHHHLOO..',
  '.OLHHHHHHHHLO.',
  '.OHMMMMLLMMHO.',
  'OHMMMLLLLMMMHO',
  'OHMMMMMMMMDDHO',
  'ODDDDDDDDDDDDO',
  '.OODDDDDDDDOO.',
];

export const BUSH_PAL: PixelPalette = {
  O: '#0c2912',
  H: '#4ade80',
  L: '#86efac',
  M: '#22c55e',
  D: '#15803d',
};

// 14x12 Cửa gỗ đóng và mở
export const DOOR_LOCKED_ROWS = [
  '..OOOOOOOOOO..',
  '.OSSSSSSSSSSO.',
  'OSSBBBBBBBBSSO',
  'OSBWWBBBBWWBSO',
  'OSBBBBBBBBBBBS',
  'OSBBBBYYBBBBBS',
  'OSBWWBYYBWWBBS',
  'OSBBBBBBBBBBBS',
  'OSBDDDDDDDDBSO',
  'OSBDDDDDDDDBSO',
  'OSBBBBBBBBBBBS',
  'OOOOOOOOOOOOOO',
];

export const DOOR_OPEN_ROWS = [
  '..OOOOOOOOOO..',
  '.OSSSSSSSSSSO.',
  'OSSKKKKKKKKSSO',
  'OSKGGGGGGGGKSO',
  'OSKGGYYYYGGKSO',
  'OSKGYYYYYYGKSO',
  'OSKGYYYYYYGKSO',
  'OSKGGYYYYGGKSO',
  'OSKGGGGGGGGKSO',
  'OSKKKKKKKKKKSO',
  'OSKKKKKKKKKKSO',
  'OOOOOOOOOOOOOO',
];

export const DOOR_PAL: PixelPalette = {
  O: '#0f172a',
  S: '#64748b',
  B: '#78350f',
  W: '#b45309',
  D: '#451a03',
  Y: '#facc15',
  K: '#05080f',
  G: '#22c55e',
};

// 12x14 Cột đá góc phòng
export const PILLAR_ROWS = [
  '.OOOOOOOOOO.',
  'OLLLLLLLLLLO',
  'OSSSMMMMSSSO',
  '.OSSSSSSSSO.',
  '.OSLLSSDDSSO',
  '.OSLLSSDDSSO',
  '.OSLLSSDDSSO',
  '.OSLLSSDDSSO',
  '.OSLLSSDDSSO',
  '.OSLLSSDDSSO',
  '.OSSSSSSSSO.',
  'OSSSDDDDSSSS',
  'ODDDDDDDDDDO',
  'OOOOOOOOOOOO',
];

export const PILLAR_PAL: PixelPalette = {
  O: '#0b1120',
  L: '#cbd5e1',
  S: '#64748b',
  M: '#94a3b8',
  D: '#334155',
};

export function drawPixelSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  px: number,
  rows: string[],
  pal: PixelPalette,
  flipX = false,
) {
  const w = rows[0].length * px;
  const h = rows.length * px;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  if (flipX) ctx.scale(-1, 1);
  const ox = -Math.round(w / 2);
  const oy = -Math.round(h / 2);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      const fill = ch === '.' ? undefined : pal[ch];
      let run = 1;
      while (c + run < row.length && row[c + run] === ch) run++;
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(ox + c * px, oy + r * px, run * px, px);
      }
      c += run;
    }
  }
  ctx.restore();
}

export function drawPixelSparkles(ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number, color = '#fef08a') {
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const ang = now * 0.004 + i * (Math.PI / 3);
    const rad = 18 + ((now * 0.03 + i * 9) % 22);
    const sx = Math.round(cx + Math.cos(ang) * rad);
    const sy = Math.round(cy + Math.sin(ang) * (rad * 0.65) - 6);
    ctx.fillStyle = i % 2 === 0 ? color : '#ffffff';
    ctx.fillRect(sx - 2, sy, 5, 1);
    ctx.fillRect(sx, sy - 2, 1, 5);
  }
  ctx.restore();
}

export function drawPixelDungeonRoom(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  now: number,
  options: {
    wallColor?: string;
    floorA?: string;
    floorB?: string;
    torches?: boolean;
    carpetColor?: string;
    pillars?: boolean;
  } = {},
) {
  const wallH = 44;
  const tile = 20;
  const floorA = options.floorA ?? '#192334';
  const floorB = options.floorB ?? '#1d293c';
  const wallColor = options.wallColor ?? '#283548';

  ctx.fillStyle = wallColor;
  ctx.fillRect(0, 0, W, wallH);
  ctx.fillStyle = '#384963';
  ctx.fillRect(0, 0, W, 6);
  ctx.fillStyle = '#141c29';
  ctx.fillRect(0, wallH - 6, W, 6);

  ctx.fillStyle = '#172030';
  for (let bx = 0; bx < W; bx += 28) {
    ctx.fillRect(bx, 6, 2, 16);
    ctx.fillRect(bx + 14, 22, 2, 16);
  }
  ctx.fillRect(0, 22, W, 2);

  for (let y = wallH; y < H; y += tile) {
    for (let x = 0; x < W; x += tile) {
      const gx = Math.floor(x / tile);
      const gy = Math.floor(y / tile);
      const odd = ((gx + gy) & 1) === 1;
      ctx.fillStyle = odd ? floorA : floorB;
      ctx.fillRect(x, y, tile, tile);
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.fillRect(x + 1, y + 1, tile - 2, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x, y + tile - 1, tile, 1);
      ctx.fillRect(x + tile - 1, y, 1, tile);
      if ((gx * 7 + gy * 13) % 11 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(x + 6, y + 7, 5, 1);
        ctx.fillRect(x + 10, y + 8, 2, 3);
      }
    }
  }

  if (options.carpetColor) {
    const cw = Math.round(W * 0.62);
    const cx = Math.round((W - cw) / 2);
    const cy = wallH + 10;
    const ch = Math.max(40, H - cy - 16);
    ctx.fillStyle = options.carpetColor;
    ctx.fillRect(cx, cy, cw, ch);
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 3, cy + 3, cw - 6, ch - 6);
  }

  if (options.pillars !== false && W >= 360) {
    drawPixelSprite(ctx, 22, 56, 2, PILLAR_ROWS, PILLAR_PAL);
    drawPixelSprite(ctx, W - 22, 56, 2, PILLAR_ROWS, PILLAR_PAL);
  }

  if (options.torches !== false) {
    const flameFrame = Math.floor(now / 170) % 2 === 0;
    const torchRows = flameFrame ? TORCH_A_ROWS : TORCH_B_ROWS;
    const positions = [58, W - 58];
    positions.forEach((tx) => {
      const pulse = 0.16 + Math.sin(now * 0.012 + tx) * 0.04;
      const grad = ctx.createRadialGradient(tx, 22, 4, tx, 22, 48);
      grad.addColorStop(0, `rgba(250, 204, 21, ${pulse})`);
      grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(tx - 48, 0, 96, 74);
      drawPixelSprite(ctx, tx, 24, 2, torchRows, TORCH_PAL);
    });
  }
}

export function drawPixelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  border: string,
) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  ctx.fillStyle = fill;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.fillStyle = border;
  ctx.fillRect(rx + 2, ry + 2, 3, 3);
  ctx.fillRect(rx + rw - 5, ry + 2, 3, 3);
  ctx.fillRect(rx + 2, ry + rh - 5, 3, 3);
  ctx.fillRect(rx + rw - 5, ry + rh - 5, 3, 3);
}

export function drawBannerText(ctx: CanvasRenderingContext2D, cx: number, y: number, text: string, color: string) {
  ctx.save();
  ctx.font = 'bold 12px ui-monospace, monospace';
  const tw = ctx.measureText(text).width;
  const bw = Math.min(480, tw + 26);
  const bx = Math.round(cx - bw / 2);
  drawPixelBox(ctx, bx, y, bw, 24, '#0f172a', color);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, Math.round(cx), y + 16, bw - 14);
  ctx.restore();
}
