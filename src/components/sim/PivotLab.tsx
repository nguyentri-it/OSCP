import { useState } from 'react';
import SimHow from './SimHow';

type Step = 'direct' | 'route' | 'tunnel' | 'scan';

const STEPS: Array<{ id: Step; label: string; command: string; output: string; needs?: Step; note: string }> = [
  {
    id: 'direct',
    label: 'Thử quét thẳng máy nội bộ từ Kali',
    command: 'kali@lab:~$ nmap -Pn 172.16.0.10',
    output: 'Note: Host seems down.0 packets received (100% loss)',
    note: 'Gói tin không tới đích được: Kali đang ở mạng 10.10.14.0/24 và hoàn toàn không biết đường nào dẫn vào mạng nội bộ 172.16.0.0/24. Phải đi nhờ qua máy bàn đạp.',
  },
  {
    id: 'route',
    label: 'Xem bảng định tuyến trên máy bàn đạp',
    command: 'jdoe@10.10.14.30:~$ ip route',
    output: '10.10.14.0/24 dev eth0 proto kernel scope link src 10.10.14.30\n172.16.0.0/24 dev eth1 proto kernel scope link src 172.16.0.5',
    note: 'Đúng như dự đoán: máy bàn đạp 10.10.14.30 có card mạng thứ hai (eth1, địa chỉ 172.16.0.5) nối thẳng vào dải nội bộ 172.16.0.0/24.',
  },
  {
    id: 'tunnel',
    label: 'Dựng đường hầm SOCKS qua máy bàn đạp',
    command: 'kali@lab:~$ ssh -N -D 9050 jdoe@10.10.14.30',
    output: 'Dynamic forwarding listening on 127.0.0.1 port 9050',
    needs: 'route',
    note: 'Cổng 9050 trên chính máy Kali đã trở thành cửa vào đường hầm. Nhưng nhớ rằng mở đường hầm xong thì các công cụ chưa tự chui vào đó — bạn phải dùng proxychains để dẫn đường cho chúng.',
  },
  {
    id: 'scan',
    label: 'Đẩy nmap đi qua đường hầm bằng proxychains',
    command: 'kali@lab:~$ proxychains nmap -sT -Pn 172.16.0.10',
    output: '[proxychains] Strict chain  ...  127.0.0.1:9050  ...  172.16.0.10:3306  ...  OK\nPORT     STATE SERVICE\n445/tcp  open  microsoft-ds\n3306/tcp open  mysql',
    needs: 'tunnel',
    note: 'Lưu lượng của nmap đã đi xuyên qua cổng 9050 trên Kali, sang máy bàn đạp 10.10.14.30 rồi chạm tới máy chủ nội bộ 172.16.0.10 — lộ ra dịch vụ MySQL và SMB bên trong.',
  },
];

const INITIAL_LOG = 'Chọn một thao tác bên dưới để thử nghiệm. Toàn bộ là mô phỏng trong trình duyệt, không mở kết nối hay quét mạng thật.';

export default function PivotLab() {
  const [done, setDone] = useState<Step[]>([]);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [log, setLog] = useState(INITIAL_LOG);

  function run(step: (typeof STEPS)[number]) {
    if (step.needs && !done.includes(step.needs)) {
      setLog(
        step.needs === 'route'
          ? 'Khoan mở đường hầm vội: hãy kiểm tra bảng định tuyến (ip route) trên máy bàn đạp trước để biết chắc nó đang nối vào dải mạng nội bộ nào.'
          : 'Bạn chưa mở đường hầm SOCKS trên cổng 9050, nên proxychains chưa có chỗ để gửi lưu lượng qua. Hãy dựng đường hầm SSH trước.',
      );
      setActiveNote(null);
      return;
    }
    if (!done.includes(step.id)) setDone((current) => [...current, step.id]);
    setLog(`${step.command}\n${step.output}`);
    setActiveNote(step.note);
  }

  function reset() {
    setDone([]);
    setActiveNote(null);
    setLog(INITIAL_LOG);
  }

  return (
    <div className="sim pivot-lab">
      <p className="sim-title">Mô phỏng bắc cầu qua máy bàn đạp</p>
      <SimHow steps={['Sơ đồ dưới đây cho thấy máy Kali của bạn không chạm thẳng tới máy nội bộ 172.16.0.10 được, nhưng máy bàn đạp 10.10.14.30 thì chạm được.', 'Hãy thử bấm quét thẳng từ Kali để xem chuyện gì xảy ra, sau đó thực hiện lần lượt: kiểm tra mạng trên bàn đạp → dựng đường hầm SSH → quét qua proxychains.']} />
      <p className="muted small">
        Bạn đã chiếm được tài khoản <code>jdoe</code> trên máy chủ web <code>10.10.14.30</code>. Hãy biến máy này thành chiếc cầu nối để vươn tới máy chủ cơ sở dữ liệu <code>172.16.0.10</code> nằm sâu bên trong.
      </p>
      <div className="pivot-map" aria-label="Sơ đồ mạng bắc cầu">
        <div className="pivot-node active">
          <b>Máy của bạn (Kali)</b>
          <span>10.10.14.7</span>
        </div>
        <i>→</i>
        <div className="pivot-node active">
          <b>Máy bàn đạp (Web)</b>
          <span>10.10.14.30 · 172.16.0.5</span>
        </div>
        <i className={done.includes('tunnel') ? 'open' : ''}>→</i>
        <div className={`pivot-node ${done.includes('scan') ? 'owned' : ''}`}>
          <b>Máy nội bộ (DB)</b>
          <span>172.16.0.10</span>
        </div>
      </div>
      <div className="pivot-actions" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {STEPS.map((step) => (
          <button key={step.id} type="button" className={done.includes(step.id) ? 'done' : ''} onClick={() => run(step)}>
            <span>{done.includes(step.id) ? '✓' : '▸'}</span>
            <b>{step.label}</b>
            <small>{step.command}</small>
          </button>
        ))}
      </div>
      <pre className="pivot-log" aria-live="polite">{log}</pre>
      {activeNote && <p className="pivot-note">{activeNote}</p>}
      {done.length > 0 && (
        <div className="sim-controls">
          <button type="button" className="btn" onClick={reset}>
            Làm lại
          </button>
        </div>
      )}
    </div>
  );
}
