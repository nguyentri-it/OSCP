import { useEffect, useRef, useState } from 'react';
import SimHow from './SimHow';
import {
  applyDungeonAction,
  countClearedRooms,
  createInitialDungeonState,
  getPermDisplay,
  getRoomTerminal,
  groupToOctal,
  isRoomCleared,
  KALI_SUID_BINS,
  META_SUID_BINS,
  ROOMS,
  SHELL_USERS,
  type DungeonState,
} from './linuxDungeonLogic';
import {
  CHEST_CLOSED_ROWS,
  CHEST_OPEN_ROWS,
  CHEST_PAL,
  CREST_PAL,
  CREST_ROWS,
  DOOR_LOCKED_ROWS,
  DOOR_OPEN_ROWS,
  DOOR_PAL,
  drawBannerText,
  drawPixelBox,
  drawPixelDungeonRoom,
  drawPixelSparkles,
  drawPixelSprite,
  HERO_GOLD_PAL,
  HERO_GREEN_PAL,
  HERO_IDLE_ROWS,
  HERO_WALK_ROWS,
  KEY_PAL,
  KEY_ROWS,
  NOBODY_PAL,
  NOBODY_ROWS,
  SCROLL_PAL,
  SCROLL_ROWS,
  SENTRY_EYE_PAL,
  SENTRY_EYE_ROWS,
  SWORD_IRON_PAL,
  SWORD_ROWS,
  SWORD_SUID_PAL,
} from './linuxDungeonSprites';

interface HitBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  action: () => void;
}

export default function LinuxDungeonLab() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [game, setGame] = useState<DungeonState>(() => createInitialDungeonState());
  const stateRef = useRef({
    game,
    isFullscreen: false,
    hoverId: '' as string,
    actionStamp: 0,
    lastActionKey: '',
    hitBoxes: [] as HitBox[],
  });

  stateRef.current.game = game;
  stateRef.current.isFullscreen = isFullscreen;

  function trigger(action: string) {
    stateRef.current.actionStamp = performance.now();
    stateRef.current.lastActionKey = action;
    setGame((prev) => applyDungeonAction(prev, action));
  }

  function selectRoom(idx: number) {
    stateRef.current.actionStamp = performance.now();
    stateRef.current.lastActionKey = `room:${idx}`;
    setGame((prev) => ({ ...prev, room: idx }));
  }

  function resetAll() {
    stateRef.current.actionStamp = performance.now();
    stateRef.current.lastActionKey = 'reset';
    setGame(createInitialDungeonState());
  }

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
      if (e.key === 'ArrowRight') setGame((p) => ({ ...p, room: Math.min(ROOMS.length - 1, p.room + 1) }));
      if (e.key === 'ArrowLeft') setGame((p) => ({ ...p, room: Math.max(0, p.room - 1) }));
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

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.imageSmoothingEnabled = false;
    }

    function drawRoomStage(ox: number, oy: number, W: number, H: number, now: number) {
      const g = stateRef.current.game;
      const clearedAll = countClearedRooms(g) === ROOMS.length;
      const heroPal = clearedAll ? HERO_GOLD_PAL : HERO_GREEN_PAL;
      const elapsed = now - stateRef.current.actionStamp;
      const animT = Math.min(1, elapsed / 620);
      const walkFrame = Math.floor(now / 220) % 2 === 0;
      const sprPx = W >= 520 && H >= 270 ? 2.8 : 2.2;
      const floorMidY = Math.round(H * 0.67);

      ctx!.save();
      ctx!.translate(ox, oy);

      const carpetMap = ['#183126', '#2b1a2e', undefined, '#1b2436', '#2d2318', undefined];
      drawPixelDungeonRoom(ctx!, W, H, now, {
        wallColor: g.room === 5 ? '#261a2e' : '#263447',
        floorA: g.room === 4 ? '#231e18' : '#182232',
        floorB: g.room === 4 ? '#29231c' : '#1c283b',
        carpetColor: carpetMap[g.room],
        pillars: false,
      });

      if (clearedAll) {
        drawPixelSprite(ctx!, W - 36, 22, 1.5, CREST_ROWS, CREST_PAL);
        drawPixelSparkles(ctx!, W - 36, 22, now);
      }

      ctx!.save();
      ctx!.font = 'bold 11px ui-monospace, monospace';
      const titleTxt = ROOMS[g.room].title.toUpperCase();
      const titleW = Math.min(W - 156, ctx!.measureText(titleTxt).width + 20);
      drawPixelBox(ctx!, (W - titleW) / 2, 7, titleW, 20, '#0f172a', '#475569');
      ctx!.fillStyle = '#e2e8f0';
      ctx!.textAlign = 'center';
      ctx!.fillText(titleTxt, W / 2, 21, titleW - 12);
      ctx!.restore();

      // ROOM 1
      if (g.room === 0) {
        drawBannerText(
          ctx!,
          W / 2,
          50,
          g.r1.passwdFiltered
            ? '✓ Đã mở 5 cửa có shell thật (trong 41 tài khoản)'
            : g.r1.idScanned
              ? '★ Phát hiện nhóm admin (104/111) có quyền sudo!'
              : 'Vượt cầu SSH :22 vào Metasploitable 2',
          g.r1.passwdFiltered ? '#22c55e' : g.r1.idScanned ? '#facc15' : '#38bdf8',
        );

        const hx = Math.round(W * 0.2);
        const hy = Math.round(H * 0.56);
        const heroWalk = stateRef.current.lastActionKey.startsWith('r1:') && elapsed < 500;
        drawPixelSprite(ctx!, hx, hy, sprPx, heroWalk || walkFrame ? HERO_WALK_ROWS : HERO_IDLE_ROWS, heroPal);

        if (stateRef.current.lastActionKey === 'r1:id' && elapsed < 550) {
          ctx!.strokeStyle = '#facc15';
          ctx!.lineWidth = 2;
          ctx!.beginPath();
          ctx!.arc(hx, hy - 10, 14 + animT * 36, 0, Math.PI * 2);
          ctx!.stroke();
        }

        if (g.r1.idScanned) {
          drawPixelBox(ctx!, hx - 54, hy - 54, 108, 24, '#29200a', '#facc15');
          ctx!.fillStyle = '#facc15';
          ctx!.font = 'bold 10px ui-monospace, monospace';
          ctx!.textAlign = 'center';
          ctx!.fillText('★ admin (104/111)', hx, hy - 38);
        }

        const panelX = Math.round(W * 0.36);
        const panelW = Math.round(W * 0.58);
        const panelY = 78;
        const panelH = H - panelY - 12;
        drawPixelBox(ctx!, panelX, panelY, panelW, panelH, '#111827', g.r1.passwdFiltered ? '#22c55e' : '#334155');
        drawPixelSprite(ctx!, panelX + 24, panelY + 20, 1.6, SCROLL_ROWS, SCROLL_PAL);
        ctx!.fillStyle = '#e2e8f0';
        ctx!.font = 'bold 11px ui-monospace, monospace';
        ctx!.textAlign = 'left';
        ctx!.fillText('/etc/passwd · 41 dòng', panelX + 46, panelY + 24);

        const cols = Math.min(3, Math.max(2, Math.floor((panelW - 24) / 96)));
        const dw = Math.floor((panelW - 24 - (cols - 1) * 8) / cols);
        const doorRows = Math.ceil(SHELL_USERS.length / cols);
        const rowStep = Math.max(36, Math.min(52, Math.floor((panelH - 64) / doorRows)));
        const dh = Math.min(42, rowStep - 6);
        SHELL_USERS.forEach((u, i) => {
          const dx = panelX + 12 + (i % cols) * (dw + 8);
          const dy = panelY + 40 + Math.floor(i / cols) * rowStep;
          const lit = g.r1.passwdFiltered && (stateRef.current.lastActionKey !== 'r1:passwd' || elapsed >= i * 85);
          drawPixelBox(ctx!, dx, dy, dw, dh, lit ? '#143326' : '#1e293b', lit ? '#22c55e' : '#475569');
          drawPixelSprite(ctx!, dx + 18, dy + Math.round(dh / 2), 1.3, lit ? DOOR_OPEN_ROWS : DOOR_LOCKED_ROWS, DOOR_PAL);
          ctx!.fillStyle = lit ? '#86efac' : '#64748b';
          ctx!.font = 'bold 11px ui-monospace, monospace';
          ctx!.textAlign = 'left';
          ctx!.fillText(lit ? u : '???', dx + 34, dy + Math.round(dh / 2) + 4);
        });

        ctx!.fillStyle = '#94a3b8';
        ctx!.font = '10px ui-monospace, monospace';
        ctx!.textAlign = 'right';
        ctx!.fillText(
          g.r1.passwdFiltered ? '36 tài khoản nologin đã ẩn' : '36 nologin + 5 shell trộn lẫn',
          panelX + panelW - 14,
          panelY + panelH - 10,
        );
      }

      // ROOM 2
      else if (g.room === 1) {
        const perm = getPermDisplay(g.r2);
        drawBannerText(
          ctx!,
          W / 2,
          50,
          g.r2.suid
            ? `Mẫu SUID (4000) → ${perm.octal} (${perm.sym})`
            : perm.is600
              ? '✓ Rương ~/thu.txt đã khóa chuẩn 600 (-rw-------)!'
              : `Khóa ~/thu.txt về 600 · Hiện tại: ${perm.octal} (${perm.sym})`,
          perm.is600 ? '#22c55e' : g.r2.suid ? '#f59e0b' : '#38bdf8',
        );

        const chestX = Math.round(W * 0.5);
        const chestY = Math.round(H * 0.34);
        drawPixelSprite(ctx!, chestX - 60, chestY + 6, sprPx * 0.85, HERO_IDLE_ROWS, heroPal);
        drawPixelSprite(ctx!, chestX, chestY, sprPx, perm.is600 ? CHEST_OPEN_ROWS : CHEST_CLOSED_ROWS, CHEST_PAL);
        if (perm.is600) {
          drawPixelSprite(ctx!, chestX, chestY - 24 - Math.abs(Math.sin(now * 0.008)) * 5, 1.9, KEY_ROWS, KEY_PAL);
          drawPixelSparkles(ctx!, chestX, chestY - 8, now);
        }

        const groups = [
          { key: 'owner' as const, label: 'CHỦ (Owner)', val: g.r2.owner, suid: g.r2.suid },
          { key: 'group' as const, label: 'NHÓM (Group)', val: g.r2.group, suid: false },
          { key: 'other' as const, label: 'KHÁC (Other)', val: g.r2.other, suid: false },
        ];
        const colW = Math.min(148, Math.floor((W - 60) / 3));
        const startX = Math.round((W - (colW * 3 + 24)) / 2);
        const py = Math.round(H * 0.5);
        const ph = Math.min(124, H - py - 14);

        groups.forEach((grp, idx) => {
          const px = startX + idx * (colW + 12);
          const oct = groupToOctal(grp.val);
          const good = !g.r2.suid && ((idx === 0 && oct === 6) || (idx > 0 && oct === 0));
          drawPixelBox(ctx!, px, py, colW, ph, '#111827', grp.suid ? '#f59e0b' : good ? '#22c55e' : '#475569');
          ctx!.fillStyle = '#e2e8f0';
          ctx!.font = 'bold 11px ui-monospace, monospace';
          ctx!.textAlign = 'center';
          ctx!.fillText(`${grp.label}: ${grp.suid ? '4+' + oct : oct}`, px + colW / 2, py + 19);

          const bits: Array<{ k: 'r' | 'w' | 'x'; label: string; on: boolean }> = [
            { k: 'r', label: 'r(4)', on: grp.val.r },
            { k: 'w', label: 'w(2)', on: grp.val.w },
            { k: 'x', label: grp.suid ? 's' : 'x(1)', on: grp.val.x },
          ];
          const bw = Math.floor((colW - 24) / 3);
          bits.forEach((b, bi) => {
            const bitId = `r2-bit-${grp.key}-${b.k}`;
            const hovered = stateRef.current.hoverId === bitId;
            const bx = px + 8 + bi * (bw + 4);
            const by = py + 32;
            const bColor = hovered ? '#fde047' : grp.suid && b.k === 'x' ? '#f59e0b' : b.on ? '#22c55e' : '#334155';
            drawPixelBox(ctx!, bx, by, bw, 34, b.on ? '#143326' : '#0f172a', bColor);
            ctx!.fillStyle = b.on ? '#f8fafc' : '#64748b';
            ctx!.font = 'bold 10px ui-monospace, monospace';
            ctx!.fillText(b.label, bx + bw / 2, by + 21);

            stateRef.current.hitBoxes.push({
              id: bitId,
              x: ox + bx,
              y: oy + by,
              w: bw,
              h: 34,
              action: () => trigger(`r2:bit:${grp.key}:${b.k}`),
            });
          });

          ctx!.fillStyle = good ? '#86efac' : '#94a3b8';
          ctx!.font = '10px ui-monospace, monospace';
          ctx!.fillText(idx === 0 ? 'Cần rw- (6)' : 'Cần --- (0)', px + colW / 2, py + ph - 11);
        });
      }

      // ROOM 3
      else if (g.room === 2) {
        const is744 = g.r3.mode === '744';
        const op = g.r3.lastAction;

        drawBannerText(
          ctx!,
          W / 2,
          50,
          is744
            ? 'chmod 744 /tmp/thumuc · Cửa Kính (r=1) + Cửa Sắt Khóa (x=0)'
            : 'chmod 711 /tmp/thumuc · Phòng Tối (r=0) + Cửa Sắt Mở (x=1)',
          is744 ? '#38bdf8' : '#f59e0b',
        );

        const vaultX = Math.round(W * 0.42);
        const vaultW = Math.round(W * 0.52);
        const vaultY = 88;
        const vaultH = H - 106;

        const shakeX = op === 'cat' && is744 && elapsed < 520 ? Math.sin(elapsed * 0.08) * 5 : 0;

        drawPixelBox(
          ctx!,
          vaultX + shakeX,
          vaultY,
          vaultW,
          vaultH,
          is744 ? '#15253d' : '#05070c',
          is744 ? '#38bdf8' : '#f59e0b',
        );

        if (is744) {
          ctx!.fillStyle = 'rgba(56, 189, 248, 0.08)';
          ctx!.beginPath();
          ctx!.moveTo(vaultX + 14 + shakeX, vaultY + 34);
          ctx!.lineTo(vaultX + 160 + shakeX, vaultY + vaultH - 12);
          ctx!.lineTo(vaultX + 70 + shakeX, vaultY + vaultH - 12);
          ctx!.lineTo(vaultX + 14 + shakeX, vaultY + 80);
          ctx!.closePath();
          ctx!.fill();
        }

        ctx!.fillStyle = is744 ? '#7dd3fc' : '#fbbf24';
        ctx!.font = 'bold 11px ui-monospace, monospace';
        ctx!.textAlign = 'left';
        ctx!.fillText(`/tmp/thumuc [${g.r3.mode}]`, vaultX + 18 + shakeX, vaultY + 20);

        const scrollX = vaultX + Math.round(vaultW * 0.65) + shakeX;
        const scrollY = vaultY + Math.round(vaultH * 0.52);

        const lanternActive = !is744 && op === 'cat';
        if (lanternActive) {
          const lx = vaultX + 36 + (scrollX - 46 - (vaultX + 36)) * animT;
          const grad = ctx!.createRadialGradient(lx, scrollY, 8, lx, scrollY, 104);
          grad.addColorStop(0, 'rgba(253, 224, 71, 0.42)');
          grad.addColorStop(0.55, 'rgba(245, 158, 11, 0.16)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx!.fillStyle = grad;
          ctx!.fillRect(vaultX + 4, vaultY + 4, vaultW - 8, vaultH - 8);
        }

        if (is744 || lanternActive) {
          drawPixelSprite(ctx!, scrollX, scrollY, sprPx * 0.9, SCROLL_ROWS, SCROLL_PAL);
          if (lanternActive && animT > 0.85) drawPixelSparkles(ctx!, scrollX, scrollY, now, '#4ade80');
          ctx!.fillStyle = lanternActive ? '#86efac' : '#e2e8f0';
          ctx!.font = 'bold 11px ui-monospace, monospace';
          ctx!.textAlign = 'center';
          ctx!.fillText('a.txt', scrollX, scrollY + 28);
          if (lanternActive) {
            ctx!.fillStyle = '#facc15';
            ctx!.fillText('"bi mat"', scrollX, scrollY + 44);
          }
        } else {
          ctx!.fillStyle = '#334155';
          ctx!.font = 'bold 12px ui-monospace, monospace';
          ctx!.textAlign = 'center';
          ctx!.fillText('🌑 PHÒNG TỐI ĐEN (r=0)', vaultX + vaultW * 0.56, scrollY);
          ctx!.font = '10px ui-monospace, monospace';
          ctx!.fillText('ls không thấy danh sách!', vaultX + vaultW * 0.56, scrollY + 18);
        }

        const wallX = vaultX - 12 + shakeX;
        const winY = vaultY + 30;
        const gateY = vaultY + Math.round(vaultH * 0.54);

        drawPixelBox(ctx!, wallX, winY, 28, 44, is744 ? '#0ea5e9' : '#334155', is744 ? '#bae6fd' : '#64748b');
        ctx!.fillStyle = '#0f172a';
        ctx!.font = 'bold 9px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(is744 ? 'KÍNH' : 'ĐÁ', wallX + 14, winY + 19);
        ctx!.fillText(is744 ? 'r=1' : 'r=0', wallX + 14, winY + 32);

        drawPixelBox(ctx!, wallX, gateY, 28, 54, is744 ? '#7f1d1d' : '#14532d', is744 ? '#ef4444' : '#22c55e');
        if (is744) {
          ctx!.fillStyle = '#fca5a5';
          ctx!.fillRect(wallX + 7, gateY + 4, 2, 46);
          ctx!.fillRect(wallX + 13, gateY + 4, 2, 46);
          ctx!.fillRect(wallX + 19, gateY + 4, 2, 46);
        }
        ctx!.fillStyle = '#f8fafc';
        ctx!.font = 'bold 9px ui-monospace, monospace';
        ctx!.fillText(is744 ? 'KHÓA' : 'MỞ', wallX + 14, gateY + 25);
        ctx!.fillText(is744 ? 'x=0' : 'x=1', wallX + 14, gateY + 38);

        let nx = Math.round(W * 0.16);
        const ny = gateY + 27;
        if (!is744 && op === 'cat') {
          nx = Math.round(W * 0.16 + (scrollX - 42 - W * 0.16) * animT);
        } else if (is744 && op === 'cat') {
          nx = Math.round(W * 0.16 + Math.sin(animT * Math.PI) * (wallX - 28 - W * 0.16));
        }
        drawPixelSprite(ctx!, nx, ny, sprPx, NOBODY_ROWS, NOBODY_PAL);
        ctx!.fillStyle = '#fbbf24';
        ctx!.font = 'bold 10px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText('nobody', nx, ny + 30);

        if (is744 && op === 'cat') {
          ctx!.fillStyle = '#ef4444';
          ctx!.font = 'bold 11px ui-monospace, monospace';
          ctx!.fillText('✕ Permission denied!', wallX - 2, gateY - 10 - Math.round(animT * 10));
        }

        if (op === 'ls') {
          ctx!.strokeStyle = is744 ? '#22c55e' : '#ef4444';
          ctx!.lineWidth = 3;
          ctx!.setLineDash([5, 4]);
          ctx!.beginPath();
          ctx!.moveTo(nx + 18, ny - 10);
          ctx!.lineTo(wallX, winY + 22);
          if (is744) ctx!.lineTo(scrollX - 22, scrollY);
          ctx!.stroke();
          ctx!.setLineDash([]);
          if (!is744) {
            ctx!.fillStyle = '#ef4444';
            ctx!.font = 'bold 11px ui-monospace, monospace';
            ctx!.fillText('✕ Bị tường chặn (r=0)', wallX - 10, winY - 8);
          }
        }
      }

      // ROOM 4
      else if (g.room === 3) {
        drawBannerText(
          ctx!,
          W / 2,
          50,
          !g.r4.scanned
            ? 'Bấm ① Quét find -perm -4000 để rà 2 giá vũ khí'
            : !g.r4.useDevNull
              ? '✕ Thiếu 2>/dev/null: ngập lỗi Permission denied!'
              : g.r4.inspectedNmap
                ? '★ /usr/bin/nmap (bit 4755) — Cửa thoát root bằng --interactive!'
                : 'Phát hiện kiếm SUID bất thường trên kệ Metasploitable 2!',
          !g.r4.useDevNull ? '#ef4444' : g.r4.inspectedNmap ? '#facc15' : '#22c55e',
        );

        const rackW = Math.round((W - 56) / 2);
        const rackY = 88;
        const rackH = H - 106;
        const leftX = 20;
        const rightX = W - 20 - rackW;

        drawPixelBox(ctx!, leftX, rackY, rackW, rackH, '#111827', '#38bdf8');
        drawPixelBox(ctx!, rightX, rackY, rackW, rackH, '#111827', g.r4.inspectedNmap ? '#ef4444' : '#f59e0b');

        ctx!.font = 'bold 11px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillStyle = '#38bdf8';
        ctx!.fillText('KỆ CHUẨN: KALI', leftX + rackW / 2, rackY + 19);
        ctx!.fillStyle = '#fbbf24';
        ctx!.fillText('MỤC TIÊU: METASPLOITABLE 2', rightX + rackW / 2, rackY + 19);

        const rowH = Math.min(34, Math.floor((rackH - 36) / 5));
        KALI_SUID_BINS.forEach((b, i) => {
          const ry = rackY + 29 + i * rowH;
          drawPixelSprite(ctx!, leftX + 24, ry + 12, 1.3, SWORD_ROWS, SWORD_IRON_PAL);
          ctx!.fillStyle = '#cbd5e1';
          ctx!.font = '11px ui-monospace, monospace';
          ctx!.textAlign = 'left';
          ctx!.fillText(`/usr/bin/${b}`, leftX + 42, ry + 16);
        });

        META_SUID_BINS.forEach((b, i) => {
          const ry = rackY + 29 + i * rowH;
          const isNmap = b === 'nmap';
          const lit = g.r4.scanned && g.r4.useDevNull && isNmap;
          const nmapHover = isNmap && stateRef.current.hoverId === 'r4-nmap';
          if (lit || nmapHover) {
            drawPixelBox(ctx!, rightX + 8, ry - 2, rackW - 16, rowH - 2, lit ? '#3b0d14' : '#1e293b', nmapHover ? '#fde047' : '#ef4444');
          }
          drawPixelSprite(
            ctx!,
            rightX + 24,
            ry + 12,
            lit ? 1.5 : 1.3,
            SWORD_ROWS,
            lit ? SWORD_SUID_PAL : SWORD_IRON_PAL,
          );
          if (g.r4.inspectedNmap && isNmap) {
            drawPixelSparkles(ctx!, rightX + 24, ry + 12, now, '#ef4444');
          }
          ctx!.fillStyle = lit ? '#fca5a5' : '#cbd5e1';
          ctx!.font = lit ? 'bold 11px ui-monospace, monospace' : '11px ui-monospace, monospace';
          ctx!.textAlign = 'left';
          ctx!.fillText(lit ? `/usr/bin/${b} [4755 ★]` : `/usr/bin/${b}`, rightX + 42, ry + 16);

          if (isNmap) {
            stateRef.current.hitBoxes.push({
              id: 'r4-nmap',
              x: ox + rightX + 8,
              y: oy + ry - 2,
              w: rackW - 16,
              h: rowH,
              action: () => trigger('r4:inspectNmap'),
            });
          }
        });

        if (stateRef.current.lastActionKey === 'r4:scan' && elapsed < 650) {
          const rx = leftX + (rightX + rackW - leftX) * animT;
          ctx!.strokeStyle = '#4ade80';
          ctx!.lineWidth = 3;
          ctx!.beginPath();
          ctx!.moveTo(rx, rackY + 4);
          ctx!.lineTo(rx, rackY + rackH - 4);
          ctx!.stroke();
        }

        if (g.r4.scanned && !g.r4.useDevNull) {
          for (let k = 0; k < 5; k++) {
            const errY = rackY + 40 + ((Math.floor(now / 120) + k * 34) % (rackH - 58));
            drawPixelBox(ctx!, W * 0.25, errY, W * 0.5, 22, '#450a0a', '#ef4444');
            ctx!.fillStyle = '#fca5a5';
            ctx!.font = 'bold 10px ui-monospace, monospace';
            ctx!.textAlign = 'center';
            ctx!.fillText('Permission denied (trôi mất kết quả!)', W / 2, errY + 14);
          }
        }
      }

      // ROOM 5
      else if (g.room === 4) {
        drawBannerText(
          ctx!,
          W / 2,
          50,
          !g.r5.grepped
            ? 'Thư viện /var/www: Quét grep -rIil "pass" tìm mật khẩu lộ'
            : !g.r5.useBinarySkip
              ? '✕ Thiếu -I: grep đọc nhầm cả file ảnh nhị phân logo.png!'
              : g.r5.openedDvwa
                ? "★ Trích xuất được db_password = 'p@ssw0rd' từ DVWA!"
                : '3 cuộn hồ sơ bật sáng! Bấm mở dvwa/config.inc.php',
          !g.r5.useBinarySkip ? '#ef4444' : g.r5.openedDvwa ? '#22c55e' : '#f59e0b',
        );

        const files = [
          { name: 'dvwa/config/config.inc.php', hit: true, dvwa: true },
          { name: 'mutillidae/config.inc', hit: true, dvwa: false },
          { name: 'phpMyAdmin/config.inc.php', hit: true, dvwa: false },
          { name: 'assets/logo.png (ảnh nhị phân)', hit: false, bin: true },
          { name: 'index.php (trang tĩnh)', hit: false, dvwa: false },
        ];
        const lx = 26;
        const lw = W - 52;
        const startY = 88;
        const rowH = Math.min(36, Math.floor((H - startY - 16) / 5));

        files.forEach((f, i) => {
          const ry = startY + i * rowH;
          const lit = g.r5.grepped && g.r5.useBinarySkip && f.hit;
          const binNoise = g.r5.grepped && !g.r5.useBinarySkip && f.bin;
          const opened = g.r5.openedDvwa && f.dvwa;
          const hovered = f.dvwa && stateRef.current.hoverId === 'r5-dvwa';
          drawPixelBox(
            ctx!,
            lx,
            ry,
            lw,
            rowH - 4,
            opened ? '#143326' : binNoise ? '#450a0a' : lit ? '#2a220b' : '#111827',
            hovered ? '#fde047' : opened ? '#22c55e' : binNoise ? '#ef4444' : lit ? '#facc15' : '#334155',
          );
          drawPixelSprite(ctx!, lx + 20, ry + (rowH - 4) / 2, 1.3, SCROLL_ROWS, SCROLL_PAL);
          ctx!.fillStyle = opened ? '#86efac' : binNoise ? '#fca5a5' : lit ? '#fde047' : '#94a3b8';
          ctx!.font = lit || opened || binNoise ? 'bold 11px ui-monospace, monospace' : '11px ui-monospace, monospace';
          ctx!.textAlign = 'left';
          ctx!.fillText(
            opened
              ? `★ ${f.name}  →  db_password = 'p@ssw0rd'`
              : binNoise
                ? `⚠ Binary file ${f.name} matches (rác nhị phân!)`
                : `/var/www/${f.name}`,
            lx + 38,
            ry + rowH * 0.56,
            lw - 52,
          );
          if (f.dvwa) {
            stateRef.current.hitBoxes.push({
              id: 'r5-dvwa',
              x: ox + lx,
              y: oy + ry,
              w: lw,
              h: rowH - 4,
              action: () => trigger('r5:openDvwa'),
            });
          }
        });

        if (stateRef.current.lastActionKey === 'r5:grep' && elapsed < 650) {
          const sy = startY + rowH * 5 * animT;
          ctx!.strokeStyle = '#38bdf8';
          ctx!.lineWidth = 3;
          ctx!.beginPath();
          ctx!.moveTo(lx, sy);
          ctx!.lineTo(lx + lw, sy);
          ctx!.stroke();
        }
      }

      // ROOM 6
      else {
        drawBannerText(
          ctx!,
          W / 2,
          50,
          g.r6.hasFail && g.r6.hasOk
            ? '✓ Đã ghi đủ dấu chân Failed & Accepted trên phiến đá auth.log!'
            : 'Tháp canh SSH: Thử đăng nhập sai & đúng từ Kali (10.10.14.7)',
          g.r6.hasFail && g.r6.hasOk ? '#22c55e' : '#38bdf8',
        );

        const kaliX = Math.round(W * 0.14);
        drawPixelSprite(ctx!, kaliX, floorMidY - 8, sprPx, walkFrame ? HERO_IDLE_ROWS : HERO_WALK_ROWS, heroPal);
        ctx!.fillStyle = '#38bdf8';
        ctx!.font = 'bold 10px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText('10.10.14.7', kaliX, floorMidY + 32);

        const eyeX = Math.round(W * 0.34);
        drawPixelSprite(ctx!, eyeX, floorMidY - 10, sprPx, SENTRY_EYE_ROWS, SENTRY_EYE_PAL);
        ctx!.fillStyle = '#f8fafc';
        ctx!.font = 'bold 10px ui-monospace, monospace';
        ctx!.fillText('sshd CCTV', eyeX, floorMidY + 32);

        const logX = Math.round(W * 0.48);

        if (stateRef.current.lastActionKey.startsWith('r6:') && elapsed < 850) {
          const isBrute = stateRef.current.lastActionKey === 'r6:sshBrute';
          const count = isBrute ? 4 : 1;
          for (let pi = 0; pi < count; pi++) {
            const localT = (elapsed - pi * 140) / 550;
            if (localT >= 0 && localT <= 1) {
              const px = kaliX + 18 + (logX - (kaliX + 18)) * localT;
              const isGreen = isBrute ? pi === 3 : stateRef.current.lastActionKey === 'r6:sshOk';
              ctx!.fillStyle = isGreen ? '#22c55e' : '#ef4444';
              ctx!.fillRect(Math.round(px - 4), Math.round(floorMidY - 17), 8, 8);
              ctx!.fillStyle = '#ffffff';
              ctx!.fillRect(Math.round(px - 2), Math.round(floorMidY - 15), 4, 4);
            }
          }
        }

        const logW = W - logX - 18;
        const logY = 78;
        const logH = H - logY - 12;
        drawPixelBox(ctx!, logX, logY, logW, logH, '#090d16', '#f59e0b');
        drawPixelSprite(ctx!, logX + 20, logY + 18, 1.3, SCROLL_ROWS, SCROLL_PAL);
        ctx!.fillStyle = '#fbbf24';
        ctx!.font = 'bold 11px ui-monospace, monospace';
        ctx!.textAlign = 'left';
        ctx!.fillText('/var/log/auth.log', logX + 36, logY + 22);

        const visible = g.r6.logs.slice(-5);
        const rowStep = Math.max(21, Math.min(29, Math.floor((logH - 38) / 5)));
        const rowBoxH = Math.min(24, rowStep - 3);
        visible.forEach((entry, idx) => {
          const ey = logY + 34 + idx * rowStep;
          const border = entry.type === 'fail' ? '#ef4444' : entry.type === 'ok' ? '#22c55e' : '#334155';
          const textCol = entry.type === 'fail' ? '#fca5a5' : entry.type === 'ok' ? '#86efac' : '#94a3b8';
          drawPixelBox(ctx!, logX + 10, ey, logW - 20, rowBoxH, '#111827', border);
          ctx!.fillStyle = textCol;
          ctx!.font = '10px ui-monospace, monospace';
          ctx!.fillText(entry.text, logX + 16, ey + Math.round(rowBoxH / 2) + 3, logW - 32);
        });
      }

      ctx!.restore();
    }

    function drawPreviewShowcase(W: number, H: number, now: number) {
      const g = stateRef.current.game;
      const clearedAll = countClearedRooms(g) === ROOMS.length;
      drawPixelDungeonRoom(ctx!, W, H, now, { carpetColor: '#183126', pillars: false });

      const walkFrame = Math.floor(now / 260) % 2 === 0;
      drawPixelSprite(ctx!, W * 0.2, H * 0.52, 2.8, walkFrame ? HERO_WALK_ROWS : HERO_IDLE_ROWS, clearedAll ? HERO_GOLD_PAL : HERO_GREEN_PAL);
      drawPixelSprite(ctx!, W * 0.4, H * 0.52, 2.8, clearedAll ? CHEST_OPEN_ROWS : CHEST_CLOSED_ROWS, CHEST_PAL);
      drawPixelSprite(ctx!, W * 0.6, H * 0.51, 2.6, SWORD_ROWS, SWORD_SUID_PAL);
      drawPixelSprite(ctx!, W * 0.8, H * 0.52, 2.5, SENTRY_EYE_ROWS, SENTRY_EYE_PAL);
      if (clearedAll) drawPixelSparkles(ctx!, W * 0.4, H * 0.48, now);

      drawBannerText(ctx!, W / 2, 12, `Điệp vụ Hầm ngục Linux · 6 Phòng Game Pixel · Đã mở ${countClearedRooms(g)}/6`, '#facc15');

      const stripW = Math.min(98, Math.floor((W - 44) / 6));
      const totalStripW = stripW * 6 + 5 * 6;
      const sx = Math.round((W - totalStripW) / 2);
      const sy = H - 32;
      ROOMS.forEach((_, i) => {
        const cleared = isRoomCleared(g, i);
        const rx = sx + i * (stripW + 6);
        drawPixelBox(ctx!, rx, sy, stripW, 22, cleared ? '#143326' : '#0f172a', cleared ? '#22c55e' : '#334155');
        ctx!.fillStyle = cleared ? '#86efac' : '#94a3b8';
        ctx!.font = 'bold 9px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(`${i + 1}.${cleared ? '✓' : '·'}`, rx + stripW / 2, sy + 14);
      });
    }

    function draw(now = performance.now()) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      if (W < 10 || H < 10) return;

      ctx!.clearRect(0, 0, W, H);
      stateRef.current.hitBoxes = [];

      if (!stateRef.current.isFullscreen) {
        drawPreviewShowcase(W, H, now);
        return;
      }

      drawRoomStage(0, 0, W, H, now);
    }

    let rafId = 0;
    function loop(now: number) {
      rafId = requestAnimationFrame(loop);
      draw(now);
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

  const clearedCount = countClearedRooms(game);
  const currentRoomCleared = isRoomCleared(game, game.room);
  const term = getRoomTerminal(game);
  const permDisplay = getPermDisplay(game.r2);

  return (
    <>
      <div className="sim dual-launcher ow-launcher">
        <div className="dual-head">
          <div>
            <p className="sim-title" style={{ marginBottom: 4 }}>
              Điệp vụ Hầm ngục Linux (Game Pixel · 6 phòng)
            </p>
            <p className="muted small" style={{ margin: 0 }}>
              Đi qua 6 căn phòng trên <strong>Metasploitable 2</strong> trong game pixel để tự tay thử SSH, khóa quyền <code>600</code>, phép thử <code>744</code> vs <code>711</code>, săn SUID <code>nmap</code>, <code>grep</code> mật khẩu và soi dấu chân <code>auth.log</code>.
            </p>
          </div>
          <button type="button" className="btn primary dual-reset" onClick={() => setIsFullscreen(true)}>
            ▶ CHƠI GAME PIXEL TOÀN MÀN HÌNH
          </button>
        </div>

        <SimHow
          steps={[
            'Bấm "▶ CHƠI GAME PIXEL TOÀN MÀN HÌNH" (hoặc bấm vào khung xem trước bên dưới) để mở bản đồ 6 phòng.',
            'Hoàn thành thử thách trong từng phòng để mở khóa đủ 6/6 Chìa khóa Vàng trước khi xuống làm bài thực hành thật.',
          ]}
        />

        {!isFullscreen && (
          <div
            className="dual-launcher-preview"
            onClick={() => setIsFullscreen(true)}
            role="button"
            tabIndex={0}
            aria-label="Mở game Điệp vụ Hầm ngục Linux toàn màn hình"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsFullscreen(true);
              }
            }}
          >
            <canvas ref={canvasRef} className="ow-preview-canvas" />
            <div className="dual-launcher-overlay">
              <span>▶ BẤM ĐỂ CHƠI GAME PIXEL (6 PHÒNG · ĐÃ MỞ {clearedCount}/6)</span>
            </div>
          </div>
        )}
      </div>

      {isFullscreen && (
        <div className="ow-fs-stage ld-fs-stage" role="dialog" aria-modal="true" aria-label="Game Điệp vụ Hầm ngục Linux">
          <div className="ow-fs-bar">
            <div className="ow-btn-group">
              {ROOMS.map((rm, idx) => {
                const cleared = isRoomCleared(game, idx);
                return (
                  <button
                    key={rm.id}
                    type="button"
                    className={`gba-btn gba-btn-sm ${game.room === idx ? 'active' : ''}`}
                    onClick={() => selectRoom(idx)}
                  >
                    {rm.short} {cleared ? '✓' : ''}
                  </button>
                );
              })}
            </div>

            <div className="ow-fs-actions">
              <span className={`ld-key-badge ${clearedCount === 6 ? 'all' : ''}`}>
                🔑 {clearedCount}/6 {clearedCount === 6 ? '· HOÀN THÀNH TOÀN BỘ!' : ''}
              </span>
              <button type="button" className="gba-btn gba-btn-sm" onClick={resetAll}>
                ↻ Chơi lại
              </button>
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
                const hit = stateRef.current.hitBoxes.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.h);
                if (hit) hit.action();
              }}
              onMouseMove={(e) => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const hit = stateRef.current.hitBoxes.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.h);
                stateRef.current.hoverId = hit ? hit.id : '';
                canvas.style.cursor = hit ? 'pointer' : 'default';
              }}
              onMouseLeave={() => {
                stateRef.current.hoverId = '';
              }}
            />
          </div>

          <div className="ow-fs-bottom ld-fs-bottom">
            <div className="ld-action-bar">
              <div className="ow-btn-group">
                {game.room === 0 && (
                  <>
                    <button type="button" className={`gba-btn gba-btn-sm ${game.r1.idScanned ? 'active' : ''}`} onClick={() => trigger('r1:id')}>
                      ① Quét whoami & id
                    </button>
                    <button type="button" className={`gba-btn gba-btn-sm ${game.r1.passwdFiltered ? 'active' : ''}`} onClick={() => trigger('r1:passwd')}>
                      ② Lọc /etc/passwd (sh$)
                    </button>
                  </>
                )}

                {game.room === 1 && (
                  <>
                    <button type="button" className={`gba-btn gba-btn-sm ${permDisplay.is600 ? 'active' : ''}`} onClick={() => trigger('r2:preset600')}>
                      Đặt nhanh 600
                    </button>
                    <button type="button" className="gba-btn gba-btn-sm" onClick={() => trigger('r2:preset640')}>
                      Thử 640
                    </button>
                    <button type="button" className="gba-btn gba-btn-sm" onClick={() => trigger('r2:preset755')}>
                      Thử 755
                    </button>
                    <button type="button" className={`gba-btn gba-btn-sm ${game.r2.suid ? 'active' : ''}`} onClick={() => trigger('r2:toggleSuid')}>
                      {game.r2.suid ? 'Khôi phục từ SUID' : 'Xem mẫu SUID (4755)'}
                    </button>
                    <span className="ld-hint-pill">(Hoặc bấm trực tiếp các nút r/w/x trên cột đá)</span>
                  </>
                )}

                {game.room === 2 && (
                  <>
                    <button type="button" className={`gba-btn gba-btn-sm ${game.r3.mode === '744' ? 'active' : ''}`} onClick={() => trigger('r3:mode744')}>
                      Chế độ 744 (Kính)
                    </button>
                    <button type="button" className={`gba-btn gba-btn-sm ${game.r3.mode === '711' ? 'active' : ''}`} onClick={() => trigger('r3:mode711')}>
                      Chế độ 711 (Tối)
                    </button>
                    <button type="button" className="gba-btn gba-btn-sm" onClick={() => trigger('r3:ls')}>
                      ▶ nobody: ls /tmp/thumuc
                    </button>
                    <button type="button" className="gba-btn gba-btn-sm" onClick={() => trigger('r3:cat')}>
                      ▶ nobody: cat .../a.txt
                    </button>
                    <span className="ld-check-group">
                      <span className={`ld-chk ${game.r3.seen744Ls ? 'ok' : ''}`}>744 ls {game.r3.seen744Ls ? '✓' : '·'}</span>
                      <span className={`ld-chk ${game.r3.seen744Cat ? 'ok' : ''}`}>744 cat {game.r3.seen744Cat ? '✓' : '·'}</span>
                      <span className={`ld-chk ${game.r3.seen711Ls ? 'ok' : ''}`}>711 ls {game.r3.seen711Ls ? '✓' : '·'}</span>
                      <span className={`ld-chk ${game.r3.seen711Cat ? 'ok' : ''}`}>711 cat {game.r3.seen711Cat ? '✓' : '·'}</span>
                    </span>
                  </>
                )}

                {game.room === 3 && (
                  <>
                    <button type="button" className={`gba-btn gba-btn-sm ${game.r4.scanned ? 'active' : ''}`} onClick={() => trigger('r4:scan')}>
                      ① Quét find -perm -4000
                    </button>
                    <button type="button" className="gba-btn gba-btn-sm" onClick={() => trigger('r4:toggleDevNull')}>
                      {game.r4.useDevNull ? 'Thử bỏ 2>/dev/null' : 'Bật lại 2>/dev/null'}
                    </button>
                    <button type="button" className={`gba-btn gba-btn-sm ${game.r4.inspectedNmap ? 'active' : ''}`} onClick={() => trigger('r4:inspectNmap')}>
                      ② Soi /usr/bin/nmap
                    </button>
                  </>
                )}

                {game.room === 4 && (
                  <>
                    <button type="button" className={`gba-btn gba-btn-sm ${game.r5.grepped ? 'active' : ''}`} onClick={() => trigger('r5:grep')}>
                      ① Quét grep -rIil "pass"
                    </button>
                    <button type="button" className="gba-btn gba-btn-sm" onClick={() => trigger('r5:toggleBinarySkip')}>
                      {game.r5.useBinarySkip ? 'Thử bỏ cờ -I' : 'Bật lại cờ -I'}
                    </button>
                    <button type="button" className={`gba-btn gba-btn-sm ${game.r5.openedDvwa ? 'active' : ''}`} onClick={() => trigger('r5:openDvwa')}>
                      ② Mở dvwa/config.inc.php
                    </button>
                  </>
                )}

                {game.room === 5 && (
                  <>
                    <button type="button" className={`gba-btn gba-btn-sm ${game.r6.hasFail ? 'active' : ''}`} onClick={() => trigger('r6:sshFail')}>
                      ① Gõ sai mật khẩu SSH
                    </button>
                    <button type="button" className={`gba-btn gba-btn-sm ${game.r6.hasOk ? 'active' : ''}`} onClick={() => trigger('r6:sshOk')}>
                      ② Đăng nhập SSH đúng
                    </button>
                    <button type="button" className="gba-btn gba-btn-sm" onClick={() => trigger('r6:sshBrute')}>
                      ③ Giả lập dò mật khẩu
                    </button>
                  </>
                )}
              </div>

              <div className="ow-btn-group">
                <button
                  type="button"
                  className="gba-btn gba-btn-sm"
                  disabled={game.room === 0}
                  onClick={() => selectRoom(Math.max(0, game.room - 1))}
                >
                  ← Phòng trước
                </button>
                <button
                  type="button"
                  className={`gba-btn gba-btn-sm ${currentRoomCleared && game.room < ROOMS.length - 1 ? 'active ld-next-ready' : ''}`}
                  disabled={game.room === ROOMS.length - 1}
                  onClick={() => selectRoom(Math.min(ROOMS.length - 1, game.room + 1))}
                >
                  {currentRoomCleared && game.room < ROOMS.length - 1 ? '✓ Sang phòng tiếp →' : 'Phòng tiếp →'}
                </button>
              </div>
            </div>

            <div className="ow-fs-narration ld-bottom-grid">
              <pre className="ld-term-pre">
                <span className="ld-term-cmd">$ {term.cmd}</span>
                {'\n'}
                {term.output}
              </pre>
              <div className="ld-story-box">
                <p className="ld-story-goal">
                  <strong>Mục tiêu:</strong> {ROOMS[game.room].goal}
                </p>
                <p className="ow-fs-caption ld-story-caption">
                  <strong>Cơ chế:</strong> {term.caption}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
