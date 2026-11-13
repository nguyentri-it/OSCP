import { useState } from 'react';
import SimHow from './SimHow';

// Bản đồ phát hiện: mỗi kỹ thuật tấn công ở Cấp 2–3 để lại dấu vết gì, dấu vết đó
// nằm ở nguồn log nào, và tín hiệu cụ thể để viết luật. Người học bật/tắt các nguồn
// log mình đang có để thấy kỹ thuật nào "thấy rõ", "thấy một phần" hay "mù".
// Dữ liệu là kiến thức tổng hợp để học, không phải cấu hình của một hệ thống thật.

type Src =
  | 'win'
  | 'winadv'
  | 'sysmon'
  | 'ps'
  | 'authlog'
  | 'auditd'
  | 'fim'
  | 'web'
  | 'waf'
  | 'dns'
  | 'net'
  | 'cloud';

type Group = 'web' | 'mang' | 'linux' | 'windows' | 'ad';

interface Source {
  id: Src;
  label: string;
  hint: string;
}

interface Tech {
  name: string;
  group: Group;
  lesson: string;
  attack: string;
  trace: string;
  signal: string;
  strong: Src[];
  weak: Src[];
  note: string;
}

const SOURCES: Source[] = [
  { id: 'win', label: 'Log Windows mặc định', hint: 'Security (đăng nhập, Kerberos trên DC), System (dịch vụ mới 7045), Defender, Application' },
  { id: 'winadv', label: 'Advanced Audit Policy Windows', hint: '4688 kèm dòng lệnh, 4662 truy cập đối tượng AD (cần SACL), 5145 chia sẻ file, 4697/4698' },
  { id: 'sysmon', label: 'Sysmon', hint: '1 tiến trình, 3 kết nối mạng, 10 truy cập tiến trình, 11 tạo file, 22 truy vấn DNS' },
  { id: 'ps', label: 'Log PowerShell', hint: 'Script Block Logging, sự kiện 4104' },
  { id: 'authlog', label: 'auth.log / journal Linux', hint: 'sshd, sudo, su — có sẵn mặc định' },
  { id: 'auditd', label: 'auditd', hint: 'execve, theo dõi file nhạy cảm theo luật bạn viết' },
  { id: 'fim', label: 'Giám sát toàn vẹn file', hint: 'Wazuh syscheck, AIDE: file mới hoặc bị sửa ở thư mục web, cron, .ssh' },
  { id: 'web', label: 'Log truy cập web', hint: 'access.log của Apache, Nginx, IIS — có sẵn, nhưng không ghi thân POST' },
  { id: 'waf', label: 'WAF', hint: 'ModSecurity + OWASP CRS hoặc WAF đám mây; thấy cả thân request' },
  { id: 'dns', label: 'Log truy vấn DNS', hint: 'Máy chủ DNS nội bộ ghi lại mọi truy vấn' },
  { id: 'net', label: 'IDS / NetFlow / tường lửa', hint: 'Suricata, Zeek, log từ chối của tường lửa' },
  { id: 'cloud', label: 'CloudTrail + GuardDuty', hint: 'Log mọi lệnh gọi API AWS và phát hiện có sẵn' },
];

const DEFAULT_ON: Src[] = ['win', 'authlog', 'web'];

const GROUPS: { id: Group | 'all'; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'web', label: 'Web và đám mây' },
  { id: 'mang', label: 'Mạng' },
  { id: 'linux', label: 'Linux' },
  { id: 'windows', label: 'Windows' },
  { id: 'ad', label: 'Active Directory' },
];

const TECHS: Tech[] = [
  // Web và đám mây
  { name: 'Dò thư mục web (gobuster, ffuf)', group: 'web', lesson: '2.2', attack: 'T1595.003', trace: 'Hàng trăm tới hàng nghìn request trong vài phút từ một IP, phần lớn trả 404, kèm User-Agent của công cụ nếu không bị đổi.', signal: 'access.log: đếm số 404 theo IP trong 5 phút; User-Agent chứa gobuster hoặc "Fuzz Faster U Fool".', strong: ['web', 'waf'], weak: ['net'], note: 'Luật đếm 404 theo IP bền hơn luật bám User-Agent, vì User-Agent đổi được bằng một tham số.' },
  { name: 'SQL injection (thủ công, sqlmap)', group: 'web', lesson: '2.3', attack: 'T1190', trace: 'Tham số chứa dấu nháy, UNION SELECT, SLEEP(, chú thích SQL; lỗi 500 tăng vọt; với SQLi mù dựa thời gian, thời gian phản hồi dài bất thường.', signal: 'WAF: nhóm luật SQLi của OWASP CRS; access.log: chuỗi truy vấn chứa union select, sleep(, information_schema; log CSDL: lỗi cú pháp tăng vọt.', strong: ['waf'], weak: ['web'], note: 'Log truy cập không ghi thân request POST, nên SQLi qua form đăng nhập gần như vô hình nếu chỉ có access.log. Phòng gốc vẫn là truy vấn tham số hoá (bài 2.3).' },
  { name: 'Đi ngược thư mục và LFI', group: 'web', lesson: '2.8', attack: 'T1190', trace: '../ hoặc dạng mã hoá %2e%2e%2f, đường dẫn /etc/passwd, win.ini, php://filter trong tham số; phản hồi 200 có kích thước bất thường.', signal: 'access.log và WAF: chuỗi truy vấn chứa ../, %2e%2e, /etc/passwd, php://.', strong: ['web', 'waf'], weak: [], note: 'Tham số đi qua GET thì log truy cập thấy rõ; đi qua POST thì cần WAF.' },
  { name: 'Tải web shell lên rồi gọi nó', group: 'web', lesson: '2.8', attack: 'T1505.003', trace: 'File .php hoặc .aspx mới trong thư mục upload; request tới file đó kèm tham số lạ; tiến trình web (www-data, w3wp.exe) sinh ra sh, bash, cmd.exe.', signal: 'FIM: file thực thi được mới trong thư mục web; Sysmon 1 hoặc auditd execve: cha là apache2, nginx, php-fpm, w3wp.exe, con là một shell.', strong: ['fim', 'sysmon', 'auditd'], weak: ['web'], note: '"Tiến trình web sinh ra shell" là một trong những luật đáng tin nhất: hầu như không có lý do hợp lệ.' },
  { name: 'SSRF lấy khoá tạm từ dịch vụ metadata', group: 'web', lesson: '2.9', attack: 'T1552.005', trace: 'Máy chủ ứng dụng gọi tới 169.254.169.254; khoá tạm của vai trò EC2 sau đó được dùng từ một IP ngoài AWS.', signal: 'GuardDuty: phát hiện loại InstanceCredentialExfiltration; CloudTrail: lệnh gọi API bằng khoá của vai trò EC2 với sourceIPAddress lạ.', strong: ['cloud'], weak: ['web', 'net'], note: 'Bắt buộc IMDSv2 chặn phần lớn kiểu SSRF này ngay từ gốc (bài 2.9).' },

  // Mạng
  { name: 'Quét cổng (nmap)', group: 'mang', lesson: '2.2', attack: 'T1046', trace: 'Một nguồn gửi SYN tới nhiều cổng hoặc nhiều máy trong thời gian ngắn, nhận về hàng loạt RST.', signal: 'IDS (Suricata, Zeek): cảnh báo quét; tường lửa: nhiều gói bị từ chối từ một nguồn tới nhiều cổng.', strong: ['net'], weak: [], note: 'Máy chủ thường không ghi lại kết nối bị từ chối. Không có cảm biến mạng thì quét cổng gần như vô hình.' },
  { name: 'Giả trả lời LLMNR/NBT-NS để bắt Net-NTLMv2', group: 'mang', lesson: '2.6', attack: 'T1557.001', trace: 'Một máy trạm bình thường lại đi trả lời các truy vấn phân giải tên quảng bá (UDP 5355, 137).', signal: 'IDS/Zeek: phản hồi LLMNR, NBT-NS từ máy không phải máy chủ tên. Mồi: cố ý hỏi một tên không tồn tại và xem ai trả lời.', strong: ['net'], weak: [], note: 'Tốt nhất là tắt LLMNR và NBT-NS bằng Group Policy: cả lớp tấn công biến mất.' },
  { name: 'NTLM relay', group: 'mang', lesson: '2.6', attack: 'T1557.001', trace: 'Đăng nhập NTLM vào một máy, nhưng IP nguồn không khớp với tên máy được khai trong sự kiện.', signal: '4624 kiểu 3, gói xác thực NTLM, trường IpAddress khác IP thật của WorkstationName.', strong: [], weak: ['win', 'net'], note: 'Phát hiện khó và nhiều báo động giả. Phòng gốc: bắt buộc SMB signing, bật ký và EPA cho LDAP, giảm dần NTLM.' },
  { name: 'Reverse shell và kéo file về (certutil, wget, PowerShell)', group: 'mang', lesson: '2.7', attack: 'T1105', trace: 'certutil.exe tải URL, PowerShell gọi Invoke-WebRequest, wget hoặc curl chạy dưới tài khoản web; máy chủ mở kết nối ra ngoài tới cổng lạ.', signal: '4688 hoặc Sysmon 1: certutil kèm -urlcache; Sysmon 3: tiến trình lạ kết nối ra; auditd execve của wget, curl, nc dưới www-data.', strong: ['sysmon', 'winadv', 'auditd'], weak: ['net'], note: 'Máy chủ không cần ra Internet thì chặn kết nối ra mặc định: reverse shell không gọi về được.' },
  { name: 'Tunnel và pivot (SSH, chisel, ligolo-ng)', group: 'mang', lesson: '3.3', attack: 'T1572', trace: 'Kết nối SSH hoặc HTTP/TLS sống rất lâu, lưu lượng lớn; máy trong DMZ bỗng nói chuyện với nhiều máy nội bộ; file nhị phân lạ trong /tmp.', signal: 'NetFlow/Zeek: phiên dài bất thường, một máy nối tới nhiều đích nội bộ; Sysmon 3 hoặc auditd: tiến trình lạ mở cổng nghe.', strong: ['net'], weak: ['authlog', 'sysmon', 'auditd'], note: 'Phân đoạn mạng và chặn luồng không cần thiết giữa các vùng làm pivot khó hơn nhiều so với cố bắt nó.' },
  { name: 'DNS tunneling', group: 'mang', lesson: '3.9', attack: 'T1071.004', trace: 'Rất nhiều truy vấn tới cùng một miền, nhãn con dài và trông ngẫu nhiên, nhiều truy vấn TXT.', signal: 'Log DNS: số truy vấn và độ dài nhãn theo miền cấp hai; độ ngẫu nhiên (entropy) của tên miền con.', strong: ['dns'], weak: ['net'], note: 'Máy trạm chỉ được dùng DNS nội bộ; chặn DNS ra thẳng Internet để mọi truy vấn đều đi qua chỗ có log.' },

  // Linux
  { name: 'Dò mật khẩu SSH (hydra)', group: 'linux', lesson: '2.6', attack: 'T1110.001', trace: 'Hàng loạt dòng "Failed password" từ một IP; nguy hiểm nhất là một dòng "Accepted" ngay sau đó.', signal: 'auth.log hoặc journal: đếm Failed password theo IP; cảnh báo mức cao khi Accepted đi sau chuỗi thất bại.', strong: ['authlog'], weak: ['net'], note: 'Tắt đăng nhập SSH bằng mật khẩu, chỉ dùng khoá: hydra hết việc để làm. fail2ban chặn tạm IP đang dò.' },
  { name: 'Lạm dụng sudo và SUID (GTFOBins)', group: 'linux', lesson: '3.1', attack: 'T1548', trace: 'sudo chạy vim, less, find, awk... rồi một shell root mọc ra từ bên trong; chương trình SUID bị người dùng thường gọi với tham số lạ.', signal: 'auth.log: dòng COMMAND= của sudo; auditd execve có euid=0 nhưng auid là người dùng thường; cha là trình soạn thảo, con là sh/bash chạy root.', strong: ['auditd'], weak: ['authlog'], note: 'auth.log có sẵn dòng sudo, nhưng shell bật ra từ bên trong vim thì chỉ auditd (hoặc EDR) mới thấy.' },
  { name: 'Sửa cron, thêm khoá SSH để duy trì', group: 'linux', lesson: '3.1', attack: 'T1053.003', trace: 'File trong /etc/cron*, script được cron gọi, hoặc authorized_keys bị sửa.', signal: 'FIM, hoặc auditd: -w /etc/cron.d -p wa và -w /root/.ssh/authorized_keys -p wa.', strong: ['fim', 'auditd'], weak: [], note: 'Script do cron chạy bằng root mà người khác ghi được là lỗi cấu hình; rà bằng find với -perm -o+w.' },
  { name: 'Chạy công cụ từ /tmp (linPEAS, exploit nhân)', group: 'linux', lesson: '3.1', attack: 'T1068', trace: 'File thực thi mới trong /tmp, /dev/shm; gcc chạy trên máy chủ sản xuất; hàng loạt lệnh find quét toàn hệ thống.', signal: 'auditd: -w /tmp -p x; execve của gcc dưới tài khoản dịch vụ; FIM: file SUID mới xuất hiện.', strong: ['auditd'], weak: ['fim'], note: 'Gắn noexec cho /tmp và /dev/shm, gỡ trình biên dịch khỏi máy chủ sản xuất, vá nhân định kỳ.' },

  // Windows
  { name: 'Leo thang qua dịch vụ và SeImpersonate (Potato)', group: 'windows', lesson: '3.2', attack: 'T1543.003', trace: 'Dịch vụ mới hoặc đường dẫn dịch vụ bị đổi; tài khoản dịch vụ (IIS, MSSQL) sinh ra cmd hoặc PowerShell chạy bằng SYSTEM.', signal: '7045 (System) hoặc 4697: dịch vụ mới; Sysmon 1 hoặc 4688: cha là w3wp.exe, sqlservr.exe, con là cmd.exe, powershell.exe.', strong: ['sysmon', 'winadv'], weak: ['win'], note: 'Log mặc định thấy dịch vụ mới (7045), nhưng chuỗi cha-con của Potato thì cần 4688 kèm dòng lệnh hoặc Sysmon.' },
  { name: 'Lấy thông tin đăng nhập từ LSASS', group: 'windows', lesson: '3.5', attack: 'T1003.001', trace: 'Một tiến trình không phải thành phần hệ thống mở bộ nhớ lsass.exe; rundll32 gọi comsvcs.dll; file .dmp lớn xuất hiện.', signal: 'Sysmon 10: TargetImage là lsass.exe với quyền đọc bộ nhớ; 4688: dòng lệnh rundll32 chứa comsvcs; Sysmon 11: file .dmp mới.', strong: ['sysmon'], weak: ['winadv'], note: 'Bật Credential Guard, chế độ LSA Protection (RunAsPPL) và luật ASR chặn đánh cắp thông tin từ LSASS.' },
  { name: 'PowerShell làm rối, vượt AMSI, tắt Defender', group: 'windows', lesson: '3.8', attack: 'T1562.001', trace: 'Script block chứa chuỗi vượt AMSI hoặc base64 dày đặc; Defender bị tắt bảo vệ thời gian thực.', signal: '4104: nội dung script ở dạng thực sự được chạy; Defender Operational 5001 (tắt bảo vệ thời gian thực), 1116 (phát hiện mã độc).', strong: ['ps'], weak: ['win', 'sysmon'], note: '4104 ghi từng khối script khi nó được chạy, nên các lớp làm rối bên ngoài lần lượt bị lộ ra.' },

  // Active Directory
  { name: 'Liệt kê AD hàng loạt (SharpHound)', group: 'ad', lesson: '3.4', attack: 'T1087.002', trace: 'Một máy trạm truy vấn LDAP khối lượng lớn, mở SMB tới hàng trăm máy để hỏi ai đang đăng nhập.', signal: '5145 tới ống srvsvc, samr trên nhiều máy; 4662 khi đối tượng AD mồi có SACL bị đọc (bài 8.4); NetFlow: một máy nối cổng 445 tới rất nhiều máy.', strong: [], weak: ['winadv', 'net'], note: 'Rất khó tách khỏi truy vấn hợp lệ. Đối tượng mồi (bài 8.4) là cách bắt đáng tin nhất.' },
  { name: 'Password spraying trong domain', group: 'ad', lesson: '3.5', attack: 'T1110.003', trace: 'Một nguồn đăng nhập thất bại trên rất nhiều tài khoản, mỗi tài khoản chỉ một hai lần.', signal: '4625 (máy chủ) và 4771 mã 0x18 (DC): đếm số tài khoản khác nhau theo IP nguồn trong 15 phút.', strong: ['win'], weak: [], note: 'Password spraying cố ý né ngưỡng khoá tài khoản, nên luật phải đếm theo nguồn, không theo từng tài khoản.' },
  { name: 'Kerberoasting và AS-REP roasting', group: 'ad', lesson: '3.5', attack: 'T1558.003', trace: 'Một tài khoản xin vé dịch vụ RC4 cho nhiều SPN; yêu cầu TGT cho tài khoản không cần pre-authentication.', signal: '4769 với TicketEncryptionType 0x17 (luật ở bài 8.1); 4768 với PreAuthType 0; tài khoản SPN mồi (bài 8.4).', strong: ['win'], weak: [], note: 'gMSA và chỉ dùng AES làm Kerberoasting vô dụng; bật lại pre-authentication cho mọi tài khoản.' },
  { name: 'Pass-the-Hash và overpass-the-hash', group: 'ad', lesson: '3.9', attack: 'T1550.002', trace: 'Đăng nhập NTLM kiểu mạng bằng tài khoản quản trị tới nhiều máy; trên máy nguồn, phiên đăng nhập kiểu 9 qua tiến trình seclogo.', signal: '4624 kiểu 3, gói NTLM, tài khoản quản trị; 4624 kiểu 9 với LogonProcessName seclogo trên máy nguồn.', strong: [], weak: ['win', 'sysmon'], note: 'Trông giống đăng nhập hợp lệ. Phòng là chính: phân tầng quản trị, LAPS cho mật khẩu quản trị cục bộ, Credential Guard.' },
  { name: 'Di chuyển ngang (PsExec, WMI, WinRM, DCOM)', group: 'ad', lesson: '3.9', attack: 'T1021', trace: 'Dịch vụ tên ngẫu nhiên được tạo từ xa; WmiPrvSE.exe, wsmprovhost.exe hoặc mmc.exe sinh ra cmd, PowerShell; file được ghi vào ADMIN$.', signal: '7045 kèm 5145 ghi vào ADMIN$; 4688 hoặc Sysmon 1: cha là WmiPrvSE.exe (WMI), wsmprovhost.exe (WinRM), mmc.exe (DCOM); 4624 kiểu 3 tới nhiều máy.', strong: ['winadv', 'sysmon'], weak: ['win'], note: 'Chặn 445 và 5985 giữa các máy trạm: máy trạm không cần quản trị lẫn nhau.' },
  { name: 'DCSync và sao chép ntds.dit', group: 'ad', lesson: '3.5', attack: 'T1003.006', trace: 'Yêu cầu sao chép thư mục từ máy không phải DC; trên DC: tạo shadow copy, ntdsutil xuất cơ sở dữ liệu, file ntds.dit bị chép.', signal: '4662 kèm GUID quyền sao chép từ tài khoản không phải DC (bài 8.1); 4688 hoặc Sysmon 1: vssadmin, ntdsutil chạy trên DC; Application log nguồn ESENT.', strong: ['winadv', 'sysmon'], weak: ['win', 'net'], note: 'Chỉ DC mới được giữ quyền sao chép thư mục; rà định kỳ xem ai đang có quyền đó.' },
  { name: 'Golden ticket và silver ticket', group: 'ad', lesson: '3.9', attack: 'T1558.001', trace: 'Vé Kerberos tự làm giả: golden ticket không đi kèm sự kiện cấp TGT (4768) trên DC; silver ticket thì DC không thấy gì cả.', signal: '4769 mà trước đó không có 4768 cho cùng tài khoản; loại mã hoá hoặc thời hạn vé bất thường; trên máy đích, đăng nhập Kerberos không khớp vé nào DC đã cấp.', strong: [], weak: ['win'], note: 'Gần như mù với log thông thường. Phòng: bảo vệ DC để không mất krbtgt, đổi krbtgt hai lần khi dọn, chỉ dùng AES, dùng công cụ chuyên cho AD.' },
];

type Status = 'ro' | 'motphan' | 'mu';

const STATUS_LABEL: Record<Status, string> = { ro: 'Thấy rõ', motphan: 'Thấy một phần', mu: 'Mù' };

const SRC_LABEL: Record<Src, string> = Object.fromEntries(SOURCES.map((s) => [s.id, s.label])) as Record<Src, string>;

export default function DetectionMap() {
  const [on, setOn] = useState<Set<Src>>(() => new Set(DEFAULT_ON));
  const [group, setGroup] = useState<Group | 'all'>('all');
  const [open, setOpen] = useState<number | null>(null);

  function status(t: Tech): Status {
    if (t.strong.some((s) => on.has(s))) return 'ro';
    if (t.weak.some((s) => on.has(s))) return 'motphan';
    return 'mu';
  }

  function toggle(id: Src) {
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const counts: Record<Status, number> = { ro: 0, motphan: 0, mu: 0 };
  for (const t of TECHS) counts[status(t)]++;
  const total = TECHS.length;
  const shown = TECHS.map((t, i) => ({ t, i })).filter(({ t }) => group === 'all' || t.group === group);

  return (
    <div className="sim dmap">
      <p className="sim-title">Bản đồ phát hiện cho {total} kỹ thuật ở Cấp 2–3</p>
      <SimHow steps={["Bước 1: bấm các nút \"Nguồn log\" để bật những loại log hệ thống của bạn thật sự đang thu thập. Có ba nút tắt nhanh ở dưới.", "Bước 2: nhìn thanh màu xem bao nhiêu kỹ thuật tấn công bạn \"thấy rõ\", \"thấy một phần\" hay \"mù\". Bấm vào một kỹ thuật để xem nó để lại dấu vết gì và cần log nào để phát hiện."]} />
      <p className="muted small">
        Log là nhật ký ghi lại những gì xảy ra trên máy. Muốn phát hiện một kiểu tấn công thì phải có đúng loại log ghi lại dấu vết của nó. Bản đồ này cho bạn thấy: với những log bạn đang thu, bạn nhìn thấy được bao nhiêu kỹ thuật tấn công đã học ở Cấp 2–3, và còn "mù" ở đâu.
      </p>

      <fieldset className="dmap-sources">
        <legend>Nguồn log đang có</legend>
        <div className="dmap-chips">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="dmap-chip"
              aria-pressed={on.has(s.id)}
              onClick={() => toggle(s.id)}
              title={s.hint}
            >
              <span className="dmap-chip-label">{s.label}</span>
              <span className="dmap-chip-hint">{s.hint}</span>
            </button>
          ))}
        </div>
        <div className="sim-controls">
          <button type="button" className="btn" onClick={() => setOn(new Set(DEFAULT_ON))}>
            Chỉ log mặc định
          </button>
          <button type="button" className="btn" onClick={() => setOn(new Set(SOURCES.map((s) => s.id)))}>
            Bật tất cả
          </button>
          <button type="button" className="btn" onClick={() => setOn(new Set())}>
            Tắt tất cả
          </button>
        </div>
      </fieldset>

      <div className="dmap-summary" aria-live="polite">
        <div className="dmap-bar" aria-hidden="true">
          <span className="ro" style={{ width: `${(counts.ro / total) * 100}%` }} />
          <span className="motphan" style={{ width: `${(counts.motphan / total) * 100}%` }} />
          <span className="mu" style={{ width: `${(counts.mu / total) * 100}%` }} />
        </div>
        <p className="small">
          <strong className="good-text">{counts.ro} thấy rõ</strong> · <strong className="warn-text">{counts.motphan} thấy một phần</strong> ·{' '}
          <strong className="bad-text">{counts.mu} mù</strong> trên {total} kỹ thuật
        </p>
      </div>

      <div className="tabs" role="group" aria-label="Lọc theo nhóm">
        {GROUPS.map((g) => (
          <button key={g.id} type="button" className="btn" aria-pressed={group === g.id} onClick={() => setGroup(g.id)}>
            {g.label}
          </button>
        ))}
      </div>

      <ul className="dmap-list">
        {shown.map(({ t, i }) => {
          const st = status(t);
          return (
            <li key={i} className={`dmap-row ${st}`}>
              <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span className="dmap-tag">{STATUS_LABEL[st]}</span>
                <span className="dmap-name">{t.name}</span>
                <span className="dmap-meta">
                  Bài {t.lesson} · {t.attack}
                </span>
              </button>
              {open === i && (
                <div className="dmap-detail">
                  <p>
                    <strong>Dấu vết để lại.</strong> {t.trace}
                  </p>
                  <p>
                    <strong>Tín hiệu để viết luật.</strong> {t.signal}
                  </p>
                  <p className="dmap-need">
                    <strong>Nguồn đủ mạnh:</strong>{' '}
                    {t.strong.length ? (
                      t.strong.map((s) => (
                        <span key={s} className={`dmap-src ${on.has(s) ? 'on' : 'off'}`}>
                          {SRC_LABEL[s]}
                        </span>
                      ))
                    ) : (
                      <span className="muted">không có nguồn log nào đủ chắc chắn</span>
                    )}
                  </p>
                  {t.weak.length > 0 && (
                    <p className="dmap-need">
                      <strong>Chỉ thấy một phần qua:</strong>{' '}
                      {t.weak.map((s) => (
                        <span key={s} className={`dmap-src ${on.has(s) ? 'on' : 'off'}`}>
                          {SRC_LABEL[s]}
                        </span>
                      ))}
                    </p>
                  )}
                  <p className="dmap-note">{t.note}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="sim-note">
        {counts.mu > 0
          ? `Còn ${counts.mu} kỹ thuật mù: chúng xảy ra mà không để lại dòng log nào bạn đang thu. Thử bật Sysmon, auditd và Advanced Audit Policy Windows để thấy số này giảm nhanh thế nào.`
          : counts.motphan > 0
            ? `Không còn kỹ thuật nào mù, nhưng ${counts.motphan} kỹ thuật vẫn chỉ thấy một phần, kể cả khi bật hết log. Với chúng, phòng ngừa (phân tầng, SMB signing, AES) và mồi nhử (bài 8.4) đáng tin hơn cố bắt.`
            : 'Mọi kỹ thuật đều có nguồn log đủ mạnh. Có log mới chỉ là điều kiện cần: vẫn phải viết luật, thử luật, và có người đọc cảnh báo.'}
      </div>
    </div>
  );
}
