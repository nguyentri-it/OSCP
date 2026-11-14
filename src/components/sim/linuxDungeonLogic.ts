export interface PermGroup {
  r: boolean;
  w: boolean;
  x: boolean;
}

export interface DungeonState {
  room: number; // 0..5
  r1: {
    sshEntered: boolean;
    idScanned: boolean;
    passwdFiltered: boolean;
  };
  r2: {
    owner: PermGroup;
    group: PermGroup;
    other: PermGroup;
    suid: boolean;
    savedBeforeSuid: { owner: PermGroup; group: PermGroup; other: PermGroup } | null;
  };
  r3: {
    mode: '744' | '711';
    lastAction: 'none' | 'ls' | 'cat';
    lastAllowed: boolean | null;
    seen744Ls: boolean;
    seen744Cat: boolean;
    seen711Ls: boolean;
    seen711Cat: boolean;
  };
  r4: {
    scanned: boolean;
    useDevNull: boolean;
    inspectedNmap: boolean;
  };
  r5: {
    grepped: boolean;
    useBinarySkip: boolean;
    openedDvwa: boolean;
  };
  r6: {
    logs: Array<{ type: 'info' | 'fail' | 'ok'; text: string }>;
    hasFail: boolean;
    hasOk: boolean;
    secCounter: number;
    pidCounter: number;
    portCounter: number;
  };
}

export interface RoomMeta {
  id: number;
  short: string;
  title: string;
  goal: string;
}

export const ROOMS: RoomMeta[] = [
  {
    id: 0,
    short: '1. Cổng SSH',
    title: 'Phòng 1 · Định hướng qua SSH & /etc/passwd',
    goal: 'Vượt cầu SSH vào Metasploitable 2, soi thẻ nhóm quyền (id) và lọc 5 tài khoản có shell thật trong 41 dòng /etc/passwd.',
  },
  {
    id: 1,
    short: '2. Khóa 600',
    title: 'Phòng 2 · Hầm khóa bit rwx (chmod)',
    goal: 'Gạt công tắc r(4) w(2) x(1) của 3 cột (Chủ - Nhóm - Khác) để khóa rương ~/thu.txt về đúng 600 (-rw-------).',
  },
  {
    id: 2,
    short: '3. Kính & Tối',
    title: 'Phòng 3 · Ý nghĩa chữ x trên thư mục (744 vs 711)',
    goal: 'Điều khiển user nobody chạy đủ 4 phép thử: ls & cat ở chế độ 744 (cửa kính khóa chốt) và 711 (phòng tối mở chốt).',
  },
  {
    id: 3,
    short: '4. Kho SUID',
    title: 'Phòng 4 · So sánh kệ vũ khí SUID (find -perm -4000)',
    goal: 'Quét find / -perm -4000 -type f 2>/dev/null để so sánh Kali với Metasploitable 2, rồi soi kiếm đỏ /usr/bin/nmap.',
  },
  {
    id: 4,
    short: '5. Sách Web',
    title: 'Phòng 5 · Thư viện /var/www (grep -rIil)',
    goal: 'Chiếu tia grep -rIil "pass" qua kệ hồ sơ /var/www để tìm 3 file cấu hình và mở cuộn giấy dvwa/config.inc.php.',
  },
  {
    id: 5,
    short: '6. Mắt Log',
    title: 'Phòng 6 · Tháp canh /var/log/auth.log',
    goal: 'Góc phòng thủ: thử SSH sai mật khẩu và đúng mật khẩu từ Kali (10.10.14.7) để thấy mắt thần giám sát ghi dấu chân lên phiến đá log.',
  },
];

export const SHELL_USERS = ['root', 'msfadmin', 'service', 'user', 'postgres'] as const;
export const KALI_SUID_BINS = ['passwd', 'sudo', 'su', 'mount', 'ping'] as const;
export const META_SUID_BINS = ['passwd', 'sudo', 'su', 'mount', 'nmap'] as const;

export function createInitialDungeonState(): DungeonState {
  return {
    room: 0,
    r1: { sshEntered: true, idScanned: false, passwdFiltered: false },
    r2: {
      owner: { r: true, w: false, x: false },
      group: { r: true, w: false, x: false },
      other: { r: true, w: false, x: false },
      suid: false,
      savedBeforeSuid: null,
    },
    r3: {
      mode: '744',
      lastAction: 'none',
      lastAllowed: null,
      seen744Ls: false,
      seen744Cat: false,
      seen711Ls: false,
      seen711Cat: false,
    },
    r4: { scanned: false, useDevNull: true, inspectedNmap: false },
    r5: { grepped: false, useBinarySkip: true, openedDvwa: false },
    r6: {
      logs: [{ type: 'info', text: 'Nov  9 10:00:01 sshd[101]: Server listening on 0.0.0.0:22' }],
      hasFail: false,
      hasOk: false,
      secCounter: 10,
      pidCounter: 4099,
      portCounter: 51301,
    },
  };
}

export function groupToOctal(g: PermGroup): number {
  return (g.r ? 4 : 0) + (g.w ? 2 : 0) + (g.x ? 1 : 0);
}

export function groupToRwx(g: PermGroup, suidBit = false): string {
  const xChar = suidBit ? (g.x ? 's' : 'S') : g.x ? 'x' : '-';
  return `${g.r ? 'r' : '-'}${g.w ? 'w' : '-'}${xChar}`;
}

export function getPermDisplay(r2: DungeonState['r2']): { octal: string; sym: string; is600: boolean } {
  const o = groupToOctal(r2.owner);
  const g = groupToOctal(r2.group);
  const ot = groupToOctal(r2.other);
  const octal = `${r2.suid ? '4' : ''}${o}${g}${ot}`;
  const sym = `-${groupToRwx(r2.owner, r2.suid)}${groupToRwx(r2.group)}${groupToRwx(r2.other)}`;
  const is600 = !r2.suid && o === 6 && g === 0 && ot === 0;
  return { octal, sym, is600 };
}

export function evaluateRoom3Action(
  mode: '744' | '711',
  action: 'ls' | 'cat',
): { allowed: boolean; output: string; reason: string } {
  if (mode === '744') {
    if (action === 'ls') {
      return {
        allowed: true,
        output: '$ sudo -u nobody ls /tmp/thumuc\na.txt',
        reason: 'Quyền 744 cấp cho người khác bit r (đọc danh sách), nên nobody nhìn xuyên cửa kính thấy tên file a.txt.',
      };
    }
    return {
      allowed: false,
      output: '$ sudo -u nobody cat /tmp/thumuc/a.txt\ncat: /tmp/thumuc/a.txt: Permission denied',
      reason: 'Thư mục thiếu bit x cho người khác (744 → r--). Thấy tên file qua kính nhưng cổng sắt khóa chốt: không thể bước vào mở file!',
    };
  }
  if (action === 'ls') {
    return {
      allowed: false,
      output: "$ sudo -u nobody ls /tmp/thumuc\nls: cannot open directory '/tmp/thumuc': Permission denied",
      reason: 'Quyền 711 bỏ bit r (r=0) nên phòng tối đen: nobody không liệt kê được danh sách file bên trong.',
    };
  }
  return {
    allowed: true,
    output: '$ sudo -u nobody cat /tmp/thumuc/a.txt\nbi mat',
    reason: 'Quyền 711 có bit x (x=1) mở chốt cổng! Vì đã biết sẵn tên file a.txt, nobody cầm đèn đi thẳng vào đọc trọn nội dung "bi mat".',
  };
}

export function isRoomCleared(st: DungeonState, idx: number): boolean {
  switch (idx) {
    case 0:
      return st.r1.idScanned && st.r1.passwdFiltered;
    case 1:
      return getPermDisplay(st.r2).is600;
    case 2:
      return st.r3.seen744Ls && st.r3.seen744Cat && st.r3.seen711Ls && st.r3.seen711Cat;
    case 3:
      return st.r4.scanned && st.r4.useDevNull && st.r4.inspectedNmap;
    case 4:
      return st.r5.grepped && st.r5.useBinarySkip && st.r5.openedDvwa;
    case 5:
      return st.r6.hasFail && st.r6.hasOk;
    default:
      return false;
  }
}

export function countClearedRooms(st: DungeonState): number {
  let count = 0;
  for (let i = 0; i < ROOMS.length; i++) {
    if (isRoomCleared(st, i)) count++;
  }
  return count;
}

export function getRoomTerminal(st: DungeonState): { cmd: string; output: string; caption: string } {
  const r = st.room;
  if (r === 0) {
    if (st.r1.passwdFiltered) {
      return {
        cmd: "wc -l /etc/passwd && grep -E 'sh$' /etc/passwd | cut -d: -f1",
        output: '41 /etc/passwd\nroot\nmsfadmin\nservice\nuser\npostgres',
        caption: 'Trong 41 tài khoản, 36 tài khoản hệ thống dùng nologin/false. Chỉ đúng 5 cánh cửa gỗ có shell thật cho phép đăng nhập.',
      };
    }
    if (st.r1.idScanned) {
      return {
        cmd: 'whoami && id',
        output: 'msfadmin\nuid=1000(msfadmin) gid=1000(msfadmin) groups=1000(msfadmin),...,104(admin),111(admin)',
        caption: 'Thẻ ID phát hiện nhóm admin (104, 111) — trên Ubuntu/Debian cũ, nhóm admin được cấp quyền sudo rất mạnh!',
      };
    }
    return {
      cmd: 'ssh msfadmin@10.10.14.20',
      output: 'msfadmin@metasploitable:~$ _\n(Đã vượt cầu SSH :22 vào sảnh. Bấm ① để quét thẻ ID và ② để lọc /etc/passwd)',
      caption: 'Khi vừa chiếm được shell đầu tiên, bạn luôn tự hỏi: mình là ai, thuộc nhóm nào, và máy có những tài khoản thật nào.',
    };
  }

  if (r === 1) {
    const p = getPermDisplay(st.r2);
    if (st.r2.suid) {
      return {
        cmd: 'ls -l /usr/bin/nmap   # minh họa bit SUID (4000)',
        output: `${p.sym} 1 root root ... (mã số: ${p.octal})`,
        caption: 'Chữ "s" ở vị trí x của Chủ là bit SUID (+4000): bất kỳ ai chạy file này đều tạm mượn quyền chủ sở hữu (thường là root).',
      };
    }
    if (p.is600) {
      return {
        cmd: 'chmod 600 ~/thu.txt && ls -l ~/thu.txt',
        output: '-rw------- 1 msfadmin msfadmin 7 Nov  9 10:12 /home/msfadmin/thu.txt',
        caption: 'Chuẩn 600! Chủ sở hữu đọc/ghi (4+2=6), Nhóm (0) và Người khác (0) bị khóa kín hoàn toàn.',
      };
    }
    const warnParts: string[] = [];
    if (!st.r2.owner.r || !st.r2.owner.w || st.r2.owner.x) warnParts.push('Chủ phải là rw- (6)');
    if (groupToOctal(st.r2.group) !== 0) warnParts.push('Nhóm vẫn còn quyền (cần 0)');
    if (groupToOctal(st.r2.other) !== 0) warnParts.push('Người khác vẫn chạm được (cần 0)');
    return {
      cmd: `chmod ${p.octal} ~/thu.txt && ls -l ~/thu.txt`,
      output: `${p.sym} 1 msfadmin msfadmin 7 Nov  9 10:12 /home/msfadmin/thu.txt`,
      caption: `Đang là ${p.octal} (${p.sym}). Cần chỉnh về 600: ${warnParts.join(' · ')}.`,
    };
  }

  if (r === 2) {
    if (st.r3.lastAction === 'none') {
      return {
        cmd: `chmod ${st.r3.mode} /tmp/thumuc`,
        output: `(Thư mục /tmp/thumuc đang đặt quyền ${st.r3.mode}. Hãy chạy thử cả ls và cat dưới vai trò nobody)`,
        caption: st.r3.mode === '744'
          ? 'Chế độ 744: Người khác có r (cửa kính nhìn vào được) nhưng thiếu x (chốt cửa sắt đang khóa).'
          : 'Chế độ 711: Người khác mất r (phòng tối đen) nhưng có x (chốt cửa mở để đi xuyên qua).',
      };
    }
    const res = evaluateRoom3Action(st.r3.mode, st.r3.lastAction);
    return {
      cmd: `sudo -u nobody ${st.r3.lastAction === 'ls' ? 'ls /tmp/thumuc' : 'cat /tmp/thumuc/a.txt'}`,
      output: res.output,
      caption: res.reason,
    };
  }

  if (r === 3) {
    if (!st.r4.scanned) {
      return {
        cmd: 'find / -perm -4000 -type f 2>/dev/null',
        output: '(Chưa quét. Bấm ① Quét để rà đồng thời kệ Kali chuẩn và kệ Metasploitable 2)',
        caption: 'So sánh danh sách SUID của máy mục tiêu với máy sạch (Kali) là cách nhanh nhất để phát hiện cửa leo thang.',
      };
    }
    if (!st.r4.useDevNull) {
      return {
        cmd: 'find / -perm -4000 -type f   # thiếu 2>/dev/null',
        output: "find: '/proc/1/fd': Permission denied\nfind: '/etc/ssl/private': Permission denied\n... (hàng trăm dòng lỗi che khuất /usr/bin/nmap!)",
        caption: 'Lỗi người mới hay gặp: quên 2>/dev/null khiến màn hình ngập rác Permission denied và bỏ sót /usr/bin/nmap!',
      };
    }
    if (st.r4.inspectedNmap) {
      return {
        cmd: 'ls -l /usr/bin/nmap',
        output: '-rwsr-xr-x 1 root root 780676 /usr/bin/nmap   # bit 4755!',
        caption: 'Bắt được thủ phạm! Bản nmap cũ có cờ --interactive cho phép gõ "!sh" để bật thẳng shell quyền root (bài 3.1).',
      };
    }
    return {
      cmd: 'find / -perm -4000 -type f 2>/dev/null',
      output: '/usr/bin/passwd\n/usr/bin/sudo\n/usr/bin/su\n/usr/bin/mount\n/bin/ping\n/usr/bin/nmap   <-- BẤT THƯỜNG!',
      caption: 'Kệ Kali chỉ có 5 binary hệ thống quen thuộc; Metasploitable 2 lộ ra /usr/bin/nmap phát sáng đỏ! Hãy bấm soi chi tiết.',
    };
  }

  if (r === 4) {
    if (!st.r5.grepped) {
      return {
        cmd: 'grep -rIil "pass" /var/www 2>/dev/null',
        output: '(Chưa quét thư viện /var/www. Bấm ① Quét grep để tìm file cấu hình rò rỉ mật khẩu)',
        caption: '-r (đệ quy), -I (bỏ file nhị phân), -i (không phân biệt hoa thường), -l (chỉ in tên file khớp).',
      };
    }
    if (!st.r5.useBinarySkip) {
      return {
        cmd: 'grep -ril "pass" /var/www 2>/dev/null   # thiếu cờ -I',
        output: 'Binary file /var/www/assets/logo.png matches\n... (lẫn file ảnh nhị phân vào kết quả!)',
        caption: 'Khi thiếu -I, grep đọc nhầm cả byte nhị phân trong ảnh/binary. Luôn thêm -I khi săn chuỗi trong thư mục lớn.',
      };
    }
    if (st.r5.openedDvwa) {
      return {
        cmd: 'cat /var/www/dvwa/config/config.inc.php',
        output: "$_DVWA['db_user']     = 'root';\n$_DVWA['db_password'] = 'p@ssw0rd';",
        caption: 'Lộ mật khẩu DB ở dạng chữ rõ! Pentester luôn lấy "p@ssw0rd" này thử lại cho SSH/su các tài khoản khác (tái sử dụng mật khẩu).',
      };
    }
    return {
      cmd: 'grep -rIil "pass" /var/www 2>/dev/null',
      output: '/var/www/dvwa/config/config.inc.php\n/var/www/mutillidae/config.inc\n/var/www/phpMyAdmin/config.inc.php',
      caption: '3 cuộn hồ sơ cấu hình bật sáng vàng! Mở thử dvwa/config.inc.php để trích xuất mật khẩu.',
    };
  }

  // Room 6
  const lastLogs = st.r6.logs.slice(-4).map((l) => l.text).join('\n');
  let caption = 'Mắt thần giám sát đang theo dõi mọi lần gõ cửa SSH từ IP nguồn 10.10.14.7 (Kali).';
  if (st.r6.hasFail && st.r6.hasOk) {
    caption = 'Mỗi lần sai/đúng đều ghi thời điểm, user và IP nguồn. Hàng loạt Failed liên tiếp rồi 1 Accepted là dấu hiệu đoán trúng mật khẩu (bài 8.2/8.3).';
  } else if (st.r6.hasFail) {
    caption = 'Dòng đỏ Failed password đã hiện lên phiến đá! Giờ thử đăng nhập đúng để xem dấu chân khi vào lọt.';
  } else if (st.r6.hasOk) {
    caption = 'Dòng xanh Accepted password đã được ghi. Thử bắn 1 lần sai mật khẩu để so sánh.';
  }
  return {
    cmd: 'sudo grep sshd /var/log/auth.log | tail -n 5',
    output: lastLogs,
    caption,
  };
}

function formatLogTime(secCounter: number): string {
  const mm = 14 + Math.floor(secCounter / 60);
  const ss = secCounter % 60;
  return `Nov  9 10:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function applyDungeonAction(st: DungeonState, action: string): DungeonState {
  const next: DungeonState = {
    ...st,
    r1: { ...st.r1 },
    r2: {
      owner: { ...st.r2.owner },
      group: { ...st.r2.group },
      other: { ...st.r2.other },
      suid: st.r2.suid,
      savedBeforeSuid: st.r2.savedBeforeSuid
        ? {
            owner: { ...st.r2.savedBeforeSuid.owner },
            group: { ...st.r2.savedBeforeSuid.group },
            other: { ...st.r2.savedBeforeSuid.other },
          }
        : null,
    },
    r3: { ...st.r3 },
    r4: { ...st.r4 },
    r5: { ...st.r5 },
    r6: { ...st.r6, logs: [...st.r6.logs] },
  };

  if (action === 'r1:id') next.r1.idScanned = true;
  else if (action === 'r1:passwd') next.r1.passwdFiltered = true;

  else if (action === 'r2:preset600') {
    next.r2 = { owner: { r: true, w: true, x: false }, group: { r: false, w: false, x: false }, other: { r: false, w: false, x: false }, suid: false, savedBeforeSuid: null };
  } else if (action === 'r2:preset640') {
    next.r2 = { owner: { r: true, w: true, x: false }, group: { r: true, w: false, x: false }, other: { r: false, w: false, x: false }, suid: false, savedBeforeSuid: null };
  } else if (action === 'r2:preset755') {
    next.r2 = { owner: { r: true, w: true, x: true }, group: { r: true, w: false, x: true }, other: { r: true, w: false, x: true }, suid: false, savedBeforeSuid: null };
  } else if (action === 'r2:toggleSuid') {
    if (!next.r2.suid) {
      next.r2 = {
        owner: { r: true, w: true, x: true },
        group: { r: true, w: false, x: true },
        other: { r: true, w: false, x: true },
        suid: true,
        savedBeforeSuid: {
          owner: { ...st.r2.owner },
          group: { ...st.r2.group },
          other: { ...st.r2.other },
        },
      };
    } else if (next.r2.savedBeforeSuid) {
      next.r2 = {
        ...next.r2.savedBeforeSuid,
        suid: false,
        savedBeforeSuid: null,
      };
    } else {
      next.r2.suid = false;
    }
  } else if (action.startsWith('r2:bit:')) {
    const [, , who, bit] = action.split(':') as ['r2', 'bit', 'owner' | 'group' | 'other', 'r' | 'w' | 'x'];
    next.r2.suid = false;
    next.r2.savedBeforeSuid = null;
    next.r2[who][bit] = !next.r2[who][bit];
  }

  else if (action === 'r3:mode744') {
    next.r3.mode = '744';
    next.r3.lastAction = 'none';
    next.r3.lastAllowed = null;
  } else if (action === 'r3:mode711') {
    next.r3.mode = '711';
    next.r3.lastAction = 'none';
    next.r3.lastAllowed = null;
  } else if (action === 'r3:ls' || action === 'r3:cat') {
    const op = action === 'r3:ls' ? 'ls' : 'cat';
    const res = evaluateRoom3Action(next.r3.mode, op);
    next.r3.lastAction = op;
    next.r3.lastAllowed = res.allowed;
    if (next.r3.mode === '744' && op === 'ls') next.r3.seen744Ls = true;
    if (next.r3.mode === '744' && op === 'cat') next.r3.seen744Cat = true;
    if (next.r3.mode === '711' && op === 'ls') next.r3.seen711Ls = true;
    if (next.r3.mode === '711' && op === 'cat') next.r3.seen711Cat = true;
  }

  else if (action === 'r4:scan') {
    next.r4.scanned = true;
  } else if (action === 'r4:toggleDevNull') {
    next.r4.useDevNull = !next.r4.useDevNull;
    next.r4.scanned = true;
  } else if (action === 'r4:inspectNmap') {
    next.r4.scanned = true;
    next.r4.useDevNull = true;
    next.r4.inspectedNmap = true;
  }

  else if (action === 'r5:grep') {
    next.r5.grepped = true;
  } else if (action === 'r5:toggleBinarySkip') {
    next.r5.useBinarySkip = !next.r5.useBinarySkip;
    next.r5.grepped = true;
  } else if (action === 'r5:openDvwa') {
    next.r5.grepped = true;
    next.r5.useBinarySkip = true;
    next.r5.openedDvwa = true;
  }

  else if (action === 'r6:sshFail') {
    next.r6.hasFail = true;
    next.r6.secCounter += 4;
    next.r6.pidCounter += 3;
    next.r6.portCounter += 2;
    next.r6.logs.push({
      type: 'fail',
      text: `${formatLogTime(next.r6.secCounter)} sshd[${next.r6.pidCounter}]: Failed password for msfadmin from 10.10.14.7 port ${next.r6.portCounter}`,
    });
  } else if (action === 'r6:sshOk') {
    next.r6.hasOk = true;
    next.r6.secCounter += 5;
    next.r6.pidCounter += 3;
    next.r6.portCounter += 4;
    next.r6.logs.push({
      type: 'ok',
      text: `${formatLogTime(next.r6.secCounter)} sshd[${next.r6.pidCounter}]: Accepted password for msfadmin from 10.10.14.7 port ${next.r6.portCounter}`,
    });
  } else if (action === 'r6:sshBrute') {
    next.r6.hasFail = true;
    next.r6.hasOk = true;
    for (let i = 0; i < 3; i++) {
      next.r6.secCounter += 1;
      next.r6.pidCounter += 1;
      next.r6.portCounter += 1;
      next.r6.logs.push({
        type: 'fail',
        text: `${formatLogTime(next.r6.secCounter)} sshd[${next.r6.pidCounter}]: Failed password for msfadmin from 10.10.14.7 port ${next.r6.portCounter}`,
      });
    }
    next.r6.secCounter += 2;
    next.r6.pidCounter += 2;
    next.r6.portCounter += 2;
    next.r6.logs.push({
      type: 'ok',
      text: `${formatLogTime(next.r6.secCounter)} sshd[${next.r6.pidCounter}]: Accepted password for msfadmin from 10.10.14.7 port ${next.r6.portCounter}`,
    });
  }

  if (next.r6.logs.length > 20) {
    next.r6.logs = next.r6.logs.slice(-20);
  }

  return next;
}
