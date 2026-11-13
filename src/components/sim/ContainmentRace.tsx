import { useState } from 'react';
import SimHow from './SimHow';

// Mô phỏng "cuộc đua" giữa một cuộc xâm nhập do AI agent điều phối và đội phòng thủ
// của ngân hàng hư cấu Sao Mai. Dữ liệu và mốc thời gian là giả, làm tròn cho dễ thấy.
// Mục đích: thấy vì sao phát hiện sớm vẫn vô ích nếu phản ứng phải chờ người duyệt,
// và vì sao mồi nhử + ngăn chặn tự động duyệt trước thay đổi kết quả.

type Def = 'rule' | 'decoy' | 'auto' | 'device';
type Conf = 'cao' | 'vua';

interface Signal {
  label: string;
  conf: Conf;
  needs?: Def; // cần lớp phòng thủ nào thì tín hiệu này mới có
}

interface Step {
  t: number; // phút kể từ lúc vào được
  name: string;
  detail: string;
  signals: Signal[];
}

const STEPS: Step[] = [
  {
    t: 0,
    name: 'Vào cổng nội bộ bằng cookie đăng nhập ăn cắp từ máy một nhân viên',
    detail: 'Cookie là "vé đã soát" của lần đăng nhập trước, nên kẻ tấn công khỏi cần mật khẩu hay mã MFA. Chỉ có điều nó đang dùng từ một máy lạ, không phải máy do ngân hàng quản lý.',
    signals: [],
  },
  {
    t: 1,
    name: 'Đọc hết danh sách người dùng, nhóm và tài khoản dịch vụ trong AD (Active Directory)',
    detail: 'AI agent đọc vét sạch mọi thứ, kể cả tài khoản mồi do ngân hàng cài sẵn. Người dùng bình thường không có lý do gì đọc cái mồi này, nên ai đọc là đáng ngờ.',
    signals: [{ label: 'Đối tượng AD mồi bị đọc (4662)', conf: 'cao', needs: 'decoy' }],
  },
  {
    t: 3,
    name: 'Kerberoasting: xin "vé" của 22 tài khoản dịch vụ để mang về bẻ mật khẩu',
    detail: 'Môi trường này đã tắt kiểu mã hoá cũ RC4, nên công cụ tự chuyển sang kiểu mới AES. Luật phát hiện ở bài 8.1 chỉ canh RC4 nên không thấy gì.',
    signals: [
      { label: 'Luật đếm số vé xin trong thời gian ngắn, bất kể kiểu mã hoá', conf: 'vua', needs: 'rule' },
      { label: 'Vé cho tài khoản SPN mồi (4769)', conf: 'cao', needs: 'decoy' },
    ],
  },
  {
    t: 6,
    name: 'Bẻ được một mật khẩu yếu, rồi lục thư mục dùng chung tìm file có mật khẩu',
    detail: 'Nó mở mọi file có tên giống chứa mật khẩu, kể cả file mồi "mat-khau-he-thong.xlsx" do ngân hàng cài để bẫy.',
    signals: [{ label: 'File mồi bị mở (4663)', conf: 'cao', needs: 'decoy' }],
  },
  {
    t: 8,
    name: 'Dùng mật khẩu vừa bẻ để vào máy chủ lưu file',
    detail: 'Từ đây nó đã chạm được hồ sơ vay của khách hàng.',
    signals: [],
  },
  {
    t: 12,
    name: 'Nén 40 GB hồ sơ khách hàng và gửi ra dịch vụ lưu trữ bên ngoài',
    detail: 'AI đọc nhanh số dữ liệu lấy được để chọn thứ gây áp lực nhất khi đòi tiền chuộc.',
    signals: [{ label: 'Máy chủ file bỗng gửi ra ngoài lượng dữ liệu rất lớn', conf: 'vua' }],
  },
  {
    t: 20,
    name: 'Xoá bản sao lưu tự động (shadow copy), mã hoá máy chủ file, gửi thư đòi tiền chuộc',
    detail: 'Kết cục thường thấy của ransomware: dữ liệu bị khoá, dịch vụ ngưng chạy.',
    signals: [],
  },
];

const DEFS: { key: Def; label: string; hint: string }[] = [
  { key: 'device', label: 'Conditional Access: chỉ thiết bị do ngân hàng quản lý', hint: 'Chặn từ cửa: tài khoản bị lấy trộm mà đăng nhập từ máy lạ thì không vào được' },
  { key: 'rule', label: 'Luật Kerberoasting theo khối lượng, không phụ thuộc RC4', hint: 'Nhìn số lượng yêu cầu bất thường thay vì một kiểu mã hoá cụ thể; vẫn có báo động giả nên cần người xem' },
  { key: 'decoy', label: 'Mồi nhử: đối tượng AD mồi, tài khoản SPN mồi, file mồi', hint: 'Bẫy giả không ai hợp lệ cần dùng, nên ai chạm vào là gần như chắc chắn có kẻ xâm nhập' },
  { key: 'auto', label: 'Ngăn chặn tự động duyệt trước cho tín hiệu độ tin cậy cao', hint: 'Mồi bị chạm thì máy tự cách ly ngay, không chờ analyst' },
];

// Thời gian phản ứng (phút), làm tròn cho mô phỏng.
const ANALYST_HIGH = 10; // cảnh báo mức cao vẫn phải chờ analyst nhận và duyệt
const ANALYST_MID = 25; // cảnh báo mức vừa nằm trong hàng đợi lâu hơn
const AUTO = 1;

export default function ContainmentRace() {
  const [on, setOn] = useState<Record<Def, boolean>>({ device: false, rule: false, decoy: false, auto: false });
  const [open, setOpen] = useState<number | null>(null);

  // Tìm tín hiệu đầu tiên và thời điểm ngăn chặn.
  let detectAt: { step: number; signal: Signal } | null = null;
  let containAt = Infinity;
  if (!on.device) {
    for (let i = 0; i < STEPS.length; i++) {
      for (const s of STEPS[i].signals) {
        if (s.needs && !on[s.needs]) continue;
        const delay = s.conf === 'cao' ? (on.auto ? AUTO : ANALYST_HIGH) : ANALYST_MID;
        const at = STEPS[i].t + delay;
        if (at < containAt) {
          containAt = at;
          if (!detectAt) detectAt = { step: i, signal: s };
        }
      }
    }
  }

  const happened = (i: number) => !on.device && STEPS[i].t < containAt;
  const reached = STEPS.filter((_, i) => happened(i)).length;

  let note: { text: string; tone: string };
  if (on.device) {
    note = {
      text: 'Kẻ tấn công bị chặn ngay từ cửa: cookie ăn cắp được đem dùng từ một máy lạ nên hệ thống không cho vào. Ngăn từ đầu luôn rẻ hơn là phát hiện về sau. Nhưng đừng chỉ dựa vào một lớp: bỏ tích ô này để xem các lớp còn lại có đỡ nổi không.',
      tone: 'good-bg',
    };
  } else if (reached === STEPS.length) {
    const noFuel = on.auto && !on.decoy ? ' Ngăn chặn tự động chưa có gì để chạy: máy chỉ nên tự hành động khi tín hiệu rất chắc chắn, mà chưa có mồi nhử thì chưa có tín hiệu nào chắc như vậy.' : '';
    note = {
      text:
        (detectAt?.signal.needs
          ? `Hệ thống phát hiện ở phút ${STEPS[detectAt.step].t}, nhưng phải tới phút ${containAt} mới ngăn được: quá muộn. Kẻ tấn công đã mã hoá xong ở phút ${STEPS[STEPS.length - 1].t}. Phát hiện sớm mà phản ứng chậm hơn kẻ tấn công thì vẫn thua.`
          : `Tín hiệu duy nhất (dữ liệu bị gửi ra ngoài) xuất hiện ở phút 12, rồi nằm chờ analyst xử lý tới phút ${containAt}. Trong khi đó AI agent đã đi từ cookie ăn cắp tới mã hoá xong chỉ trong 20 phút.`) + noFuel,
      tone: 'bad-bg',
    };
  } else if (reached === STEPS.length - 1) {
    note = {
      text: `Ngăn được ở phút ${containAt}: tránh được vụ mã hoá, nhưng dữ liệu khách hàng đã bị lấy ra ngoài. Đây vẫn là sự cố phải báo cáo, và kẻ tấn công có thể đòi tiền để không tung dữ liệu (bài 8.6).`,
      tone: 'warn-bg',
    };
  } else if (reached === STEPS.length - 2) {
    note = {
      text: `Ngăn được ở phút ${containAt}, trước khi dữ liệu bị lấy đi, nhưng kẻ tấn công đã vào được máy chủ file và giữ một mật khẩu. Còn phải dọn dẹp nhiều. Thử tích thêm "ngăn chặn tự động" xem sao.`,
      tone: 'warn-bg',
    };
  } else {
    note = {
      text: `Ngăn được ở phút ${containAt}, chỉ sau ${reached} bước. Chạm vào mồi nhử là tín hiệu gần như chắc chắn không nhầm, nên máy dám tự cô lập mà không cần chờ người. Đây là cách đối đầu với kẻ tấn công chạy bằng tốc độ máy: phòng thủ cũng phải chạy bằng tốc độ máy.`,
      tone: 'good-bg',
    };
  }

  return (
    <div className="sim race">
      <p className="sim-title">Cuộc đua ngăn chặn tại Ngân hàng Sao Mai (hư cấu, mốc thời gian làm tròn)</p>
      <SimHow steps={["Tích các ô trong \"Lớp phòng thủ\" để bật từng lớp bảo vệ. Danh sách bên dưới là các bước kẻ tấn công thực hiện theo thời gian (tính bằng phút).", "Bước nào bị chặn sẽ đổi màu và ghi \"Bị chặn\". Bấm vào một dòng để đọc chi tiết, khung ghi chú ở cuối cho biết bạn thắng hay thua cuộc đua."]} />
      <p className="muted small">
        Tình huống: một AI agent tự động tấn công ngân hàng, mỗi bước cách nhau vài phút kể từ lúc nó vào được mạng. Bên phòng thủ chỉ ngăn được nó khi kịp phát hiện và hành động. Nếu phải chờ analyst (nhân viên trực giám sát an ninh) xem cảnh báo rồi mới xử lý thì mất khoảng {ANALYST_HIGH} phút với cảnh báo mức cao và {ANALYST_MID} phút với cảnh báo mức vừa. Để máy tự ngăn chặn thì chỉ mất khoảng {AUTO} phút.
      </p>

      <fieldset className="pinj-defs">
        <legend>Lớp phòng thủ</legend>
        {DEFS.map((d) => (
          <label key={d.key}>
            <input type="checkbox" checked={on[d.key]} onChange={() => setOn((o) => ({ ...o, [d.key]: !o[d.key] }))} />
            <span>
              {d.label}
              <span className="check-hint">{d.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <ol className="race-list">
        {STEPS.map((s, i) => {
          const done = happened(i);
          const isDetect = detectAt?.step === i;
          return (
            <li key={i} className={`race-row ${done ? 'done' : 'stopped'} ${isDetect ? 'detect' : ''}`}>
              <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span className="race-t">+{s.t}′</span>
                <span className="race-name">{s.name}</span>
                <span className="race-tag">{done ? 'Đã xảy ra' : 'Bị chặn'}</span>
                {s.signals.length > 0 && (
                  <span className="race-sigs">
                    {s.signals.map((g, j) => {
                      const live = !on.device && (!g.needs || on[g.needs]);
                      return (
                        <span key={j} className={`race-sig ${live ? g.conf : 'off'}`}>
                          {live ? (g.conf === 'cao' ? '● ' : '◐ ') : '○ '}
                          {g.label}
                        </span>
                      );
                    })}
                  </span>
                )}
              </button>
              {open === i && <p className="race-detail">{s.detail}</p>}
            </li>
          );
        })}
      </ol>

      <p className="race-legend muted small">
        ● tín hiệu độ tin cậy cao · ◐ độ tin cậy vừa, cần người xem · ○ chưa có lớp phòng thủ tạo ra tín hiệu này
      </p>

      <div className={`sim-note ${note.tone}`} aria-live="polite">
        {note.text}
      </div>
    </div>
  );
}
