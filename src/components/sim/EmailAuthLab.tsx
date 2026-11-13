import { useState } from 'react';
import SimHow from './SimHow';

// Mô phỏng máy chủ thư bên nhận kiểm tra SPF, DKIM, DMARC cho thư mang tên miền
// của một ngân hàng hư cấu. Mục đích: thấy "khớp tên miền" (alignment) là gì, vì sao
// SPF hay DKIM một mình chưa bảo vệ địa chỉ người gửi hiển thị, và vì sao DMARC
// không giúp được gì trước tên miền nhái. Mọi tên miền, IP đều là giả (dải tài liệu).

type Policy = 'none' | 'quarantine' | 'reject';
type Res = 'pass' | 'fail' | 'none';

interface Mail {
  name: string;
  story: string;
  from: string; // tên miền ở địa chỉ hiển thị (header From)
  mailFrom: string; // tên miền ở địa chỉ envelope (MAIL FROM / Return-Path)
  ip: string;
  spf: Res; // kết quả SPF cho tên miền envelope
  spfWhy: string;
  dkim: Res;
  dkimD?: string; // tên miền ký DKIM (d=)
  dkimWhy: string;
  legit: boolean;
}

const BANK = 'saomai.example';

const MAILS: Mail[] = [
  {
    name: 'Sao kê gửi từ máy chủ thư của ngân hàng',
    story: 'Thư thật, gửi từ máy chủ thư chính của ngân hàng.',
    from: BANK,
    mailFrom: BANK,
    ip: '203.0.113.10',
    spf: 'pass',
    spfWhy: 'IP 203.0.113.10 có trong bản ghi SPF của saomai.example.',
    dkim: 'pass',
    dkimD: BANK,
    dkimWhy: 'Chữ ký hợp lệ với khoá công khai đăng ở s1._domainkey.saomai.example.',
    legit: true,
  },
  {
    name: 'Bản tin gửi qua dịch vụ gửi thư hàng loạt',
    story: 'Thư thật. Ngân hàng thuê một dịch vụ gửi thư, đã khai báo dịch vụ trong SPF và cho dịch vụ ký DKIM bằng tên miền ngân hàng.',
    from: BANK,
    mailFrom: `bounce.${BANK}`,
    ip: '192.0.2.45',
    spf: 'pass',
    spfWhy: 'IP của dịch vụ nằm trong phần include:_spf.dichvuthu.example của bản ghi SPF.',
    dkim: 'pass',
    dkimD: BANK,
    dkimWhy: 'Dịch vụ ký bằng khoá mà ngân hàng đã uỷ quyền, d=saomai.example.',
    legit: true,
  },
  {
    name: 'Giả mạo thô: tự khai tên miền ngân hàng',
    story: 'Kẻ gian gửi từ máy chủ của chúng, ghi thẳng saomai.example ở cả địa chỉ envelope lẫn địa chỉ hiển thị.',
    from: BANK,
    mailFrom: BANK,
    ip: '198.51.100.66',
    spf: 'fail',
    spfWhy: 'IP 198.51.100.66 không có trong bản ghi SPF của saomai.example.',
    dkim: 'none',
    dkimWhy: 'Thư không có chữ ký DKIM (kẻ gian không có khoá riêng của ngân hàng).',
    legit: false,
  },
  {
    name: 'Giả mạo khéo: envelope là tên miền của kẻ gian',
    story: 'Địa chỉ hiển thị vẫn là saomai.example, nhưng địa chỉ envelope và chữ ký DKIM dùng tên miền riêng của kẻ gian, được cấu hình SPF và DKIM đầy đủ.',
    from: BANK,
    mailFrom: 'gui-thu.example',
    ip: '198.51.100.70',
    spf: 'pass',
    spfWhy: 'IP có trong SPF của gui-thu.example, tên miền của kẻ gian. SPF "pass", nhưng là pass cho tên miền khác.',
    dkim: 'pass',
    dkimD: 'gui-thu.example',
    dkimWhy: 'Chữ ký hợp lệ, nhưng do gui-thu.example ký, không phải ngân hàng.',
    legit: false,
  },
  {
    name: 'Thư thật bị chuyển tiếp qua một hộp thư khác',
    story: 'Khách hàng cài tự động chuyển tiếp thư sang hộp thư cá nhân. Máy chủ chuyển tiếp gửi lại thư từ IP của nó, không sửa nội dung.',
    from: BANK,
    mailFrom: BANK,
    ip: '192.0.2.200',
    spf: 'fail',
    spfWhy: 'IP của máy chủ chuyển tiếp không có trong SPF của ngân hàng. Chuyển tiếp làm SPF trượt.',
    dkim: 'pass',
    dkimD: BANK,
    dkimWhy: 'Nội dung không bị sửa nên chữ ký DKIM vẫn hợp lệ sau khi chuyển tiếp.',
    legit: true,
  },
  {
    name: 'Phòng marketing tự đăng ký một dịch vụ gửi thư mới',
    story: 'Thư thật, nhưng dịch vụ mới chưa được khai báo trong SPF và chưa được cấu hình ký DKIM bằng tên miền ngân hàng.',
    from: BANK,
    mailFrom: 'mail.dichvumoi.example',
    ip: '203.0.113.200',
    spf: 'pass',
    spfWhy: 'Pass cho tên miền của dịch vụ (dichvumoi.example), không phải của ngân hàng.',
    dkim: 'pass',
    dkimD: 'dichvumoi.example',
    dkimWhy: 'Dịch vụ ký bằng tên miền của chính nó.',
    legit: true,
  },
  {
    name: 'Tên miền nhái: saomai-xacthuc.example',
    story: 'Kẻ gian đăng ký một tên miền na ná, cấu hình SPF, DKIM và DMARC đầy đủ cho chính tên miền đó.',
    from: 'saomai-xacthuc.example',
    mailFrom: 'saomai-xacthuc.example',
    ip: '198.51.100.90',
    spf: 'pass',
    spfWhy: 'IP có trong SPF của saomai-xacthuc.example.',
    dkim: 'pass',
    dkimD: 'saomai-xacthuc.example',
    dkimWhy: 'Chữ ký hợp lệ của saomai-xacthuc.example.',
    legit: false,
  },
];

// Khớp kiểu "relaxed": cùng tên miền tổ chức (ở đây lấy hai nhãn cuối).
function orgDomain(d: string) {
  return d.split('.').slice(-2).join('.');
}
function aligned(a: string | undefined, b: string) {
  return !!a && orgDomain(a) === orgDomain(b);
}

const POLICY_LABEL: Record<Policy, string> = {
  none: 'p=none (chỉ quan sát)',
  quarantine: 'p=quarantine (cho vào thư rác)',
  reject: 'p=reject (từ chối)',
};

function Badge({ r }: { r: Res | 'aligned' | 'notaligned' }) {
  const text = { pass: 'pass', fail: 'fail', none: 'none', aligned: 'khớp', notaligned: 'không khớp' }[r];
  const tone = r === 'pass' || r === 'aligned' ? 'good' : r === 'none' ? 'muted' : 'bad';
  return <span className={`eauth-badge ${tone}`}>{text}</span>;
}

export default function EmailAuthLab() {
  const [idx, setIdx] = useState(0);
  const [policy, setPolicy] = useState<Policy>('none');
  const m = MAILS[idx];
  const isBankDomain = orgDomain(m.from) === BANK;

  const spfAligned = aligned(m.mailFrom, m.from);
  const dkimAligned = aligned(m.dkimD, m.from);
  const dmarcPass = (m.spf === 'pass' && spfAligned) || (m.dkim === 'pass' && dkimAligned);
  // Tên miền nhái dùng chính sách DMARC của kẻ gian (p=reject), không phải của ngân hàng.
  const effPolicy: Policy = isBankDomain ? policy : 'reject';

  let action: string;
  if (dmarcPass) action = 'Giao vào hộp thư đến.';
  else if (effPolicy === 'none') action = 'Vẫn giao vào hộp thư đến. p=none chỉ để quan sát: bên nhận gửi báo cáo về cho chủ tên miền, nhưng không chặn.';
  else if (effPolicy === 'quarantine') action = 'Đưa vào thư rác hoặc khu cách ly.';
  else action = 'Bị máy chủ bên nhận từ chối ngay, không tới tay người dùng.';

  const delivered = dmarcPass || effPolicy === 'none';
  let verdict: { tone: 'good' | 'bad' | 'warn'; text: string };
  if (m.legit && delivered) {
    verdict = { tone: 'good', text: 'Đúng: thư thật tới được người nhận.' };
  } else if (m.legit && !delivered) {
    verdict = {
      tone: 'bad',
      text: 'Thư thật bị chặn. Đây là lý do không bật p=reject ngay: phải dùng báo cáo DMARC (rua=) để tìm hết các nguồn gửi hợp lệ và cấu hình SPF, DKIM cho chúng trước.',
    };
  } else if (!m.legit && !isBankDomain) {
    verdict = {
      tone: 'bad',
      text: 'Thư giả tới hộp thư mà DMARC không làm gì được: đây là tên miền của kẻ gian, cấu hình hoàn toàn đúng. Cần lớp khác: phát hiện tên miền nhái, gắn cờ tên miền mới đăng ký, nhãn "thư từ bên ngoài".',
    };
  } else if (!m.legit && delivered) {
    verdict = { tone: 'bad', text: 'Thư giả mạo tên miền ngân hàng vẫn tới hộp thư vì chính sách chỉ là p=none. Chuyển dần lên quarantine rồi reject.' };
  } else {
    verdict = { tone: 'good', text: 'Đúng: thư giả mạo tên miền ngân hàng bị chặn nhờ DMARC.' };
  }

  const header =
    `Authentication-Results: mx.nguoinhan.example;\n` +
    `  spf=${m.spf} (IP ${m.ip}) smtp.mailfrom=${m.mailFrom};\n` +
    `  dkim=${m.dkim}${m.dkimD ? ` header.d=${m.dkimD}` : ''};\n` +
    `  dmarc=${dmarcPass ? 'pass' : 'fail'} (p=${effPolicy.toUpperCase()}) header.from=${m.from}`;

  return (
    <div className="sim eauth">
      <p className="sim-title">Máy chủ thư bên nhận kiểm tra một lá thư (dữ liệu giả)</p>
      <SimHow steps={["Chọn chính sách DMARC của ngân hàng ở hàng nút phía trên.", "Chọn từng lá thư ở ô danh sách. Bảng bên dưới cho thấy máy chủ nhận thư kiểm tra SPF, DKIM, DMARC ra sao, và kết luận cuối cùng là cho vào, đưa vào thư rác hay chặn."]} />
      <p className="muted small">
        Ngân hàng Sao Mai sở hữu tên miền <code>{BANK}</code> và đã cài SPF, DKIM, DMARC (ba lớp kiểm tra xem một lá thư có thật sự do ngân hàng gửi không). Khi một thư tự xưng là của ngân hàng đến hộp thư người nhận, máy chủ thư của họ chạy ba kiểm tra này rồi quyết định cho vào, cho vào thư rác, hay từ chối. DMARC là chỗ ngân hàng ra lệnh cho bên nhận: thư không qua kiểm tra thì xử lý thế nào.
      </p>

      <div className="tabs" role="group" aria-label="Chính sách DMARC của saomai.example">
        {(['none', 'quarantine', 'reject'] as Policy[]).map((p) => (
          <button key={p} type="button" className="btn" aria-pressed={policy === p} onClick={() => setPolicy(p)}>
            {POLICY_LABEL[p]}
          </button>
        ))}
      </div>

      <label className="eauth-pick">
        <span className="small muted">Lá thư</span>
        <select value={idx} onChange={(e) => setIdx(Number(e.target.value))}>
          {MAILS.map((x, i) => (
            <option key={i} value={i}>
              {i + 1}. {x.name}
            </option>
          ))}
        </select>
      </label>

      <p className="eauth-story">{m.story}</p>

      <table className="eauth-table">
        <tbody>
          <tr>
            <th scope="row">Địa chỉ hiển thị (From)</th>
            <td colSpan={2}>
              <code>{m.from}</code> <span className="muted small">người dùng nhìn thấy cái này</span>
            </td>
          </tr>
          <tr>
            <th scope="row">SPF</th>
            <td>
              <Badge r={m.spf} /> <span className="small">envelope: <code>{m.mailFrom}</code></span>
              <span className="eauth-why">{m.spfWhy}</span>
            </td>
            <td>
              <Badge r={spfAligned ? 'aligned' : 'notaligned'} />
              <span className="eauth-why">Tên miền envelope {spfAligned ? 'cùng tổ chức với' : 'khác'} địa chỉ hiển thị.</span>
            </td>
          </tr>
          <tr>
            <th scope="row">DKIM</th>
            <td>
              <Badge r={m.dkim} /> {m.dkimD && <span className="small">d=<code>{m.dkimD}</code></span>}
              <span className="eauth-why">{m.dkimWhy}</span>
            </td>
            <td>
              {m.dkim === 'none' ? (
                <span className="muted small">không có chữ ký</span>
              ) : (
                <>
                  <Badge r={dkimAligned ? 'aligned' : 'notaligned'} />
                  <span className="eauth-why">Tên miền ký {dkimAligned ? 'cùng tổ chức với' : 'khác'} địa chỉ hiển thị.</span>
                </>
              )}
            </td>
          </tr>
          <tr>
            <th scope="row">DMARC</th>
            <td colSpan={2}>
              <Badge r={dmarcPass ? 'pass' : 'fail'} />{' '}
              <span className="small">
                {dmarcPass
                  ? 'Có ít nhất một kiểm tra vừa pass vừa khớp với địa chỉ hiển thị.'
                  : 'Không kiểm tra nào vừa pass vừa khớp với địa chỉ hiển thị.'}{' '}
                Áp chính sách của <code>{orgDomain(m.from)}</code>: {POLICY_LABEL[effPolicy]}.
              </span>
              <span className="eauth-why">{action}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <pre className="eauth-header" aria-label="Dòng kết quả xác thực trong header">{header}</pre>

      <div className={`sim-note eauth-verdict ${verdict.tone}`} aria-live="polite">
        {verdict.text}
      </div>
    </div>
  );
}
