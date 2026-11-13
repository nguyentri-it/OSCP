import { useState } from 'react';
import SimHow from './SimHow';

// Mô phỏng xếp thứ tự ưu tiên xử lý lỗ hổng cho một ngân hàng hư cấu.
// Dữ liệu là giả. Mục đích: thấy vì sao "xếp theo điểm CVSS" không bằng
// "xếp theo rủi ro bị khai thác thật", và khi chưa có bản vá thì làm gì.

interface Vuln {
  name: string;
  cvss: number;
  kev: boolean; // đang bị khai thác ngoài thực tế (danh mục KEV)
  exposed: boolean; // truy cập được từ Internet
  critical: boolean; // tài sản trọng yếu
  patch: 'co' | 'downtime' | 'chua';
  cvssScore: number;
  risk: number;
  action: string;
}

const VULNS: Vuln[] = [
  { name: 'Cổng internet banking — lỗi RCE (kẻ xấu chạy được lệnh từ xa), đang bị khai thác hàng loạt', cvss: 9.8, kev: true, exposed: true, critical: true, patch: 'co', cvssScore: 98, risk: 99, action: 'Vá ngay trong vài giờ, ngoài cửa sổ bảo trì bình thường. Trong lúc chờ vá: bật luật chặn tạm trên WAF (tường lửa chuyên cho web), tăng giám sát, sẵn sàng kịch bản ngắt dịch vụ nếu thấy dấu hiệu bị khai thác.' },
  { name: 'Thư viện ghi log nội bộ (kiểu Log4Shell) — máy chủ sau tường lửa', cvss: 10, kev: true, exposed: false, critical: true, patch: 'co', cvssScore: 100, risk: 78, action: 'Rất nghiêm trọng nhưng không truy cập được từ ngoài. Vá sớm theo quy trình khẩn; chặn luồng ra bất thường từ máy chủ này (lỗi kiểu này thường khiến máy chủ tự gọi ra ngoài).' },
  { name: 'Thiết bị VPN — lỗ hổng 0-day (mới lộ, nhà cung cấp CHƯA có bản vá)', cvss: 9.1, kev: true, exposed: true, critical: true, patch: 'chua', cvssScore: 91, risk: 97, action: 'Không có bản vá nên phải giảm thiểu tạm: áp đúng khuyến cáo của nhà cung cấp, hạn chế nguồn IP được phép kết nối, tắt tính năng/đường dẫn bị lỗi nếu được, tăng giám sát, và cân nhắc tạm ngắt dịch vụ cho tới khi có bản vá.' },
  { name: 'Máy in nội bộ — CVE điểm cao, không ai với tới từ ngoài', cvss: 8.8, kev: false, exposed: false, critical: false, patch: 'co', cvssScore: 88, risk: 22, action: 'Điểm CVSS cao nhưng rủi ro thực thấp: không truy cập được từ ngoài, không trọng yếu, chưa thấy bị khai thác. Lên lịch vá theo đợt thường kỳ.' },
  { name: 'Trang tuyển dụng công khai — lỗi XSS (chèn mã độc vào trang web)', cvss: 6.1, kev: false, exposed: true, critical: false, patch: 'co', cvssScore: 61, risk: 40, action: 'Chạm từ ngoài nhưng tác động giới hạn và không trọng yếu. Vá trong đợt tới; đặt bộ lọc đầu ra tạm thời nếu thấy bị dò.' },
  { name: 'Máy trạm — lỗi leo thang đặc quyền, kẻ xấu phải đang có chỗ đứng trên máy mới dùng được', cvss: 7.8, kev: false, exposed: false, critical: false, patch: 'co', cvssScore: 78, risk: 25, action: 'Cần đứng chân sẵn trên máy mới khai thác được, nên là bước sau của một cuộc tấn công. Đưa vào đợt vá máy trạm định kỳ.' },
  { name: 'Web server công khai — CVE trung bình nhưng đã có mã khai thác công khai', cvss: 6.5, kev: false, exposed: true, critical: true, patch: 'co', cvssScore: 65, risk: 70, action: 'Điểm trung bình nhưng có mã khai thác công khai (điểm EPSS cao, tức xác suất sắp bị dùng cao), lại truy cập được từ ngoài và đứng trước tài sản trọng yếu. Vá sớm; chặn tạm trên WAF.' },
  { name: 'Hệ thống thanh toán lõi — lỗi nghiêm trọng, vá cần ngừng dịch vụ', cvss: 9.0, kev: false, exposed: false, critical: true, patch: 'downtime', cvssScore: 90, risk: 72, action: 'Trọng yếu nhưng vá cần ngừng dịch vụ nên phải có cửa sổ bảo trì được duyệt. Trong lúc chờ: siết quyền truy cập, thêm giám sát, dùng biện pháp bù (IPS, phân đoạn chặt hơn) để giảm rủi ro tạm thời.' },
];

const PATCH_LABEL: Record<Vuln['patch'], string> = { co: 'Có bản vá', downtime: 'Vá cần downtime', chua: 'Chưa có bản vá' };

export default function PatchTriage() {
  const [risk, setRisk] = useState(true);
  const [open, setOpen] = useState<number | null>(null);

  const score = (v: Vuln) => (risk ? v.risk : v.cvssScore);
  const order = VULNS.map((v, i) => i).sort((a, b) => score(VULNS[b]) - score(VULNS[a]));

  const note = risk
    ? 'Xếp theo rủi ro thực tế: lỗ hổng đang bị khai thác (KEV) và truy cập được từ Internet lên đầu, kể cả khi điểm CVSS chỉ ở mức trung bình. Máy in điểm 8.8 và lỗi cục bộ điểm 7.8 rơi xuống cuối. Đây là thứ tự đội vận hành nên theo.'
    : 'Xếp theo điểm CVSS đơn thuần: máy in nội bộ (8.8) và lỗi leo thang cục bộ (7.8) đứng trên cả web server công khai đã có mã khai thác (6.5). CVSS đo mức nghiêm trọng của lỗi, không đo khả năng bị khai thác trong môi trường của bạn.';

  return (
    <div className="sim triage">
      <p className="sim-title">Xếp ưu tiên xử lý lỗ hổng (dữ liệu giả)</p>
      <SimHow steps={["Chọn một trong hai cách xếp thứ tự ở hàng nút phía trên, rồi so sánh thứ tự các dòng thay đổi ra sao.", "Bấm vào một dòng để xem lỗ hổng đó nên xử lý thế nào."]} />
      <p className="muted small">
        Ngân hàng đang có tám lỗ hổng chưa vá, mà đội IT chỉ đủ sức vá vài cái mỗi tuần. Vậy vá cái nào trước? Hai cách xếp thứ tự dưới đây cho ra hai danh sách khá khác nhau. Điểm CVSS đo độ nghiêm trọng của riêng lỗi đó; còn rủi ro thực tế còn xét lỗi có đang bị kẻ xấu dùng thật không, và có truy cập được từ Internet không.
      </p>

      <div className="tabs" role="group" aria-label="Chọn cách xếp ưu tiên">
        <button type="button" className="btn" aria-pressed={!risk} onClick={() => setRisk(false)}>
          Xếp theo điểm CVSS
        </button>
        <button type="button" className="btn" aria-pressed={risk} onClick={() => setRisk(true)}>
          Xếp theo rủi ro khai thác thực tế
        </button>
      </div>

      <ol className="triage-list">
        {order.map((idx, rank) => {
          const v = VULNS[idx];
          const s = score(v);
          const tone = v.patch === 'chua' ? 'none' : s >= 75 ? 'hi' : s >= 45 ? 'mid' : 'lo';
          return (
            <li key={idx} className={`triage-row ${tone}`}>
              <button type="button" onClick={() => setOpen(open === idx ? null : idx)} aria-expanded={open === idx}>
                <span className="triage-rank">{rank + 1}</span>
                <span className="triage-bar" aria-hidden="true">
                  <span style={{ width: `${s}%` }} />
                </span>
                <span className="triage-score">{s}</span>
                <span className="triage-name">{v.name}</span>
                <span className="triage-tags">
                  {v.kev && <span className="triage-tag kev">Đang bị khai thác</span>}
                  {v.exposed && <span className="triage-tag exp">Lộ ra Internet</span>}
                  {v.critical && <span className="triage-tag crit">Trọng yếu</span>}
                  <span className={`triage-tag patch ${v.patch}`}>{PATCH_LABEL[v.patch]}</span>
                </span>
              </button>
              {open === idx && (
                <p className="triage-action">
                  <strong>CVSS {v.cvss.toFixed(1)}.</strong> {v.action}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="sim-note">{note}</div>
    </div>
  );
}
