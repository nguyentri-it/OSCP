export interface PermGroup {
  r: boolean;
  w: boolean;
  x: boolean;
}

export interface DungeonState {
  room: number; // 0..5
  lastAction: string;
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
    lastAction: '',
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

export interface RoomStepFeedback {
  cmd: string;
  output: string;
  whatDid: string;
  whyMatters: string;
  nextHint: string;
}

export function getRoomTerminal(st: DungeonState): RoomStepFeedback {
  const r = st.room;
  const act = st.lastAction;

  if (r === 0) {
    if (act === 'r1:id' || (!act && st.r1.idScanned && !st.r1.passwdFiltered)) {
      return {
        cmd: 'whoami && id',
        output: 'msfadmin\nuid=1000(msfadmin) gid=1000(msfadmin) groups=1000(msfadmin),...,104(admin),111(admin)',
        whatDid: 'whoami hỏi tên tài khoản đang dùng (msfadmin); id liệt kê toàn bộ các nhóm quyền mà tài khoản này đang nằm trong đó.',
        whyMatters: 'Phát hiện nhóm admin (104, 111)! Trên Linux Ubuntu/Debian, người thuộc nhóm admin thường được phép chạy sudo lên quyền root.',
        nextHint: st.r1.passwdFiltered
          ? '✓ Đã xong cả 2 bước Phòng 1! Bấm "Sang phòng tiếp →" để học cách khóa quyền file.'
          : '👉 Bấm tiếp ② Lọc /etc/passwd (sh$) để xem trên máy còn những tài khoản nào đăng nhập được.',
      };
    }
    if (st.r1.passwdFiltered) {
      return {
        cmd: "wc -l /etc/passwd && grep -E 'sh$' /etc/passwd | cut -d: -f1",
        output: '41 /etc/passwd\nroot\nmsfadmin\nservice\nuser\npostgres',
        whatDid: 'Đếm tổng 41 tài khoản trong danh bạ /etc/passwd, rồi lọc những dòng kết thúc bằng "sh" (tài khoản có shell để đăng nhập thật).',
        whyMatters: '36 dòng còn lại là tài khoản chạy ngầm (nologin/false). Lọc nhanh giúp bạn không mất thời gian thử mật khẩu nhầm chỗ, tập trung đúng 5 người dùng thật.',
        nextHint: st.r1.idScanned
          ? '✓ Đã xong Phòng 1! Bấm "✓ Sang phòng tiếp →" để sang Phòng 2.'
          : '👉 Bấm thêm ① Quét whoami & id để mở khóa đủ Phòng 1.',
      };
    }
    return {
      cmd: 'ssh msfadmin@10.10.14.20',
      output: 'msfadmin@metasploitable:~$ _',
      whatDid: 'Bạn vừa kết nối SSH vào máy mục tiêu bằng tài khoản thường msfadmin (chưa phải quyền cao nhất root).',
      whyMatters: 'Khi mới đặt chân vào một máy lạ, việc đầu tiên luôn là: biết rõ mình đang nắm quyền gì và máy này còn những tài khoản thật nào khác.',
      nextHint: '👉 Bấm ① Quét whoami & id ở thanh nút ngay phía trên để kiểm tra danh tính của bạn.',
    };
  }

  if (r === 1) {
    const p = getPermDisplay(st.r2);
    if (st.r2.suid) {
      return {
        cmd: 'ls -l /usr/bin/nmap   # minh họa bit SUID (4000)',
        output: `${p.sym} 1 root root ... (mã số: ${p.octal})`,
        whatDid: 'Bật thử bit đặc biệt SUID (+4000): chữ "x" ở cột Chủ biến thành "s" (-rwsr-xr-x), mã số thành 4755.',
        whyMatters: 'Chữ "s" nghĩa là ai chạy file này cũng được tạm mượn quyền của Chủ file (thường là root) trong lúc nó chạy — đây chính là lỗi leo quyền sẽ săn ở Phòng 4!',
        nextHint: '👉 Bấm "Khôi phục từ SUID" hoặc "Đặt nhanh 600" để khóa lại rương ~/thu.txt về 600.',
      };
    }
    if (p.is600) {
      return {
        cmd: 'chmod 600 ~/thu.txt && ls -l ~/thu.txt',
        output: '-rw------- 1 msfadmin msfadmin 7 Nov  9 10:12 /home/msfadmin/thu.txt',
        whatDid: 'Đặt quyền 600 (-rw-------): Chủ được đọc (4) + sửa (2) = 6; Nhóm = 0 và Người khác = 0 (khóa sạch).',
        whyMatters: 'Đây là quyền bắt buộc cho khóa SSH riêng tư (~/.ssh/id_rsa) và file bí mật: chỉ một mình chủ nhân chạm vào được, người lạ trên cùng máy không thể đọc trộm.',
        nextHint: '✓ Xong Phòng 2! Bấm "✓ Sang phòng tiếp →" để hiểu bẫy quyền trên thư mục.',
      };
    }
    if (act === 'r2:preset640') {
      return {
        cmd: 'chmod 640 ~/thu.txt && ls -l ~/thu.txt',
        output: '-rw-r----- 1 msfadmin msfadmin 7 Nov  9 10:12 /home/msfadmin/thu.txt',
        whatDid: 'Đặt quyền 640 (-rw-r-----): Chủ đọc+sửa (6), Nhóm được đọc (4), Người khác bị chặn (0).',
        whyMatters: 'Chặt hơn 755 nhưng Nhóm vẫn còn quyền đọc (r=4). Nếu một tài khoản khác vô tình nằm cùng nhóm, họ vẫn đọc trộm được file này.',
        nextHint: '👉 Hãy gạt công tắc r của Nhóm về 0 hoặc bấm "Đặt nhanh 600".',
      };
    }
    if (act === 'r2:preset755') {
      return {
        cmd: 'chmod 755 ~/thu.txt && ls -l ~/thu.txt',
        output: '-rwxr-xr-x 1 msfadmin msfadmin 7 Nov  9 10:12 /home/msfadmin/thu.txt',
        whatDid: 'Đặt quyền 755 (-rwxr-xr-x): Chủ toàn quyền (7), Nhóm & Người khác đều được đọc và chạy (4+1=5).',
        whyMatters: '755 dùng cho chương trình/thư mục công cộng. Đặt 755 cho file chứa mật khẩu hoặc khóa SSH là lỗi nặng vì bất kỳ ai đăng nhập máy cũng đọc được.',
        nextHint: '👉 Bấm "Đặt nhanh 600" (hoặc tự tắt các công tắc thừa trên cột đá) để khóa về 600.',
      };
    }
    const warnParts: string[] = [];
    if (!st.r2.owner.r || !st.r2.owner.w || st.r2.owner.x) warnParts.push('Chủ cần rw- (6)');
    if (groupToOctal(st.r2.group) !== 0) warnParts.push('Nhóm phải về 0');
    if (groupToOctal(st.r2.other) !== 0) warnParts.push('Người khác phải về 0');
    return {
      cmd: `chmod ${p.octal} ~/thu.txt && ls -l ~/thu.txt`,
      output: `${p.sym} 1 msfadmin msfadmin 7 Nov  9 10:12 /home/msfadmin/thu.txt`,
      whatDid: `File ~/thu.txt đang có quyền ${p.octal} (${p.sym}). Mỗi nhóm là tổng của r(4) đọc + w(2) sửa + x(1) chạy.`,
      whyMatters: 'Khi quyền Nhóm hoặc Người khác còn mở, tài khoản lạ trên cùng máy Linux có thể đọc lén hoặc sửa file bí mật của bạn.',
      nextHint: `👉 Chỉnh công tắc cho ${warnParts.join(', ')} (hoặc bấm "Đặt nhanh 600").`,
    };
  }

  if (r === 2) {
    if (st.r3.lastAction === 'none') {
      return {
        cmd: `chmod ${st.r3.mode} /tmp/thumuc`,
        output: `(Thư mục /tmp/thumuc đang ở chế độ ${st.r3.mode})`,
        whatDid: st.r3.mode === '744'
          ? 'Đặt quyền thư mục 744 (Người khác chỉ có r=4): giống căn phòng lắp cửa kính nhìn được vào trong, nhưng cửa sắt đã khóa chốt (x=0).'
          : 'Đặt quyền thư mục 711 (Người khác chỉ có x=1): giống phòng tối đen không nhìn thấy danh sách (r=0), nhưng chốt cửa mở để đi thẳng vào (x=1).',
        whyMatters: 'Người mới rất hay nhầm: trên THƯ MỤC, r là "xem tên các file", còn x mới là "được phép bước chân vào mở file bên trong".',
        nextHint: '👉 Hãy bấm thử cả hai nút "▶ nobody: ls" và "▶ nobody: cat" ở chế độ này, rồi đổi sang chế độ còn lại thử tiếp!',
      };
    }
    const res = evaluateRoom3Action(st.r3.mode, st.r3.lastAction);
    const doneAll = isRoomCleared(st, 2);
    return {
      cmd: `sudo -u nobody ${st.r3.lastAction === 'ls' ? 'ls /tmp/thumuc' : 'cat /tmp/thumuc/a.txt'}`,
      output: res.output,
      whatDid: res.reason,
      whyMatters: st.r3.mode === '744'
        ? 'Bài học từ 744: chỉ có r mà thiếu x thì người dùng nhìn thấy tên file qua ls nhưng KHÔNG bao giờ đọc được ruột file bên trong.'
        : 'Bài học từ 711: bỏ r nhưng giữ x chỉ che giấu tên file (bảo mật kiểu giấu tên). Nếu kẻ tấn công đoán đúng tên file (như config.php, a.txt), họ vẫn đọc được trọn vẹn!',
      nextHint: doneAll
        ? '✓ Đã kiểm chứng đủ cả 4 phép thử Phòng 3! Bấm "✓ Sang phòng tiếp →".'
        : '👉 Quan sát nhãn trạng thái bên phải thanh công cụ và bấm nốt các phép thử còn lại.',
    };
  }

  if (r === 3) {
    if (!st.r4.scanned) {
      return {
        cmd: 'find / -perm -4000 -type f 2>/dev/null',
        output: '(Chưa quét kệ vũ khí SUID)',
        whatDid: 'Lệnh find tìm từ gốc / tất cả file thường (-type f) có gắn bit SUID (-perm -4000) và vứt bỏ dòng báo lỗi vào thùng rác 2>/dev/null.',
        whyMatters: 'File mang bit SUID luôn chạy với quyền của chủ file (thường là root). Đây là cách phổ biến nhất để từ tài khoản thường leo thẳng lên root.',
        nextHint: '👉 Bấm ① Quét find -perm -4000 để rà và so sánh máy chuẩn Kali với mục tiêu Metasploitable 2.',
      };
    }
    if (!st.r4.useDevNull) {
      return {
        cmd: 'find / -perm -4000 -type f   # thiếu 2>/dev/null',
        output: "find: '/proc/1/fd': Permission denied\nfind: '/etc/ssl/private': Permission denied\n... (hàng trăm dòng lỗi che khuất /usr/bin/nmap!)",
        whatDid: 'Bạn vừa thử chạy lệnh find mà bỏ mất phần đuôi 2>/dev/null.',
        whyMatters: 'Tài khoản thường không có quyền chui vào các thư mục hệ thống nên find in ra hàng trăm dòng "Permission denied", làm trôi mất /usr/bin/nmap mà bạn cần tìm!',
        nextHint: '👉 Bấm "Bật lại 2>/dev/null" để lọc sạch lỗi, rồi bấm ② Soi /usr/bin/nmap.',
      };
    }
    if (st.r4.inspectedNmap) {
      return {
        cmd: 'ls -l /usr/bin/nmap',
        output: '-rwsr-xr-x 1 root root 780676 /usr/bin/nmap   # bit 4755!',
        whatDid: 'Soi quyền chi tiết của /usr/bin/nmap bằng ls -l → thấy chủ là root và chữ "s" ở nhóm Chủ (-rwsr-xr-x).',
        whyMatters: 'Bắt trúng đường leo quyền! Trên Metasploitable 2, bản nmap cũ cho phép chạy chế độ tương tác (--interactive) rồi gõ "!sh" để bật ra shell quyền root (sẽ thực hành ở bài 3.1).',
        nextHint: '✓ Xong Phòng 4! Bấm "✓ Sang phòng tiếp →" để săn mật khẩu trong mã nguồn web.',
      };
    }
    return {
      cmd: 'find / -perm -4000 -type f 2>/dev/null',
      output: '/usr/bin/passwd\n/usr/bin/sudo\n/usr/bin/su\n/usr/bin/mount\n/bin/ping\n/usr/bin/nmap   <-- BẤT THƯỜNG!',
      whatDid: 'Quét xong toàn bộ file SUID và đặt cạnh danh sách chuẩn trên Kali.',
      whyMatters: '5 file đầu là công cụ hệ thống bình thường bắt buộc phải có SUID. Riêng /usr/bin/nmap là công cụ mạng lại bị bật SUID trên mục tiêu — cực kỳ đáng ngờ!',
      nextHint: '👉 Bấm ② Soi /usr/bin/nmap (hoặc bấm trực tiếp vào thanh kiếm đỏ trên hình) để kiểm tra quyền của nó.',
    };
  }

  if (r === 4) {
    if (!st.r5.grepped) {
      return {
        cmd: 'grep -rIil "pass" /var/www 2>/dev/null',
        output: '(Chưa quét thư viện /var/www)',
        whatDid: 'Lệnh grep lục tìm chữ "pass" trong cả thư mục web /var/www (-r: đệ quy, -I: bỏ file ảnh/nhị phân, -i: bỏ phân biệt hoa thường, -l: chỉ liệt kê tên file).',
        whyMatters: 'Lập trình viên thường viết thẳng mật khẩu kết nối cơ sở dữ liệu vào file cấu hình web rồi quên luôn. Quét grep giúp tìm ra chỉ trong 1 giây thay vì mở từng file.',
        nextHint: '👉 Bấm ① Quét grep -rIil "pass" để tìm các file cấu hình bị rò rỉ.',
      };
    }
    if (!st.r5.useBinarySkip) {
      return {
        cmd: 'grep -ril "pass" /var/www 2>/dev/null   # thiếu cờ -I',
        output: 'Binary file /var/www/assets/logo.png matches\n... (lẫn file ảnh nhị phân vào kết quả!)',
        whatDid: 'Bạn vừa thử quét mà bỏ mất cờ -I (bỏ qua file nhị phân).',
        whyMatters: 'Nếu thiếu -I, grep lục cả vào ruột ảnh PNG hay file chương trình, in ra đống chữ rác "Binary file matches" khiến bạn dễ bỏ sót file cấu hình thật.',
        nextHint: '👉 Bấm "Bật lại cờ -I", rồi bấm ② Mở dvwa/config.inc.php.',
      };
    }
    if (st.r5.openedDvwa) {
      return {
        cmd: 'cat /var/www/dvwa/config/config.inc.php',
        output: "$_DVWA['db_user']     = 'root';\n$_DVWA['db_password'] = 'p@ssw0rd';",
        whatDid: 'Dùng lệnh cat mở file cấu hình vừa tìm được để đọc nội dung chữ rõ bên trong.',
        whyMatters: 'Lộ mật khẩu DB là "p@ssw0rd"! Trong thực tế, quản trị viên rất hay dùng lại mật khẩu này cho tài khoản SSH hoặc root — thử lại mật khẩu vừa nhặt là bài kiểm tra bắt buộc.',
        nextHint: '✓ Xong Phòng 5! Bấm "✓ Sang phòng tiếp →" để xem góc nhìn phòng thủ.',
      };
    }
    return {
      cmd: 'grep -rIil "pass" /var/www 2>/dev/null',
      output: '/var/www/dvwa/config/config.inc.php\n/var/www/mutillidae/config.inc\n/var/www/phpMyAdmin/config.inc.php',
      whatDid: 'grep lọc ra đúng 3 file cấu hình PHP có nhắc tới chữ "pass" và bỏ qua ảnh logo.png.',
      whyMatters: 'Biết chính xác tên file nhạy cảm nằm ở đâu giúp bạn mở thẳng vào đọc mật khẩu kết nối cơ sở dữ liệu.',
      nextHint: '👉 Bấm ② Mở dvwa/config.inc.php (hoặc bấm vào dòng cuộn giấy đang sáng trên hình) để đọc mật khẩu.',
    };
  }

  // Room 6
  const lastLogs = st.r6.logs.slice(-4).map((l) => l.text).join('\n');
  let whatDid = 'Đứng ở góc người quản trị: mọi lượt gõ cửa dịch vụ SSH (:22) từ máy Kali (10.10.14.7) đều được ghi lại vào nhật ký /var/log/auth.log.';
  let whyMatters = 'Nhiều người mới tưởng gõ lệnh trong terminal là vô hình, nhưng thực tế máy chủ lưu lại đầy đủ thời gian, tên user và IP nguồn của mọi lần thử.';
  let nextHint = '👉 Hãy bấm thử cả ① Gõ sai mật khẩu SSH và ② Đăng nhập SSH đúng để so sánh dấu vết.';

  if (act === 'r6:sshBrute') {
    whatDid = 'Giả lập kịch bản dò mật khẩu tự động (brute-force): thử sai 3 lần liên tiếp rồi trúng ở lần thứ 4 từ cùng IP 10.10.14.7.';
    whyMatters = 'Chuỗi "nhiều dòng Failed đỏ nối ngay sau bởi 1 dòng Accepted xanh" là dấu hiệu kinh điển giúp đội phòng thủ (SOC) phát hiện kẻ tấn công đã đoán trúng mật khẩu (bài 8.2/8.3).';
    nextHint = '🏆 Hoàn thành 6/6 phòng! Bạn đã nắm đủ bản đồ điểm nóng Linux từ góc công lẫn góc thủ.';
  } else if (st.r6.hasFail && st.r6.hasOk) {
    whatDid = 'Nhật ký đã ghi nhận đủ cả dấu chân thất bại (Failed password màu đỏ) và thành công (Accepted password màu xanh).';
    whyMatters = 'Nhờ các dòng thời gian + IP nguồn này, người phòng thủ biết chính xác ai đã thử mò mật khẩu và đã chui lọt vào máy vào lúc mấy giờ.';
    nextHint = '🏆 Đã mở đủ 6/6 phòng! Có thể bấm thêm ③ Giả lập dò mật khẩu để xem chữ ký brute-force.';
  } else if (st.r6.hasFail) {
    whatDid = 'Gửi thử một lần đăng nhập sai mật khẩu SSH — mắt thần sshd ghi ngay dòng đỏ "Failed password for msfadmin from 10.10.14.7".';
    whyMatters = 'Chỉ cần gõ sai 1 lần, IP máy Kali của bạn đã lộ diện trong nhật ký hệ thống.';
    nextHint: '👉 Bấm tiếp ② Đăng nhập SSH đúng để xem dấu vết khi lọt vào thành công.';
  } else if (st.r6.hasOk) {
    whatDid = 'Đăng nhập SSH đúng mật khẩu — nhật ký ghi ngay dòng xanh "Accepted password for msfadmin from 10.10.14.7".';
    whyMatters = 'Dù có mật khẩu hợp lệ, phiên đăng nhập vẫn để lại thời gian, cổng nguồn và tên tài khoản trên máy chủ.';
    nextHint: '👉 Bấm thêm ① Gõ sai mật khẩu SSH để hoàn thành đối chiếu 2 trạng thái Phòng 6.';
  }

  return {
    cmd: 'sudo grep sshd /var/log/auth.log | tail -n 5',
    output: lastLogs,
    whatDid,
    whyMatters,
    nextHint,
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
    lastAction: action,
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
