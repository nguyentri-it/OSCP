import { useState } from 'react';
import SimHow from './SimHow';

// Mô phỏng mô hình chấm điểm rủi ro giao dịch của một ngân hàng hư cấu.
// Dữ liệu là giả. Mục đích: thấy được đánh đổi giữa "bắt được gian lận" và
// "làm phiền khách hàng thật" khi chỉnh ngưỡng, và giá trị của tín hiệu hành vi.

interface Tx {
  desc: string;
  amount: string;
  base: number; // điểm của mô hình chỉ dùng số tiền, giờ, người nhận mới
  rich: number; // điểm khi thêm tín hiệu thiết bị, hành vi, đồ thị tài khoản nhận
  fraud: boolean;
  why: string;
}

const TXS: Tx[] = [
  { desc: 'Chuyển cho mẹ, người nhận quen', amount: '2.500.000đ', base: 8, rich: 5, fraud: false, why: 'Người nhận đã chuyển nhiều lần, thiết bị quen, nhịp gõ khớp chủ tài khoản.' },
  { desc: 'Thanh toán hoá đơn điện', amount: '780.000đ', base: 3, rich: 2, fraud: false, why: 'Giao dịch định kỳ hằng tháng.' },
  { desc: 'Mua xe máy, người nhận mới, ban ngày', amount: '45.000.000đ', base: 62, rich: 30, fraud: false, why: 'Số tiền lớn và người nhận mới làm mô hình cơ bản lo. Nhưng thiết bị quen, không có app điều khiển từ xa, nhịp gõ bình thường.' },
  { desc: '23:40, người nhận mới, có app điều khiển từ xa đang chạy', amount: '95.000.000đ', base: 70, rich: 97, fraud: true, why: 'Nạn nhân bị dụ cài một app "dịch vụ công" giả, cho phép kẻ gian điều khiển điện thoại từ xa và bấm chuyển tiền thay. Chỉ riêng việc có app điều khiển từ xa đang chạy đã là dấu hiệu rất mạnh.' },
  { desc: 'Tài khoản mới, ngay dưới ngưỡng 10 triệu', amount: '9.800.000đ', base: 35, rich: 88, fraud: true, why: 'Chia nhỏ số tiền để né mức từ 10 triệu trở lên phải xác thực khuôn mặt. Tài khoản nhận vừa nhận tiền từ hàng chục người lạ trong 1 giờ: đây là dấu hiệu của tài khoản "mule" (tài khoản trung gian chuyên nhận tiền lừa đảo).' },
  { desc: 'Lại tài khoản đó, 3 phút sau', amount: '9.900.000đ', base: 38, rich: 90, fraud: true, why: 'Lại chia nhỏ để né mức kiểm tra. Sơ đồ dòng tiền cho thấy tài khoản nhận này nối với rất nhiều nạn nhân khác.' },
  { desc: 'Trả lương nhân viên định kỳ', amount: '15.000.000đ', base: 20, rich: 6, fraud: false, why: 'Lặp lại đúng ngày mỗi tháng, cùng người nhận.' },
  { desc: 'Vé máy bay, thiết bị mới khi đi du lịch', amount: '6.200.000đ', base: 48, rich: 44, fraud: false, why: 'Thiết bị mới làm điểm tăng, nhưng khuôn mặt khớp lúc đăng nhập và cách gõ giống chủ tài khoản.' },
  { desc: '"Chuyên gia" xúi đầu tư tiền ảo, nạn nhân tự chuyển', amount: '30.000.000đ', base: 45, rich: 52, fraud: true, why: 'Ca khó nhất: đúng chủ tài khoản, đúng điện thoại, tự tay bấm chuyển (bị lừa nên tự nguyện làm). Cách thao tác trông hoàn toàn bình thường; chỉ có tài khoản nhận là hơi đáng ngờ.' },
  { desc: 'Nạp ví điện tử', amount: '500.000đ', base: 10, rich: 4, fraud: false, why: 'Số nhỏ, ví của chính chủ.' },
  { desc: 'Gửi con du học, 2 giờ sáng', amount: '20.000.000đ', base: 58, rich: 22, fraud: false, why: 'Giờ khuya vì lệch múi giờ, nhưng người nhận quen và đã chuyển đều đặn.' },
  { desc: 'Vừa đổi SIM, đăng nhập từ máy giả lập', amount: '49.000.000đ', base: 66, rich: 95, fraud: true, why: 'Vừa đổi SIM rồi đăng nhập từ phần mềm giả lập điện thoại Android trên máy tính: đây là cách chiếm tài khoản rất kinh điển.' },
];

export default function FraudScoring() {
  const [rich, setRich] = useState(false);
  const [th, setTh] = useState(60);
  const [open, setOpen] = useState<number | null>(null);

  const score = (t: Tx) => (rich ? t.rich : t.base);
  const frauds = TXS.filter((t) => t.fraud);
  const legit = TXS.filter((t) => !t.fraud);
  const caught = frauds.filter((t) => score(t) >= th).length;
  const bothered = legit.filter((t) => score(t) >= th).length;

  let note: { text: string; tone: string };
  if (caught === frauds.length && bothered === 0) {
    note = { text: 'Ngưỡng này vừa đẹp trên bộ dữ liệu nhỏ này. Ngoài đời không có ngưỡng hoàn hảo: kẻ gian sẽ học cách hạ điểm của mình, và mô hình phải được huấn luyện lại thường xuyên.', tone: 'good-bg' };
  } else if (caught < frauds.length && bothered === 0) {
    note = { text: `Không làm phiền ai, nhưng lọt ${frauds.length - caught} vụ lừa đảo. Mỗi vụ lọt là tiền thật của khách hàng mất đi.`, tone: 'bad-bg' };
  } else if (caught === frauds.length) {
    note = { text: `Bắt hết gian lận, nhưng ${bothered} khách hàng thật bị tạm giữ giao dịch. Ngưỡng quá thấp làm khách bực, đội xử lý ngập việc, và người ta bắt đầu bỏ qua cảnh báo.`, tone: 'warn-bg' };
  } else {
    note = { text: `Vừa lọt ${frauds.length - caught} vụ, vừa làm phiền ${bothered} khách thật. Thử bật tín hiệu hành vi để thấy dữ liệu tốt hơn tách hai nhóm rõ hơn thế nào.`, tone: 'warn-bg' };
  }

  return (
    <div className="sim fraud">
      <p className="sim-title">Mô hình chấm điểm rủi ro giao dịch (dữ liệu giả)</p>
      <SimHow steps={["Chọn một trong hai nút để quyết định mô hình AI được dùng những dữ liệu nào.", "Kéo thanh \"Ngưỡng tạm giữ\": giao dịch nào có điểm bằng hoặc cao hơn ngưỡng sẽ bị giữ lại để xác minh.", "Xem hai con số: bắt được bao nhiêu vụ lừa đảo, làm phiền bao nhiêu khách thật. Bấm vào một dòng để đọc lý do."]} />
      <p className="muted small">
        Ngân hàng dùng AI chấm điểm rủi ro cho mỗi giao dịch, từ 0 (an toàn) đến 100 (rất đáng ngờ). Giao dịch nào đạt từ mức "ngưỡng" trở lên sẽ bị tạm giữ để xác minh (quét khuôn mặt hoặc gọi lại cho khách). Đặt ngưỡng thấp thì ít lọt lừa đảo nhưng làm phiền nhiều khách thật; đặt cao thì ngược lại.
      </p>

      <div className="tabs" role="group" aria-label="Chọn dữ liệu đầu vào cho mô hình">
        <button type="button" className="btn" aria-pressed={!rich} onClick={() => setRich(false)}>
          Mô hình cơ bản: số tiền, giờ, người nhận mới
        </button>
        <button type="button" className="btn" aria-pressed={rich} onClick={() => setRich(true)}>
          + Thiết bị, cách thao tác, lịch sử tài khoản nhận
        </button>
      </div>

      <label className="fraud-th">
        <span>
          Ngưỡng tạm giữ: <strong>{th}</strong>
        </span>
        <input type="range" min={0} max={100} value={th} onChange={(e) => setTh(Number(e.target.value))} aria-label="Ngưỡng tạm giữ giao dịch" />
      </label>

      <div className="fraud-stats" aria-live="polite">
        <span className={caught === frauds.length ? 'good-text' : 'bad-text'}>
          Bắt được <strong>{caught}/{frauds.length}</strong> vụ lừa đảo
        </span>
        <span className={bothered === 0 ? 'good-text' : 'warn-text'}>
          Làm phiền <strong>{bothered}/{legit.length}</strong> giao dịch thật
        </span>
      </div>

      <ul className="fraud-list">
        {TXS.map((t, i) => {
          const s = score(t);
          const held = s >= th;
          const cls = t.fraud ? (held ? 'tp' : 'fn') : held ? 'fp' : 'tn';
          const label = t.fraud ? (held ? 'Chặn đúng' : 'Lọt lưới') : held ? 'Giữ nhầm' : 'Cho qua';
          return (
            <li key={i} className={`fraud-row ${cls}`}>
              <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span className="fraud-bar" aria-hidden="true">
                  <span style={{ width: `${s}%` }} />
                  <i style={{ left: `${th}%` }} />
                </span>
                <span className="fraud-score">{s}</span>
                <span className="fraud-desc">
                  {t.desc} <span className="muted">· {t.amount}</span>
                </span>
                <span className="fraud-tag">{label}</span>
              </button>
              {open === i && (
                <p className="fraud-why">
                  <strong>{t.fraud ? 'Thực tế: lừa đảo.' : 'Thực tế: giao dịch thật.'}</strong> {t.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className={`sim-note ${note.tone}`}>{note.text}</div>
    </div>
  );
}
