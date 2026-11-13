import { useMemo, useState } from 'react';
import SimHow from './SimHow';

type Platform = 'linux' | 'windows';

interface Lead {
  id: string;
  title: string;
  output: string;
  verdict: 'strong' | 'verify' | 'noise';
  why: string;
  next: string;
}

const LEADS: Record<Platform, Lead[]> = {
  linux: [
    {
      id: 'sudo',
      title: 'Quyền sudo của tài khoản hiện tại (sudo -l)',
      output: '(root) NOPASSWD: /usr/bin/find',
      verdict: 'strong',
      why: 'Tài khoản hiện tại được phép chạy find với quyền root mà không cần mật khẩu. Vì find có tham số -exec gọi được chương trình con, đây là con đường ngắn và chắc chắn nhất để mở thẳng shell root.',
      next: 'Tra GTFOBins mục find, chạy lệnh thoát ra shell rồi gõ id để xác nhận quyền root.',
    },
    {
      id: 'cron',
      title: 'Tác vụ định kỳ trong /etc/crontab',
      output: '* * * * * root /opt/scripts/backup.sh  (-rwxr-xr-x 1 root root)',
      verdict: 'noise',
      why: 'Đúng là script này chạy mỗi phút bằng quyền root, nhưng quyền file đang là rwxr-xr-x (755) và thuộc sở hữu của root. Tài khoản thường chỉ đọc được chứ không sửa được file để chèn lệnh.',
      next: 'Đọc lướt nội dung backup.sh xem nó có gọi tới file hay thư mục con nào mà bạn ghi được không; nếu không thì bỏ qua ngay.',
    },
    {
      id: 'cap',
      title: 'Quét capability trên hệ thống (getcap -r /)',
      output: '/usr/bin/ping = cap_net_raw+ep',
      verdict: 'noise',
      why: 'Quyền cap_net_raw chỉ dùng để tạo gói tin mạng (nhờ vậy lệnh ping hoạt động được mà không cần bit SUID root). Đây là cấu hình hoàn toàn bình thường trên Linux hiện đại, không giúp bạn đổi UID hay mở shell.',
      next: 'Bỏ qua; chỉ dừng lại khi gặp các capability nhạy cảm như cap_setuid, cap_dac_read_search gắn trên python, perl, tar...',
    },
    {
      id: 'config',
      title: 'Tìm mật khẩu trong thư mục web (grep -riI)',
      output: '/var/www/app/.env: DB_PASS="MuaThu2024#"',
      verdict: 'verify',
      why: 'Mật khẩu cơ sở dữ liệu nằm trong file cấu hình chưa chắc là mật khẩu của root, nhưng quản trị viên rất hay dùng lại một mật khẩu cho nhiều nơi. Thử xem nó có mở được tài khoản người dùng thật hay root không chỉ mất vài giây.',
      next: 'Xem danh sách tài khoản trong /etc/passwd rồi thử su sang các tài khoản đó (và cả root) bằng mật khẩu vừa tìm được.',
    },
    {
      id: 'kernel',
      title: 'Phiên bản nhân hệ điều hành (uname -a)',
      output: 'Linux lab 5.4.0-150-generic x86_64',
      verdict: 'noise',
      why: 'Thấy nhân Linux hơi cũ là nhiều người muốn tìm ngay mã khai thác nhân (kernel exploit). Nhưng chạy exploit nhân rất dễ làm treo cứng máy mục tiêu, trong khi máy này đã có sẵn đường cấu hình sudo và mật khẩu lộ an toàn hơn nhiều.',
      next: 'Chỉ ghi lại số phiên bản vào sổ tay để làm phương án cuối cùng khi mọi đường cấu hình đều bế tắc.',
    },
  ],
  windows: [
    {
      id: 'service',
      title: 'Quyền trên thư mục của dịch vụ BackupSync',
      output: 'Chạy dưới quyền: LocalSystem · C:\\Program Files\\Backup Sync\\ cho nhóm Users quyền (M)',
      verdict: 'strong',
      why: 'Dịch vụ chạy bằng quyền cao nhất (SYSTEM) nhưng thư mục chứa file thực thi lại cấp quyền sửa đổi (Modify - M) cho mọi người dùng trên máy. Bạn có thể thay file chạy của dịch vụ bằng payload của mình để lấy quyền SYSTEM.',
      next: 'Kiểm tra bằng icacls và sc qc xem tài khoản hiện tại có tự khởi động lại dịch vụ được không, hay dịch vụ tự chạy khi máy khởi động.',
    },
    {
      id: 'impersonate',
      title: 'Kiểm tra đặc quyền phiên đăng nhập (whoami /priv)',
      output: 'SeImpersonatePrivilege   Enabled',
      verdict: 'verify',
      why: 'Đặc quyền cho phép mạo danh này là bàn đạp rất mạnh trên các tài khoản dịch vụ (như IIS, SQL Server). Với các công cụ họ Potato (PrintSpoofer, GodPotato), bạn thường đổi thẳng từ đặc quyền này sang một shell SYSTEM.',
      next: 'Kiểm tra phiên bản Windows và dùng PrintSpoofer hoặc GodPotato nếu đường sửa dịch vụ ở trên gặp vướng mắc.',
    },
    {
      id: 'installer',
      title: 'Chính sách cài đặt AlwaysInstallElevated',
      output: 'HKLM = 0x1 (Bật) · HKCU = 0x0 (Tắt)',
      verdict: 'noise',
      why: 'Cơ chế cho phép người dùng thường cài gói .msi với quyền SYSTEM bắt buộc cả hai nhánh HKLM lẫn HKCU đều phải bật bằng 1. Ở đây nhánh HKCU đang bằng 0 nên Windows sẽ không cấp quyền SYSTEM khi bạn chạy msiexec.',
      next: 'Đừng tốn thời gian đóng gói file .msi; chuyển sang kiểm tra các hướng khác.',
    },
    {
      id: 'path',
      title: 'Đường dẫn dịch vụ có khoảng trắng không ngoặc kép',
      output: 'C:\\Program Files\\Acme Agent\\agent.exe · Quyền ghi vào C:\\ và C:\\Program Files\\: Từ chối',
      verdict: 'noise',
      why: 'Đường dẫn không đặt trong ngoặc kép thật, nhưng muốn lợi dụng được thì bạn phải có quyền tạo file C:\\Program.exe hoặc C:\\Program Files\\Acme.exe. Trên Windows mặc định, người dùng thường không được phép ghi vào hai thư mục này.',
      next: 'Dùng icacls kiểm tra nhanh quyền ghi ở từng nấc thư mục; thấy bị từ chối thì bỏ qua ngay, đừng thấy khoảng trắng mà mừng vội.',
    },
    {
      id: 'unattend',
      title: 'Tìm thấy file cài đặt tự động unattend.xml',
      output: 'C:\\Windows\\Panther\\unattend.xml · Lệnh type báo "Access is denied"',
      verdict: 'noise',
      why: 'File unattend.xml rất hay chứa mật khẩu quản trị lúc cài máy, nhưng tài khoản hiện tại của bạn bị từ chối quyền đọc. Chưa mở được nội dung file thì chưa có mật khẩu nào trong tay.',
      next: 'Ghi chú lại đường dẫn này; chỉ quay lại mở nếu lát nữa bạn lấy được tài khoản cao hơn hoặc đặc quyền đọc file như SeBackupPrivilege.',
    },
  ],
};

const LABEL: Record<Lead['verdict'], string> = {
  strong: 'Hướng ưu tiên số một',
  verify: 'Đáng thử ngay',
  noise: 'Ngõ cụt / chưa đủ điều kiện',
};

export default function PrivescTriage({ platform, title }: { platform: Platform; title?: string }) {
  const [opened, setOpened] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const leads = LEADS[platform];
  const selected = useMemo(() => leads.filter((lead) => opened.includes(lead.id)), [leads, opened]);
  const totalGood = useMemo(() => leads.filter((lead) => lead.verdict !== 'noise').length, [leads]);
  const correct = selected.filter((lead) => lead.verdict !== 'noise').length;
  const noisy = selected.filter((lead) => lead.verdict === 'noise').length;

  function toggle(id: string) {
    setReviewed(false);
    setOpened((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function reset() {
    setOpened([]);
    setReviewed(false);
  }

  return (
    <div className="sim privesc-triage">
      <p className="sim-title">{title ?? `Sàng lọc manh mối leo thang trên ${platform === 'linux' ? 'Linux' : 'Windows'} (dữ liệu giả)`}</p>
      <SimHow steps={['Dưới đây là 5 kết quả thu được sau bước liệt kê. Hãy bấm chọn những dòng bạn nghĩ đáng bỏ thời gian kiểm tra tiếp.', 'Chọn xong, bấm "Đối chiếu nhận định" ở cuối để xem mình có bị hút vào ngõ cụt nào không.']} />
      <p className="muted small">
        Công cụ tự động thường tô màu hàng chục dòng, nhưng người có kinh nghiệm sẽ nhìn điều kiện đi kèm (quyền ghi file, cờ cấu hình, khả năng đọc...) để gạt bỏ nhiễu trước khi bắt tay vào thử.
      </p>
      <ul className="privesc-leads">
        {leads.map((lead) => {
          const isOpen = opened.includes(lead.id);
          return (
            <li key={lead.id} className={isOpen ? 'selected' : ''}>
              <button type="button" onClick={() => toggle(lead.id)} aria-pressed={isOpen}>
                <span className="privesc-check" aria-hidden="true">
                  {isOpen ? '✓' : '○'}
                </span>
                <span>
                  <strong>{lead.title}</strong>
                  <code>{lead.output}</code>
                </span>
                <span className="privesc-pick">{isOpen ? 'Đã chọn' : 'Chọn thử'}</span>
              </button>
              {isOpen && (
                <p className="privesc-detail">
                  <b>{LABEL[lead.verdict]}:</b> {lead.why}
                  <br />
                  <span>Hướng làm tiếp: {lead.next}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="privesc-footer">
        <p aria-live="polite">
          {reviewed ? (
            <>
              Bạn đã chọn <b>{correct}/{totalGood}</b> hướng thật sự khả thi và vướng <b>{noisy}</b> ngõ cụt.{' '}
              {correct === totalGood && noisy === 0
                ? 'Rất chuẩn! Bạn đã tách được manh mối có cơ sở khỏi những dòng chỉ trông có vẻ nguy hiểm.'
                : noisy > 0
                  ? 'Hãy đọc kỹ dòng giải thích ở các mục ngõ cụt: thiếu quyền ghi hoặc thiếu một nửa điều kiện cấu hình thì chưa khai thác được.'
                  : 'Bạn vẫn còn bỏ sót một hướng khả thi — hãy kiểm tra xem còn manh mối nào thử được ngay không.'}
            </>
          ) : (
            'Hãy bấm chọn những manh mối bạn đánh giá là khả thi, rồi bấm nút đối chiếu.'
          )}
        </p>
        <div className="sim-controls" style={{ marginTop: 0 }}>
          <button type="button" className="btn primary" onClick={() => setReviewed(true)} disabled={opened.length === 0}>
            Đối chiếu nhận định
          </button>
          {opened.length > 0 && (
            <button type="button" className="btn" onClick={reset}>
              Làm lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
