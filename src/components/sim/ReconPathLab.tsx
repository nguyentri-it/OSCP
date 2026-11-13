import { useMemo, useState } from 'react';
import SimHow from './SimHow';

type ActionId = 'ports' | 'smb' | 'web' | 'content' | 'note';

const ACTIONS: Array<{ id: ActionId; label: string; command: string; need?: ActionId; output: string; takeaway: string }> = [
  {
    id: 'ports',
    label: 'Quét tìm cổng mở',
    command: 'nmap -p- --min-rate 2000 10.10.14.35',
    output: 'PORT     STATE SERVICE\n80/tcp   open  http\n445/tcp  open  microsoft-ds',
    takeaway: 'Máy mở hai cổng quen thuộc: 80 (web) và 445 (SMB). Khoan đoán lỗ hổng vội — việc đầu tiên là gõ cửa từng dịch vụ xem bên trong có gì.',
  },
  {
    id: 'smb',
    label: 'Thử vào SMB không mật khẩu',
    command: 'smbclient -L //10.10.14.35 -N',
    need: 'ports',
    output: 'session setup failed: NT_STATUS_ACCESS_DENIED',
    takeaway: 'Bị từ chối thẳng (ACCESS_DENIED) cũng là một câu trả lời rõ ràng: SMB ở đây không cho phép truy cập ẩn danh. Đừng tốn thời gian đoán mò tên share lúc này; tạm gác cổng 445 lại để dồn sức cho cổng 80.',
  },
  {
    id: 'web',
    label: 'Xem thử trang chủ web',
    command: 'curl -I http://10.10.14.35',
    need: 'ports',
    output: 'HTTP/1.1 200 OK\nServer: nginx/1.18.0\nTitle: Cổng nội bộ bộ phận Vận hành',
    takeaway: 'Trang chủ phản hồi 200 OK bình thường, chưa lộ sẵn chức năng nào đặc biệt. Bước hợp lý tiếp theo là dùng công cụ dò đường dẫn xem sau lưng trang chủ có thư mục hay file nào bị bỏ quên không.',
  },
  {
    id: 'content',
    label: 'Dò thư mục và file ẩn trên web',
    command: 'gobuster dir -u http://10.10.14.35 -w common.txt',
    need: 'web',
    output: '/admin       (Status: 302 -> /login.php)\n/backup.zip  (Status: 200, Size: 14820)\n/assets      (Status: 301)',
    takeaway: 'Lộ ra hai mục rất đáng chú ý: một file nén /backup.zip tải được ngay (Status 200) và trang quản trị /admin đang đòi đăng nhập. Đừng vội đoán mật khẩu ở /admin khi ngay cạnh đó có sẵn bản sao lưu.',
  },
  {
    id: 'note',
    label: 'Ghi sổ tay hướng đi tiếp theo',
    command: 'ghi-chu: tải /backup.zip tìm mật khẩu -> thử ở /admin và SMB',
    need: 'content',
    output: '[Sổ tay 10.10.14.35]\n- Cổng 445 (SMB): chặn ẩn danh, chờ có tài khoản sẽ quay lại thử.\n- Cổng 80 (Web): tải /backup.zip về giải nén đọc mã nguồn và cấu hình; nếu lộ thông tin đăng nhập thì đem thử ở /login.php và SMB.',
    takeaway: 'Tóm tắt vài dòng như vậy vào sổ tay giúp bạn luôn biết rõ mình sắp làm gì và vì sao. Nếu hướng /backup.zip không ra gì, nhìn lại ghi chú bạn sẽ biết ngay nhánh nào đã thử, nhánh nào còn bỏ ngỏ.',
  },
];

const INITIAL_LOG = 'Mục tiêu giả lập: 10.10.14.35. Hãy bấm bước đầu tiên để xem máy đang mở những cổng nào.';

export default function ReconPathLab() {
  const [done, setDone] = useState<ActionId[]>([]);
  const [log, setLog] = useState(INITIAL_LOG);
  const [expanded, setExpanded] = useState<ActionId | null>(null);
  const available = useMemo(() => ACTIONS.filter((action) => !action.need || done.includes(action.need)), [done]);

  function run(action: (typeof ACTIONS)[number]) {
    if (action.need && !done.includes(action.need)) {
      setLog('Bạn chưa có thông tin nền cho bước này. Hãy làm bước trước để biết dịch vụ nào đang mở đã.');
      return;
    }
    if (!done.includes(action.id)) setDone((current) => [...current, action.id]);
    setExpanded(action.id);
    setLog(`$ ${action.command}\n${action.output}`);
  }

  function reset() {
    setDone([]);
    setExpanded(null);
    setLog(INITIAL_LOG);
  }

  return (
    <div className="sim recon-path">
      <p className="sim-title">Từ cổng mở tới hướng điều tra tiếp theo (máy giả lập 10.10.14.35)</p>
      <SimHow steps={['Bấm chọn từng bước kiểm tra bên dưới. Có nhánh sẽ mở ra manh mối mới, có nhánh là ngõ cụt giúp bạn loại trừ và đỡ tốn thời gian.', 'Sau mỗi lệnh, đọc dòng "Đọc kết quả" ở dưới để thấy cách người làm nghề nối kết quả hiện tại sang bước kế tiếp.']} />
      <p className="muted small">
        Giả sử bạn vừa nhận thêm một địa chỉ IP mới trong lab là <code>10.10.14.35</code>. Hãy thử đi từng bước từ lúc chỉ có con số IP cho tới khi chốt được kế hoạch tấn công tiếp theo.
      </p>
      <div className="recon-path-state">
        <span className="found">Mục tiêu: 10.10.14.35</span>
        <span className={done.includes('ports') ? 'found' : ''}>Biết cổng mở</span>
        <span className={done.includes('smb') ? 'found' : ''}>Đã thử SMB</span>
        <span className={done.includes('web') ? 'found' : ''}>Đã xem Web</span>
        <span className={done.includes('content') ? 'found' : ''}>Thấy file ẩn</span>
        <span className={done.includes('note') ? 'found' : ''}>Đã ghi sổ tay</span>
      </div>
      <div className="recon-actions">
        {ACTIONS.map((action) => {
          const isAvailable = available.includes(action);
          const isDone = done.includes(action.id);
          return (
            <button key={action.id} type="button" disabled={!isAvailable} className={isDone ? 'done' : ''} onClick={() => run(action)}>
              <b>{action.label}</b>
              <code>{action.command}</code>
              <small>{isDone ? 'Đã kiểm tra ✓' : isAvailable ? 'Có thể thử' : 'Cần bước trước'}</small>
            </button>
          );
        })}
      </div>
      <pre className="recon-log" aria-live="polite">{log}</pre>
      {expanded && (
        <p className="recon-takeaway">
          <b>Đọc kết quả:</b> {ACTIONS.find((action) => action.id === expanded)?.takeaway}
        </p>
      )}
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
