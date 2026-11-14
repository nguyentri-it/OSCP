import { useEffect, useRef, useState } from 'react';
import SimHow from './SimHow';

interface StepInfo {
  tab: string;
  cmd: string;
  callout: string;
  text: string;
}

interface MethodInfo {
  short: string;
  title: string;
  steps: [StepInfo, StepInfo, StepInfo];
  blocked: string;
}

interface HitBox {
  x: number;
  y: number;
  w: number;
  h: number;
  idx: number;
}

const METHODS: MethodInfo[] = [
  {
    short: '1. Sudo',
    title: '1. Sudo lỏng lẻo',
    steps: [
      {
        tab: '① Dò vé sudo',
        cmd: 'sudo -l',
        callout: 'Thấy vé: (root) NOPASSWD: find',
        text: 'Quét sudo -l phát hiện tài khoản jdoe được phép chạy lệnh find dưới quyền root mà không cần nhập mật khẩu.',
      },
      {
        tab: '② Mượn quyền find',
        cmd: 'sudo find . ...',
        callout: 'Lính sudo đóng dấu ROOT cho find',
        text: 'Khi gọi sudo find, hệ điều hành chạy tiến trình find dưới quyền root. Người dùng bước vào bên trong lớp vỏ quyền cao này.',
      },
      {
        tab: '③ Thoát cửa hậu',
        cmd: 'sudo find . -exec /bin/sh \\;',
        callout: 'Thoát cửa hậu -exec → shell ROOT!',
        text: 'Lợi dụng cờ -exec của find để mở lệnh con /bin/sh. Shell mới sinh ra từ tiến trình đang là root nên mang luôn quyền UID 0!',
      },
    ],
    blocked: 'sudo -l báo tài khoản không có rule NOPASSWD nào khả dụng — nhánh này an toàn.',
  },
  {
    short: '2. SUID',
    title: '2. Binary SUID',
    steps: [
      {
        tab: '① Tìm bit 4000',
        cmd: 'find / -perm -4000 2>/dev/null',
        callout: 'Thấy /usr/bin/env gắn bit 4000',
        text: 'Liệt kê file SUID thấy /usr/bin/env thuộc chủ sở hữu root và bật bit 4000 (luôn chạy bằng quyền chủ file thay vì người bấm).',
      },
      {
        tab: '② Kế thừa EUID=0',
        cmd: '/usr/bin/env ...',
        callout: 'Đi qua cổng → nhận EUID=0!',
        text: 'Khi kích hoạt env, nhân Linux tạm nâng quyền hiệu lực (EUID) của tiến trình lên 0 (quyền root của chủ file).',
      },
      {
        tab: '③ Giữ quyền sang shell',
        cmd: '/usr/bin/env /bin/sh -p',
        callout: 'Cờ -p giữ nguyên EUID=0!',
        text: 'Bình thường /bin/sh sẽ hạ quyền về user gốc; thêm cờ -p để giữ nguyên EUID=0 và nhận shell root.',
      },
    ],
    blocked: 'Chỉ thấy các binary SUID chuẩn hệ thống (passwd, sudo) — không lạm dụng được.',
  },
  {
    short: '3. Cron',
    title: '3. Cron & PATH',
    steps: [
      {
        tab: '① Soi lịch & quyền ghi',
        cmd: 'cat /etc/crontab; ls -l /opt/backup.sh',
        callout: 'Root chạy mỗi phút + file 777!',
        text: 'Phát hiện lịch Cron chạy /opt/backup.sh mỗi phút (* * * * *) dưới quyền root, nhưng quyền file -rwxrwxrwx cho phép user thường sửa.',
      },
      {
        tab: '② Gài lệnh vào script',
        cmd: 'echo "chmod +s /bin/bash" >> /opt/backup.sh',
        callout: 'Đã nhét payload vào backup.sh!',
        text: 'Bạn ghi thêm lệnh trao quyền SUID cho /bin/bash (hoặc reverse shell) vào cuối file backup.sh, rồi đứng chờ đồng hồ qua phút mới.',
      },
      {
        tab: '③ Bot root tự chạy hộ',
        cmd: '/bin/bash -p',
        callout: 'Bot Cron (root) vừa chạy hộ payload!',
        text: 'Đúng phút tiếp theo, tiến trình Cron của root tự động thực thi backup.sh và vô tình chạy luôn lệnh bạn gài bằng quyền root!',
      },
    ],
    blocked: 'Mọi script trong crontab đều chỉ cho phép root chỉnh sửa — không chèn được lệnh.',
  },
  {
    short: '4. Caps',
    title: '4. Capabilities',
    steps: [
      {
        tab: '① Soi thẻ quyền',
        cmd: 'getcap -r / 2>/dev/null',
        callout: 'python3.8 có cap_setuid=ep!',
        text: 'File python3.8 không cần bit SUID, nhưng được gán capability cap_setuid=ep — quyền hạt nhân cho phép tự đổi mã định danh UID.',
      },
      {
        tab: '② Tự đổi UID → 0',
        cmd: 'python3 -c "import os; os.setuid(0)..."',
        callout: 'Nhặt ngọc cap_setuid → os.setuid(0)!',
        text: 'Python gọi thẳng hàm hệ thống os.setuid(0). Nhân Linux thấy thẻ cap_setuid hợp lệ nên hạ UID của tiến trình từ 1000 xuống 0 (root).',
      },
      {
        tab: '③ Mở shell UID 0',
        cmd: 'os.system("/bin/sh")',
        callout: 'Shell con kế thừa UID 0!',
        text: 'Tiến trình Python lúc này đã mang UID 0, nên lệnh os.system("/bin/sh") mở ra ngay một shell toàn quyền root.',
      },
    ],
    blocked: 'Không phát hiện binary nào được cấp capability dư thừa.',
  },
  {
    short: '5. Docker',
    title: '5. Nhóm & kernel',
    steps: [
      {
        tab: '① Kiểm tra nhóm',
        cmd: 'id',
        callout: 'Phát hiện thuộc nhóm docker!',
        text: 'Lệnh id cho thấy tài khoản nằm trong nhóm docker — đồng nghĩa có quyền ra lệnh cho Docker daemon (đang chạy bằng quyền root).',
      },
      {
        tab: '② Nối ống ổ gốc /',
        cmd: 'docker run -v /:/mnt -it alpine',
        callout: 'Đào ống -v /:/mnt xuyên vào ổ /!',
        text: 'Bạn tạo 1 container alpine và gắn toàn bộ ổ đĩa gốc / của máy thật vào thư mục /mnt bên trong container, đi vòng qua mọi giới hạn user.',
      },
      {
        tab: '③ Sửa máy như root',
        cmd: 'chroot /mnt sh',
        callout: 'Chui qua /mnt chiếm kho ROOT!',
        text: 'Trong container bạn mặc định là root; chroot /mnt giúp bạn thao tác thẳng lên hệ thống tệp máy chủ với toàn quyền root.',
      },
    ],
    blocked: 'User không nằm trong nhóm đặc quyền (docker/lxd) và kernel đã được vá.',
  },
];

// Sprite matrices
const HACKER_ROWS = [
  '....OOOOOOOO....',
  '...OHHHHHHHHO...',
  '..OHHLLLLLLHHO..',
  '..OHDDDDDDDDHO..',
  '.OHDDKKKKKKDDHO.',
  '.OHDKGGKKGGKDHO.',
  '.OHDKEEKKEEKDHO.',
  '..OHDDKKKKDDHO..',
  '..OOHHHHHHHHOO..',
  '.OHHHGGGGGGHHHO.',
  '.OHHDHHHHHHDHHO.',
  '.OSHOOOOOOOOHSO.',
  '..O..OPPPPO..O..',
  '.....OPPPPO.....',
  '.....OP..PO.....',
  '.....OP..PO.....',
  '....OKK..KKO....',
  '....OSS..SSO....',
];
const HACKER_PAL: Record<string, string> = {
  O: '#10141d', H: '#2b3b55', L: '#4e678f', D: '#1d2738',
  K: '#090c12', G: '#38bdf8', E: '#0284c7', S: '#f0c498', P: '#1e2536',
};
const ROOT_HERO_PAL: Record<string, string> = {
  O: '#180c10', H: '#b91c1c', L: '#ef4444', D: '#7f1d1d',
  K: '#14080c', G: '#facc15', E: '#eab308', S: '#f5cfa0', P: '#451a1a',
};

const CROWN_ROWS = [
  '.Y...YY...Y.',
  '.YY.YYYY.YY.',
  '.YYYYYYYYYY.',
  '.YROYYYYORY.',
  '.YYYYYYYYYY.',
  '.OOOOOOOOOO.',
];
const CROWN_PAL: Record<string, string> = { Y: '#facc15', R: '#ef4444', O: '#854d0e' };

const OFFICER_ROWS = [
  '...OOOOOOOO...',
  '..OBBBBBBBBO..',
  '..OBBYYYYBBO..',
  '..OCCCCCCCCO..',
  '..OHSSSSSSHO..',
  '...OSKSSKSO...',
  '...OSSSSSSO...',
  '..OBBBBBBBBO..',
  '.OBBYYBBYYBBO.',
  '.OSBOOBBBOBSO.',
  '..O..OBBO..O..',
  '.....OBBO.....',
  '....OK..KO....',
];
const OFFICER_PAL: Record<string, string> = {
  O: '#182030', B: '#2858a8', C: '#1a3870', Y: '#f8d038',
  S: '#f8c898', H: '#243c78', K: '#141820',
};

const BOT_ROWS = [
  '.....OOOO.....',
  '....ORRRRO....',
  '..OOOOOOOOOO..',
  '.OMMMMMMMMMMO.',
  '.OMKKRRRRKKMO.',
  '.OMKKKKKKKKMO.',
  '.OMMMMMMMMMMO.',
  '..OODDDDDDOO..',
  '.OMMRRRRRRMMO.',
  '.OMDMMMMMMDMO.',
  '.OOMOOOOOOMOO.',
  '...OMM..MMO...',
  '...OKK..KKO...',
];
const BOT_PAL: Record<string, string> = {
  O: '#111622', R: '#ef4444', M: '#64748b', K: '#0f172a', D: '#334155',
};

const TREE_ROWS = [
  '....OOOOOO....',
  '..OOLHHHHLOO..',
  '.OLHHHHHHHHLO.',
  '.OHMMMMMMMMHO.',
  'OLHMMLLMMMMHLO',
  'OHMMLLLLMMDDHO',
  'OHMMMMMMMDDDHO',
  '.ODDDDDDDDDDO.',
  '..OODDDDDDOO..',
  '....OOBBBO....',
  '....OOBBBO....',
  '...ODDBBBDO...',
];
const TREE_PAL: Record<string, string> = {
  O: '#102414', H: '#4ade80', L: '#86efac', M: '#22c55e',
  D: '#15803d', B: '#854d0e',
};

const CASTLE_ROWS = [
  '.OO..OO..OO.',
  '.OR..OO..RO.',
  '.OOOOOOOOOO.',
  '.OSMMMMMMMO.',
  '.OMMMMMMMMO.',
  '.OMMOOOOMMO.',
  '.OMMODDOMMO.',
  '.OMMODDOMMO.',
  'OOOOOOOOOOOO',
];
const CASTLE_PAL: Record<string, string> = {
  O: '#1a1216', R: '#ef4444', S: '#94a3b8', M: '#475569', D: '#1e1b2e',
};
const CASTLE_WIN_PAL: Record<string, string> = {
  O: '#261414', R: '#facc15', S: '#fde047', M: '#b91c1c', D: '#facc15',
};

const GEM_ROWS = [
  '....OOOO....',
  '...OCCWCO...',
  '..OCWWWWCO..',
  '.OCCWWWWCCO.',
  '.OCBBBBBBCO.',
  '..OCBBBBCO..',
  '...OCBBCO...',
  '....OOOO....',
];
const GEM_PAL: Record<string, string> = {
  O: '#082f49', C: '#38bdf8', W: '#e0f2fe', B: '#0284c7',
};

const PADLOCK_ROWS = [
  '...OOOOOO...',
  '..OO....OO..',
  '..O......O..',
  '.OOOOOOOOOO.',
  '.OYYYYYYYYO.',
  '.OYYOYYOYYO.',
  '.OYYYYYYYYO.',
  '.OYYOYYOYYO.',
  '..OOOOOOOO..',
];
const PADLOCK_PAL: Record<string, string> = { O: '#1c1917', Y: '#f59e0b' };

const STAGE = {
  mapBg: '#0f1c16',
  sceneBg: '#0c131d',
  bubbleBg: '#182332',
  panelBorder: '#263445',
  text: '#e6edf3',
  muted: '#8b9bb4',
  accent: '#3b82f6',
  good: '#22c55e',
  warn: '#f59e0b',
  bad: '#ef4444',
  nodeBg: '#172230',
  nodeBorder: '#334155',
};

const STEP_DUR = 2200;
const HOLD_DUR = 1400;
const FULL_CYCLE = STEP_DUR * 3 + HOLD_DUR;
const STEP_CYCLE = STEP_DUR + 700;

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  px: number,
  rows: string[],
  pal: Record<string, string>,
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

function drawHacker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  px: number,
  isRoot = false,
  bounce = 0,
  facing = 1,
) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(Math.round(cx - 8 * px * 0.6), Math.round(cy + 8 * px), Math.round(16 * px * 0.6), 3);
  drawSprite(ctx, cx, cy + bounce, px, HACKER_ROWS, isRoot ? ROOT_HERO_PAL : HACKER_PAL, facing < 0);
  if (isRoot) {
    drawSprite(ctx, cx, cy + bounce - 11 * px, px, CROWN_ROWS, CROWN_PAL, false);
  }
  ctx.restore();
}

function drawCallout(ctx: CanvasRenderingContext2D, cx: number, y: number, text: string, color: string, maxW = 420) {
  ctx.save();
  ctx.font = 'bold 13px system-ui, sans-serif';
  const padX = 12;
  const w = Math.min(maxW, ctx.measureText(text).width + padX * 2);
  const h = 28;
  const x = Math.max(8, cx - w / 2);
  ctx.fillStyle = STAGE.bubbleBg;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundRectPath(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, x + w / 2, y + 18, w - 12);
  ctx.restore();
}

function drawScanPulse(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  p: number,
  color: string,
) {
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p);
  ctx.stroke();
  ctx.setLineDash([]);
  const px = x1 + (x2 - x1) * p;
  const py = y1 + (y2 - y1) * p;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.round(px - 2), Math.round(py - 2), 5, 5);
  ctx.restore();
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  sub: string,
  bg: string,
  border: string,
) {
  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.fillStyle = border;
  ctx.fillRect(Math.round(x + 2), Math.round(y + 2), 2, 2);
  ctx.fillRect(Math.round(x + w - 4), Math.round(y + 2), 2, 2);
  ctx.fillStyle = STAGE.text;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, x + w / 2, y + (sub ? 18 : h / 2 + 4), w - 10);
  if (sub) {
    ctx.fillStyle = STAGE.muted;
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillText(sub, x + w / 2, y + 34, w - 10);
  }
}

export default function PrivescOverworldLab() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(3);
  const [onlyCap, setOnlyCap] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lockedStep, setLockedStep] = useState(-1);
  const [activeStep, setActiveStep] = useState(0);

  const stateRef = useRef({
    isFullscreen: false,
    selectedIdx: 3,
    onlyCap: false,
    isPaused: false,
    lockedStep: -1,
    hoverIdx: -1,
    animStart: 0,
    pausedElapsed: 0,
    hitBoxes: [] as HitBox[],
    lastStep: -1,
  });

  stateRef.current.isFullscreen = isFullscreen;
  stateRef.current.selectedIdx = selectedIdx;
  stateRef.current.onlyCap = onlyCap;
  stateRef.current.isPaused = isPaused;
  stateRef.current.lockedStep = lockedStep;

  const isOpen = (idx: number, capOnly: boolean) => !capOnly || idx === 3;

  function getElapsed(now: number) {
    const st = stateRef.current;
    if (st.isPaused) return Math.max(0, st.pausedElapsed);
    const raw = Math.max(0, now - st.animStart);
    if (st.lockedStep >= 0) {
      const local = raw % STEP_CYCLE;
      return st.lockedStep * STEP_DUR + Math.min(STEP_DUR - 1, local);
    }
    const open = isOpen(st.selectedIdx, st.onlyCap);
    const cycle = open ? FULL_CYCLE : STEP_DUR * 2;
    return raw % cycle;
  }

  function openFullscreen() {
    const st = stateRef.current;
    st.animStart = performance.now();
    st.pausedElapsed = 0;
    st.lastStep = -1;
    setLockedStep(-1);
    setIsPaused(false);
    setActiveStep(0);
    setIsFullscreen(true);
  }

  function handleSelectMethod(idx: number) {
    const st = stateRef.current;
    st.animStart = performance.now();
    st.pausedElapsed = 0;
    st.lastStep = -1;
    setSelectedIdx(idx);
    setLockedStep(-1);
    setIsPaused(false);
    setActiveStep(0);
  }

  function handleSelectStep(step: number) {
    const st = stateRef.current;
    if (!isOpen(st.selectedIdx, st.onlyCap) && step === 2) return;
    st.animStart = performance.now();
    st.pausedElapsed = step * STEP_DUR;
    st.lastStep = -1;
    setLockedStep(step);
    setIsPaused(false);
    setActiveStep(step);
  }

  function handleToggleOnlyCap(checked: boolean) {
    const st = stateRef.current;
    st.animStart = performance.now();
    st.pausedElapsed = 0;
    st.lastStep = -1;
    setOnlyCap(checked);
    setLockedStep(-1);
    setIsPaused(false);
    setActiveStep(0);
  }

  function handleTogglePause() {
    const st = stateRef.current;
    const now = performance.now();
    if (!st.isPaused) {
      st.pausedElapsed = getElapsed(now);
      setIsPaused(true);
    } else {
      if (st.lockedStep >= 0) {
        st.animStart = now - (st.pausedElapsed - st.lockedStep * STEP_DUR);
      } else {
        st.animStart = now - st.pausedElapsed;
      }
      setIsPaused(false);
    }
  }

  function handleResumeFull() {
    const st = stateRef.current;
    st.animStart = performance.now();
    st.pausedElapsed = 0;
    st.lastStep = -1;
    setLockedStep(-1);
    setIsPaused(false);
  }

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isFullscreen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    stateRef.current.animStart = performance.now();

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawMap(ox: number, oy: number, W: number, H: number, elapsed: number, now: number) {
      const st = stateRef.current;
      const open = isOpen(st.selectedIdx, st.onlyCap);

      ctx!.save();
      ctx!.translate(ox, oy);
      ctx!.fillStyle = STAGE.mapBg;
      ctx!.fillRect(0, 0, W, H);
      ctx!.fillStyle = 'rgba(34,197,94,0.06)';
      for (let x = 0; x < W; x += 16) {
        for (let y = 0; y < H; y += 16) {
          if (((x >> 4) + (y >> 4)) % 2 === 0) ctx!.fillRect(x, y, 16, 16);
        }
      }

      const treePx = H >= 360 ? 2 : 1.5;
      drawSprite(ctx!, 24, 38, treePx, TREE_ROWS, TREE_PAL);
      drawSprite(ctx!, W - 24, 38, treePx, TREE_ROWS, TREE_PAL);
      drawSprite(ctx!, 24, H - 38, treePx, TREE_ROWS, TREE_PAL);
      drawSprite(ctx!, W - 24, H - 38, treePx, TREE_ROWS, TREE_PAL);

      const tWalk = Math.min(1, elapsed / 750);
      const tDone = elapsed >= STEP_DUR * 2;
      const tFinalDash = open && tDone ? Math.min(1, (elapsed - STEP_DUR * 2) / 900) : 0;

      const start = { x: W / 2, y: Math.min(54, Math.max(36, H * 0.13)), w: 156, h: 32 };
      const goal = { x: W / 2, y: H - Math.min(48, Math.max(30, H * 0.12)), w: 160, h: 32 };
      const pad = 12;
      const gap = 6;
      const nw = Math.min(92, (W - pad * 2 - gap * 4) / 5);
      const totalW = nw * 5 + gap * 4;
      const sx = (W - totalW) / 2;
      const my = H / 2;
      const mids = METHODS.map((_, i) => ({ x: sx + i * (nw + gap) + nw / 2, y: my, w: nw, h: 44 }));
      st.hitBoxes = mids.map((m, i) => ({
        x: ox + m.x - m.w / 2,
        y: oy + m.y - m.h / 2,
        w: m.w,
        h: m.h,
        idx: i,
      }));

      mids.forEach((m, i) => {
        const isSel = i === st.selectedIdx;
        ctx!.strokeStyle = isSel ? STAGE.accent : '#2a3d34';
        ctx!.lineWidth = isSel ? 4 : 2;
        ctx!.setLineDash(isSel ? [] : [4, 4]);
        ctx!.beginPath();
        ctx!.moveTo(start.x, start.y + start.h / 2);
        ctx!.lineTo(m.x, m.y - m.h / 2);
        ctx!.stroke();

        const botLit = isSel && open && tDone;
        ctx!.strokeStyle = botLit ? STAGE.good : (isSel && !open && elapsed > STEP_DUR ? STAGE.bad : '#2a3d34');
        ctx!.lineWidth = botLit ? 4 : 2;
        ctx!.setLineDash(botLit ? [] : [4, 4]);
        ctx!.beginPath();
        ctx!.moveTo(m.x, m.y + m.h / 2);
        ctx!.lineTo(goal.x, goal.y - goal.h / 2);
        ctx!.stroke();
        ctx!.setLineDash([]);

        if (isSel) {
          const pulse = (now % 1100) / 1100;
          const px = start.x + (m.x - start.x) * pulse;
          const py = start.y + start.h / 2 + (m.y - m.h / 2 - (start.y + start.h / 2)) * pulse;
          ctx!.fillStyle = '#93c5fd';
          ctx!.fillRect(Math.round(px - 2), Math.round(py - 2), 4, 4);
        }
      });

      drawPanel(ctx!, start.x - start.w / 2, start.y - start.h / 2, start.w, start.h, 'www-data (1000)', '', '#143326', STAGE.good);

      const rootWin = open && tFinalDash >= 0.9;
      drawSprite(ctx!, goal.x - goal.w / 2 - 20, goal.y - 2, 2, CASTLE_ROWS, rootWin ? CASTLE_WIN_PAL : CASTLE_PAL);
      drawPanel(
        ctx!,
        goal.x - goal.w / 2,
        goal.y - goal.h / 2,
        goal.w,
        goal.h,
        rootWin ? 'ROOT (UID 0) ★' : 'root (UID 0)',
        '',
        rootWin ? '#45151a' : '#261419',
        rootWin ? '#facc15' : STAGE.bad,
      );

      mids.forEach((m, i) => {
        const isSel = i === st.selectedIdx;
        const isHov = i === st.hoverIdx;
        ctx!.fillStyle = isSel ? '#2a2412' : STAGE.nodeBg;
        ctx!.strokeStyle = isSel ? (open ? STAGE.good : STAGE.warn) : (isHov ? STAGE.accent : STAGE.nodeBorder);
        ctx!.lineWidth = isSel ? 2.5 : 1.5;
        ctx!.fillRect(Math.round(m.x - m.w / 2), Math.round(m.y - m.h / 2), Math.round(m.w), Math.round(m.h));
        ctx!.strokeRect(Math.round(m.x - m.w / 2), Math.round(m.y - m.h / 2), Math.round(m.w), Math.round(m.h));
        ctx!.fillStyle = STAGE.text;
        ctx!.font = 'bold 11px system-ui, sans-serif';
        ctx!.textAlign = 'center';
        ctx!.fillText(METHODS[i].short, m.x, m.y + 4, m.w - 6);
      });

      const sel = mids[st.selectedIdx];
      let hx = start.x;
      let hy = start.y;
      if (tWalk < 1) {
        const e = 1 - Math.pow(1 - tWalk, 2);
        hx = start.x + (sel.x - start.x) * e;
        hy = start.y + (sel.y - 32 - start.y) * e;
      } else if (tFinalDash > 0) {
        const e = tFinalDash * tFinalDash;
        hx = sel.x + (goal.x - sel.x) * e;
        hy = sel.y + 28 + (goal.y - 26 - (sel.y + 28)) * e;
      } else {
        hx = sel.x;
        hy = sel.y - 32;
      }
      const moving = tWalk < 1 || (tFinalDash > 0 && tFinalDash < 1);
      const bob = moving ? Math.abs(Math.sin(now * 0.02)) * -4 : (rootWin ? Math.sin(now * 0.008) * 1.5 : 0);
      drawHacker(ctx!, hx, hy, H >= 340 ? 1.8 : 1.5, rootWin, bob, sel.x >= start.x ? 1 : -1);

      ctx!.fillStyle = STAGE.muted;
      ctx!.font = 'bold 11px ui-monospace, monospace';
      ctx!.textAlign = 'left';
      ctx!.fillText('BẢN ĐỒ LUỒNG', 10, 18);
      ctx!.restore();
    }

    function drawCutscene(ox: number, oy: number, W: number, H: number, elapsed: number, now: number) {
      const st = stateRef.current;
      const open = isOpen(st.selectedIdx, st.onlyCap);
      const step = Math.max(0, Math.min(2, Math.floor(elapsed / STEP_DUR)));
      const p = Math.max(0, Math.min(1, (elapsed - step * STEP_DUR) / (STEP_DUR * 0.78)));

      if (st.isFullscreen) {
        barRefs.current.forEach((bar, i) => {
          if (!bar) return;
          if (i < step) bar.style.width = '100%';
          else if (i === step) bar.style.width = `${Math.round(p * 100)}%`;
          else bar.style.width = '0%';
        });

        if (st.lastStep !== step) {
          st.lastStep = step;
          setActiveStep(step);
        }
      }

      ctx!.save();
      ctx!.translate(ox, oy);

      const floorY = H - Math.max(44, Math.round(H * 0.14));
      const sprPx = W >= 580 && H >= 380 ? 3 : 2;
      const heroY = floorY - 9 * sprPx;
      const labelAboveHero = floorY - 22 * sprPx - 12;

      ctx!.fillStyle = STAGE.sceneBg;
      ctx!.fillRect(0, 0, W, floorY);
      ctx!.fillStyle = 'rgba(255,255,255,0.025)';
      for (let x = 0; x < W; x += 24) ctx!.fillRect(x, 26, 1, floorY - 26);
      for (let y = 32; y < floorY; y += 24) ctx!.fillRect(0, y, W, 1);

      ctx!.fillStyle = '#182230';
      ctx!.fillRect(0, floorY, W, H - floorY);
      ctx!.fillStyle = '#243247';
      ctx!.fillRect(0, floorY, W, 4);
      ctx!.fillStyle = '#111924';
      for (let row = 0; row < 4; row++) {
        const py = floorY + 8 + row * 16;
        if (py > H) break;
        const off = (row % 2) * 16;
        for (let px = off; px < W; px += 32) ctx!.fillRect(px, py, 28, 12);
      }
      ctx!.strokeStyle = STAGE.panelBorder;
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(0, floorY);
      ctx!.lineTo(W, floorY);
      ctx!.stroke();

      ctx!.fillStyle = STAGE.muted;
      ctx!.font = 'bold 11px ui-monospace, monospace';
      ctx!.textAlign = 'left';
      ctx!.fillText(`CẬN CẢNH CƠ CHẾ: ${METHODS[st.selectedIdx].title.toUpperCase()}`, 14, 20);

      if (!open && step === 0) {
        drawHacker(ctx!, W * 0.22, heroY, sprPx, false, Math.abs(Math.sin(now * 0.02)) * -2, 1);
        drawScanPulse(ctx!, W * 0.22 + 18, heroY - 4, W * 0.52, floorY - 34, p, STAGE.accent);
        drawPanel(ctx!, W * 0.52, floorY - 58, 146, 50, 'ĐANG KIỂM TRA...', METHODS[st.selectedIdx].steps[0].cmd.split(' ')[0], STAGE.nodeBg, STAGE.accent);
        drawCallout(ctx!, W / 2, 34, `1/2: Chạy lệnh dò ${METHODS[st.selectedIdx].steps[0].cmd.split(' ')[0]}...`, STAGE.accent, W - 28);
        ctx!.restore();
        return;
      }

      if (!open && step >= 1) {
        const shake = p < 0.4 ? Math.sin(p * 40) * 4 : 0;
        drawHacker(ctx!, W * 0.24, heroY, sprPx, false, 0, 1);
        drawPanel(ctx!, W * 0.52 + shake, floorY - 58, 146, 50, 'ĐÃ KHÓA / AN TOÀN', METHODS[st.selectedIdx].steps[0].cmd.split(' ')[0], STAGE.nodeBg, STAGE.warn);
        drawSprite(ctx!, W * 0.52 + 73 + shake, floorY - 76, 2, PADLOCK_ROWS, PADLOCK_PAL);
        drawCallout(ctx!, W / 2, 34, '✕ Không thấy lỗ hổng để leo tiếp', STAGE.warn, W - 28);
        ctx!.restore();
        return;
      }

      const m = METHODS[st.selectedIdx];
      const calloutColor = step === 2 ? STAGE.good : (step === 1 ? STAGE.warn : STAGE.accent);
      drawCallout(ctx!, W / 2, 34, `${step + 1}/3: ${m.steps[step].callout}`, calloutColor, W - 28);
      const bob = p > 0 && p < 1 ? Math.abs(Math.sin(now * 0.02)) * -3 : 0;

      if (st.selectedIdx === 0) {
        const guardX = W * 0.36;
        const boothX = W * 0.65;
        drawSprite(ctx!, guardX, floorY - 7 * sprPx, sprPx, OFFICER_ROWS, OFFICER_PAL, true);
        drawPanel(ctx!, guardX - 46, floorY - 14 * sprPx - 44, 92, 38, 'LÍNH SUDO', 'NOPASSWD', STAGE.nodeBg, STAGE.accent);
        drawPanel(ctx!, boothX - 54, floorY - 96, 108, 92, 'Lệnh find', 'Chạy bằng ROOT', '#2a2210', step >= 1 ? STAGE.good : STAGE.nodeBorder);
        ctx!.fillStyle = step === 2 ? STAGE.good : '#334155';
        ctx!.fillRect(Math.round(boothX + 50), Math.round(floorY - 48), 6, 44);

        if (step === 1 && p < 0.45) {
          const cardX = guardX - 60 + (p / 0.45) * 34;
          ctx!.fillStyle = '#4ade80';
          ctx!.fillRect(Math.round(cardX), Math.round(floorY - 28), 14, 9);
        }

        let hx = W * 0.14;
        let isRoot = false;
        if (step === 0) {
          hx = W * 0.14 + p * (guardX - 66 - W * 0.14);
          drawScanPulse(ctx!, hx + 18, heroY - 4, guardX - 46, floorY - 50, p, STAGE.accent);
        } else if (step === 1) {
          hx = guardX - 66 + p * (boothX - (guardX - 66));
          isRoot = p > 0.55;
        } else {
          hx = boothX + p * (W * 0.88 - boothX);
          isRoot = true;
        }
        drawHacker(ctx!, hx, heroY, sprPx, isRoot, bob, 1);
        ctx!.fillStyle = isRoot ? STAGE.good : STAGE.muted;
        ctx!.font = 'bold 11px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(isRoot ? 'UID 0 (/bin/sh)' : 'jdoe (1000)', hx, labelAboveHero);
      } else if (st.selectedIdx === 1) {
        const portalX = W * 0.5;
        const glowAlpha = step >= 1 ? 0.28 + Math.sin(now * 0.01) * 0.08 : 0.14;
        ctx!.fillStyle = `rgba(250, 204, 21, ${glowAlpha})`;
        ctx!.fillRect(Math.round(portalX - 48), Math.round(floorY - 110), 96, 110);
        ctx!.strokeStyle = step >= 1 ? '#facc15' : '#64748b';
        ctx!.lineWidth = 3;
        ctx!.strokeRect(Math.round(portalX - 48), Math.round(floorY - 110), 96, 110);
        drawPanel(ctx!, portalX - 62, floorY - 148, 124, 42, '/usr/bin/env', 'bit 4000 (root)', STAGE.nodeBg, '#facc15');

        if (step >= 1) {
          for (let s = 0; s < 5; s++) {
            const sy = floorY - ((now * 0.06 + s * 22) % 98);
            const sx = portalX - 34 + s * 17;
            ctx!.fillStyle = '#fde047';
            ctx!.fillRect(Math.round(sx), Math.round(sy), 3, 3);
          }
        }

        let hx = W * 0.15;
        if (step === 0) {
          hx = W * 0.15 + p * (portalX - 76 - W * 0.15);
          drawScanPulse(ctx!, hx + 18, heroY - 4, portalX - 48, floorY - 56, p, '#facc15');
        } else if (step === 1) {
          hx = portalX - 76 + p * 76;
        } else {
          hx = portalX + p * (W * 0.86 - portalX);
        }
        const passed = (step === 1 && p > 0.45) || step === 2;
        drawHacker(ctx!, hx, heroY, sprPx, passed, bob, 1);
        ctx!.fillStyle = passed ? STAGE.good : STAGE.muted;
        ctx!.font = 'bold 11px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(passed ? (step === 2 ? 'SHELL (-p) UID 0' : 'EUID=0!') : 'UID=1000', hx, labelAboveHero);
      } else if (st.selectedIdx === 2) {
        const fileX = W * 0.48;
        const clockX = W * 0.21;
        const clockY = Math.max(96, floorY - 138);
        drawPanel(ctx!, fileX - 58, floorY - 58, 116, 52, 'backup.sh', '-rwxrwxrwx', STAGE.nodeBg, step >= 1 ? STAGE.bad : STAGE.warn);

        ctx!.fillStyle = '#1e293b';
        ctx!.strokeStyle = STAGE.text;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(clockX, clockY, 24, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.stroke();
        const ang = -Math.PI / 2 + (step === 2 ? Math.min(1, p * 1.3) : (step === 0 ? p * 0.15 : 0.15)) * Math.PI * 2;
        ctx!.strokeStyle = step === 2 ? '#facc15' : STAGE.text;
        ctx!.beginPath();
        ctx!.moveTo(clockX, clockY);
        ctx!.lineTo(clockX + Math.cos(ang) * 18, clockY + Math.sin(ang) * 18);
        ctx!.stroke();
        ctx!.fillStyle = STAGE.muted;
        ctx!.font = '11px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText('* * * * *', clockX, clockY + 38);

        let hx = W * 0.16;
        if (step === 0) drawScanPulse(ctx!, hx + 18, heroY - 4, fileX - 58, floorY - 32, p, STAGE.accent);
        else if (step === 1) hx = W * 0.16 + Math.sin(p * Math.PI) * (fileX - 78 - W * 0.16);
        const won = step === 2 && p > 0.6;
        drawHacker(ctx!, hx, heroY, sprPx, won, step === 1 ? bob : 0, 1);
        ctx!.fillStyle = won ? STAGE.good : STAGE.muted;
        ctx!.font = 'bold 11px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(won ? 'bash SUID → ROOT' : 'chờ Cron...', hx, labelAboveHero);

        if (step >= 1) {
          ctx!.fillStyle = '#ef4444';
          ctx!.fillRect(Math.round(fileX - 9), Math.round(floorY - 72), 18, 11);
          ctx!.fillStyle = '#fca5a5';
          ctx!.font = 'bold 11px ui-monospace, monospace';
          ctx!.fillText('+ payload', fileX, floorY - 78);
        }
        if (step === 2) {
          const bx = W * 0.88 - Math.min(1, p * 1.45) * (W * 0.88 - (fileX + 94));
          drawSprite(ctx!, bx, floorY - 7 * sprPx, sprPx, BOT_ROWS, BOT_PAL, false);
          ctx!.fillStyle = '#fca5a5';
          ctx!.font = 'bold 11px ui-monospace, monospace';
          ctx!.fillText('CRON (root)', bx, floorY - 15 * sprPx - 8);
          if (p > 0.55) {
            ctx!.strokeStyle = STAGE.good;
            ctx!.lineWidth = 3;
            ctx!.beginPath();
            ctx!.moveTo(fileX - 58, floorY - 30);
            ctx!.lineTo(W * 0.16 + 18, heroY);
            ctx!.stroke();
          }
        }
      } else if (st.selectedIdx === 3) {
        const pyX = W * 0.46;
        const shrineY = floorY - 148;
        drawPanel(ctx!, pyX - 62, shrineY, 124, 48, 'python3.8', 'cap_setuid=ep', STAGE.nodeBg, STAGE.accent);

        let hx = W * 0.22;
        if (step === 0) {
          hx = W * 0.14 + p * (W * 0.22 - W * 0.14);
          drawScanPulse(ctx!, hx + 18, heroY - 4, pyX - 62, shrineY + 24, p, '#38bdf8');
          drawSprite(ctx!, pyX, shrineY + 62, 2.5, GEM_ROWS, GEM_PAL);
        } else if (step === 1) {
          const gemT = Math.min(1, p * 1.55);
          const gx = pyX - (pyX - hx) * gemT;
          const gy = shrineY + 62 + (heroY - 4 - (shrineY + 62)) * gemT;
          drawSprite(ctx!, gx, gy, 2.5, GEM_ROWS, GEM_PAL);
        } else {
          hx = W * 0.22 + p * (W * 0.64);
        }

        let uid = 1000;
        if (step === 1) {
          uid = p < 0.65 ? 1000 : Math.max(0, Math.round(1000 * (1 - (p - 0.65) / 0.35)));
        } else if (step === 2) {
          uid = 0;
        }
        drawHacker(ctx!, hx, heroY, sprPx, uid === 0, step === 0 || step === 2 ? bob : 0, 1);
        ctx!.fillStyle = uid === 0 ? STAGE.good : STAGE.warn;
        ctx!.font = 'bold 12px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(`UID: ${uid}${uid === 0 ? ' (ROOT)' : ''}`, hx, labelAboveHero);
      } else {
        const vaultX = W * 0.8;
        const contX = W * 0.48;
        drawPanel(ctx!, vaultX - 54, floorY - 88, 108, 84, 'Ổ GỐC /', 'Khóa ngoài', '#2f141a', STAGE.bad);
        drawSprite(ctx!, vaultX - 54, floorY - 44, 2, PADLOCK_ROWS, PADLOCK_PAL);

        if (step >= 1) {
          drawPanel(ctx!, contX - 48, floorY - 60, 96, 54, 'Container', 'root trong hộp', STAGE.nodeBg, '#38bdf8');
          ctx!.strokeStyle = STAGE.good;
          ctx!.lineWidth = 6;
          const pipeP = step >= 2 ? 1 : p;
          ctx!.beginPath();
          ctx!.moveTo(contX + 48, floorY - 24);
          ctx!.lineTo(contX + 48 + (vaultX - 54 - (contX + 48)) * pipeP, floorY - 24);
          ctx!.stroke();
          ctx!.fillStyle = STAGE.good;
          ctx!.font = 'bold 11px ui-monospace, monospace';
          ctx!.textAlign = 'center';
          ctx!.fillText('-v /:/mnt', (contX + vaultX) / 2, floorY - 36);
        }

        let hx = W * 0.16;
        if (step === 0) {
          hx = W * 0.1 + p * (W * 0.18 - W * 0.1);
          drawScanPulse(ctx!, hx + 18, heroY - 4, vaultX - 64, floorY - 44, p, STAGE.accent);
        } else if (step === 1) {
          hx = W * 0.18 + p * (contX - W * 0.18);
        } else {
          hx = contX + p * (vaultX - 24 - contX);
        }
        const won = (step === 1 && p > 0.7) || step === 2;
        drawHacker(ctx!, hx, heroY, sprPx, won, step !== 1 || p < 0.8 ? bob : 0, 1);
        ctx!.fillStyle = step === 0 ? STAGE.accent : STAGE.good;
        ctx!.font = 'bold 11px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(step === 0 ? 'group: docker' : (step === 2 ? 'chroot /mnt!' : 'bật container'), hx, labelAboveHero);
      }

      ctx!.restore();
    }

    function draw(now = performance.now()) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      if (W < 10 || H < 10) return;

      const elapsed = getElapsed(now);
      ctx!.clearRect(0, 0, W, H);

      if (W >= 620) {
        const splitX = Math.round(W * 0.38);
        drawMap(0, 0, splitX, H, elapsed, now);
        drawCutscene(splitX, 0, W - splitX, H, elapsed, now);
        ctx!.strokeStyle = STAGE.panelBorder;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.moveTo(splitX, 0);
        ctx!.lineTo(splitX, H);
        ctx!.stroke();
      } else {
        const splitY = Math.round(H * 0.45);
        drawMap(0, 0, W, splitY, elapsed, now);
        drawCutscene(0, splitY, W, H - splitY, elapsed, now);
        ctx!.strokeStyle = STAGE.panelBorder;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.moveTo(0, splitY);
        ctx!.lineTo(W, splitY);
        ctx!.stroke();
      }
    }

    let rafId = 0;
    function loop(now: number) {
      rafId = requestAnimationFrame(loop);
      try {
        draw(now);
      } catch (err) {
        console.error('PrivescOverworldLab render error:', err);
      }
    }

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    resize();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [isFullscreen]);

  const currentMethod = METHODS[selectedIdx];
  const open = isOpen(selectedIdx, onlyCap);
  const currentCmd = !open && activeStep >= 0 ? currentMethod.steps[0].cmd : currentMethod.steps[activeStep].cmd;
  const currentCaption = !open
    ? (activeStep === 0
        ? `Đang chạy lệnh dò để kiểm tra xem nhánh ${currentMethod.title} có lỗ hổng hay không...`
        : currentMethod.blocked)
    : currentMethod.steps[activeStep].text;

  return (
    <>
      {/* 1. Thẻ thu gọn nằm trong trang bài học */}
      <div className="sim dual-launcher ow-launcher">
        <div className="dual-head">
          <div>
            <p className="sim-title" style={{ marginBottom: 4 }}>Bản đồ 5 hướng leo thang đặc quyền trên Linux</p>
            <p className="muted small" style={{ margin: 0 }}>
              Từ tài khoản thường <strong>www-data / jdoe</strong>, rà 5 con đường lên <strong>root (UID 0)</strong> và xem cận cảnh cách từng cơ chế hoạt động.
            </p>
          </div>
          <button type="button" className="btn primary dual-reset" onClick={openFullscreen}>
            ▶ CHƠI LAB TOÀN MÀN HÌNH
          </button>
        </div>

        <SimHow
          steps={[
            'Bấm "▶ CHƠI LAB TOÀN MÀN HÌNH" (hoặc bấm vào ảnh thu nhỏ bên dưới) để mở không gian mô phỏng toàn màn hình.',
            'Chọn 1 trong 5 hướng và bấm các thẻ ① ② ③ để xem từng bước leo thang kèm lệnh thực tế.',
          ]}
        />

        {!isFullscreen && (
          <div
            className="dual-launcher-preview"
            onClick={openFullscreen}
            role="button"
            tabIndex={0}
            aria-label="Mở mô phỏng 5 hướng leo thang đặc quyền toàn màn hình"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openFullscreen();
              }
            }}
          >
            <canvas ref={canvasRef} className="ow-preview-canvas" />
            <div className="dual-launcher-overlay">
              <span>▶ BẤM ĐỂ MỞ KHÔNG GIAN MÔ PHỎNG TOÀN MÀN HÌNH</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Không gian toàn màn hình chuẩn 1280×720 */}
      {isFullscreen && (
        <div className="ow-fs-stage" role="dialog" aria-modal="true" aria-label="Bản đồ 5 hướng leo thang đặc quyền trên Linux">
          <div className="ow-fs-bar">
            <div className="ow-btn-group">
              {METHODS.map((m, idx) => (
                <button
                  key={m.short}
                  type="button"
                  className={`gba-btn gba-btn-sm ${selectedIdx === idx ? 'active' : ''}`}
                  onClick={() => handleSelectMethod(idx)}
                >
                  {m.short}
                </button>
              ))}
            </div>

            <div className="ow-fs-actions">
              <label className="ow-fs-toggle">
                <input
                  type="checkbox"
                  checked={onlyCap}
                  onChange={(e) => handleToggleOnlyCap(e.target.checked)}
                />
                <span>Chỉ #4 hở</span>
              </label>
              <button type="button" className="gba-btn gba-btn-sm" onClick={handleTogglePause}>
                {isPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng'}
              </button>
              {lockedStep >= 0 && (
                <button type="button" className="gba-btn gba-btn-sm" onClick={handleResumeFull}>
                  ↻ Chạy cả 3 bước
                </button>
              )}
              <button type="button" className="gba-btn gba-btn-sm gba-btn-exit" onClick={() => setIsFullscreen(false)}>
                ✕ THOÁT
              </button>
            </div>
          </div>

          <div className="ow-fs-stage-box">
            <canvas
              ref={canvasRef}
              className="ow-fs-canvas"
              onClick={(e) => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const hit = stateRef.current.hitBoxes.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
                if (hit) handleSelectMethod(hit.idx);
              }}
              onMouseMove={(e) => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const hit = stateRef.current.hitBoxes.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
                stateRef.current.hoverIdx = hit ? hit.idx : -1;
                canvas.style.cursor = hit ? 'pointer' : 'default';
              }}
              onMouseLeave={() => {
                stateRef.current.hoverIdx = -1;
              }}
            />
          </div>

          <div className="ow-fs-bottom">
            <div className="ow-steps" role="tablist" aria-label="Các bước leo thang">
              {[0, 1, 2].map((step) => {
                const disabled = !open && step === 2;
                const label =
                  !open && step === 1
                    ? '② Kiểm tra: An toàn'
                    : !open && step === 2
                      ? '③ Không leo được'
                      : currentMethod.steps[step].tab;
                return (
                  <button
                    key={step}
                    type="button"
                    disabled={disabled}
                    className={`ow-step-btn ow-fs-step-btn ${activeStep === step ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''}`}
                    onClick={() => handleSelectStep(step)}
                  >
                    <span className="ow-step-label">{label}</span>
                    <span
                      className="ow-step-bar"
                      ref={(el) => {
                        barRefs.current[step] = el;
                      }}
                    />
                  </button>
                );
              })}
            </div>

            <div className="ow-fs-narration">
              <div className="ow-cmd-row">
                <span className={`ow-mode-tag ${isPaused ? 'is-paused' : lockedStep >= 0 ? 'is-locked' : 'is-playing'}`}>
                  {isPaused
                    ? '⏸ ĐÃ TẠM DỪNG'
                    : lockedStep >= 0
                      ? `↻ LẶP RIÊNG BƯỚC ${lockedStep + 1}`
                      : '● ĐANG CHẠY TỰ ĐỘNG'}
                </span>
                <span className="ow-fs-dim">· Lệnh:</span>
                <code className="ow-fs-cmd">{currentCmd}</code>
              </div>
              <p className="ow-fs-caption">{currentCaption}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
