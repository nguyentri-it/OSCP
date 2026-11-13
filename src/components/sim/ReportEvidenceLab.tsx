import { useMemo, useState } from 'react';
import SimHow from './SimHow';

type ScenarioKey = 'finding' | 'exam';

interface Item {
  id: string;
  label: string;
  detail: string;
  good: boolean;
  why: string;
}

interface Scenario {
  title: string;
  tabLabel: string;
  how: string[];
  desc: string;
  items: Item[];
  goodVerdict: string;
  badHelpGood: string;
  badHelpBad: string;
}

const SCENARIOS: Record<ScenarioKey, Scenario> = {
  finding: {
    title: 'Chắt lọc nội dung cho một mục phát hiện pentest',
    tabLabel: '1. Viết mục phát hiện (Dự án thực tế)',
    how: [
      'Bạn vừa khai thác thành công lỗi SQL injection ở /search. Hãy bấm chọn những mảnh thông tin NÊN đưa vào mục phát hiện trong báo cáo.',
      'Tránh chọn những mảnh viết quá chung chung hoặc làm lộ dữ liệu nhạy cảm không cần thiết, rồi bấm "Kiểm tra mục phát hiện".',
    ],
    desc: 'Một mục phát hiện tốt cần đủ bằng chứng để người đọc tin và tự tái hiện được, nhưng cũng phải gọn gàng, an toàn và chỉ rõ cách sửa.',
    items: [
      {
        id: 'scope',
        label: 'Địa chỉ máy, đường dẫn và thời điểm kiểm thử',
        detail: 'Ghi rõ: máy 10.10.14.30, đường dẫn http://10.10.14.30/search, tham số ten, kiểm tra lúc 14:32 ngày 01/11.',
        good: true,
        why: 'Nên đưa vào: giúp kỹ sư bên nhận biết chính xác lỗ hổng nằm ở máy nào, cổng nào và đối chiếu được với nhật ký hệ thống của họ.',
      },
      {
        id: 'repro',
        label: 'Các bước tái hiện kèm câu lệnh / payload thật',
        detail: "Đặt từng bước đánh số 1-2-3, kèm đúng chuỗi đã nhập: ' UNION SELECT username,password FROM users-- -",
        good: true,
        why: 'Nên đưa vào: cả giám khảo chấm thi lẫn kỹ sư sửa lỗi đều cần chép lại được đúng thao tác để tự mắt thấy lỗ hổng.',
      },
      {
        id: 'proof',
        label: 'Ảnh chụp màn hình đã che bớt dữ liệu nhạy cảm thừa',
        detail: 'Chụp khung kết quả có 1–2 dòng đầu làm bằng chứng, làm mờ mật khẩu thật của các tài khoản còn lại.',
        good: true,
        why: 'Nên đưa vào: vừa đủ chứng minh tác động thực tế, vừa không biến cuốn báo cáo thành nơi phát tán dữ liệu nhạy cảm.',
      },
      {
        id: 'rawdump',
        label: 'Dán nguyên bảng 5.000 mật khẩu và CCCD khách hàng',
        detail: 'Chép toàn bộ dữ liệu rút được từ cơ sở dữ liệu vào báo cáo để chứng minh mình đã lấy hết.',
        good: false,
        why: 'Không nên đưa vào: báo cáo đi qua tay nhiều người; chỉ cần vài dòng mẫu đã che bớt là đủ chứng minh, dán toàn bộ dữ liệu thật sẽ tạo rủi ro rò rỉ nghiêm trọng.',
      },
      {
        id: 'vaguefix',
        label: 'Khuyến nghị: "Cần nâng cao bảo mật và kiểm tra đầu vào"',
        detail: 'Một câu khuyên chung chung áp vào lỗ hổng nào cũng được.',
        good: false,
        why: 'Không nên đưa vào: lời khuyên chung chung như sách giáo khoa không giúp lập trình viên biết phải sửa dòng code hay cấu hình nào.',
      },
      {
        id: 'fix',
        label: 'Hướng khắc phục chỉ rõ chỗ hỏng và cách sửa',
        detail: 'Chuyển câu truy vấn tại /search sang prepared statement; hạ quyền tài khoản DB của web xuống chỉ đọc bảng cần thiết.',
        good: true,
        why: 'Nên đưa vào: chỉ tận tay vị trí lỗi và cách vá cụ thể để đội kỹ thuật bắt tay vào sửa được ngay.',
      },
    ],
    goodVerdict: 'Mục phát hiện rất chuẩn! Bạn đã giữ đủ 4 phần cốt lõi (vị trí, bước tái hiện, bằng chứng vừa đủ, cách vá cụ thể) và loại bỏ được 2 lỗi trình bày hay gặp.',
    badHelpBad: 'Hãy bỏ chọn những mục quá chung chung hoặc chứa toàn bộ dữ liệu nhạy cảm chưa che.',
    badHelpGood: 'Hãy bổ sung cho đủ 4 mảnh cốt lõi của một mục phát hiện.',
  },
  exam: {
    title: 'Tiêu chuẩn ảnh chụp bằng chứng cờ thi OSCP (OffSec Exam)',
    tabLabel: '2. Ảnh chụp cờ thi (Quy chuẩn OSCP)',
    how: [
      'Trong phòng thi OSCP, OffSec có quy định rất khắt khe về ảnh chụp minh chứng khi nộp mã local.txt và proof.txt.',
      'Hãy chọn những tiêu chí BẮT BUỘC / NÊN LÀM để được công nhận điểm, và tránh những lỗi khiến bạn bị từ chối chấm.',
    ],
    desc: 'Thiếu một dòng lệnh hoặc cắt ảnh sai quy định có thể khiến bạn mất trắng 10–20 điểm dù đã chiếm được máy.',
    items: [
      {
        id: 'exam_cmd_chain',
        label: 'Lệnh ipconfig/ip a + whoami + type/cat proof.txt trong cùng một shell',
        detail: 'Gõ liên tiếp lệnh xem IP, lệnh định danh tài khoản và lệnh đọc cờ trong cùng một cửa sổ tương tác.',
        good: true,
        why: 'Quy định bắt buộc của OffSec: Giám khảo cần thấy rõ địa chỉ IP máy mục tiêu, danh tính tài khoản và nội dung mã cờ ngay trong một ngữ cảnh shell để xác nhận bạn thực sự làm chủ máy đó.',
      },
      {
        id: 'exam_full_window',
        label: 'Để lộ trọn vẹn cửa sổ terminal hoặc toàn màn hình máy thi',
        detail: 'Giữ lại thanh tiêu đề terminal, dấu nhắc lệnh (shell prompt) và thời gian hệ thống, không cắt cúp quá sát.',
        good: true,
        why: 'Nên làm: Giữ trọn cửa sổ terminal giúp loại bỏ nghi vấn cắt ghép bằng chứng; OffSec yêu cầu ảnh chụp phải rõ ràng, đọc được cả câu lệnh lẫn kết quả đầu ra.',
      },
      {
        id: 'exam_only_hash',
        label: 'Chỉ chụp duy nhất 1 dòng mã băm MD5 của cờ mà không gõ lệnh ai/ở đâu',
        detail: 'Chụp đúng dòng băm 32 ký tự, không chạy lệnh ipconfig hay whoami trước đó.',
        good: false,
        why: 'Lỗi mất điểm nặng: OffSec sẽ từ chối chấm điểm nếu ảnh chỉ có mỗi chuỗi mã hash. Bắt buộc phải có lệnh xem IP (ipconfig/ip a) và danh tính (whoami) đi kèm trong cùng một ảnh.',
      },
      {
        id: 'exam_narrow_crop',
        label: 'Cắt cúp (crop) ảnh quá hẹp, cắt mất dấu nhắc lệnh và thanh tiêu đề',
        detail: 'Chỉ cắt đúng vài dòng chữ nhỏ xíu ở giữa màn hình để ảnh trông gọn gàng.',
        good: false,
        why: 'Không nên: Cắt cúp quá sát làm mất dấu nhắc lệnh (shell prompt) và thông tin phiên làm việc, dễ bị giám khảo nghi ngờ chỉnh sửa hoặc thiếu tính khách quan.',
      },
      {
        id: 'exam_keep_flag',
        label: 'Giữ nguyên file proof.txt / local.txt gốc, không sửa đổi hay di chuyển',
        detail: 'Chỉ dùng lệnh cat (Linux) hoặc type (Windows) để đọc, không sửa nội dung hay đổi ngày giờ của file.',
        good: true,
        why: 'Rất quan trọng: Không được chỉnh sửa, di chuyển hay thay đổi quyền của file cờ gốc trên máy mục tiêu vì giám khảo có thể đối chiếu thuộc tính file.',
      },
      {
        id: 'exam_phone_photo',
        label: 'Dùng điện thoại chụp nghiêng màn hình máy tính rồi dán vào báo cáo',
        detail: 'Dùng camera điện thoại chụp lại màn hình máy tính vì ngại cài công cụ chụp màn hình trên Kali.',
        good: false,
        why: 'Lỗi tối kỵ: OffSec chỉ chấp nhận ảnh chụp màn hình kỹ thuật số rõ nét (dùng Flameshot, Greenshot hoặc phím PrintScreen). Ảnh chụp ngoài đời bị méo góc, lóa sáng sẽ bị trừ điểm hoặc hủy bài thi.',
      },
    ],
    goodVerdict: 'Tuyệt đối chính xác! Bạn đã nắm vững toàn bộ quy chuẩn bằng chứng của OffSec: đủ chuỗi lệnh ip/whoami/proof, ảnh rõ ràng không cắt cúp tùy tiện và giữ nguyên vẹn file cờ.',
    badHelpBad: 'Hãy bỏ chọn những thói quen xấu như chỉ chụp chuỗi hash, crop ảnh quá hẹp hoặc dùng ảnh điện thoại.',
    badHelpGood: 'Hãy chọn đủ các tiêu chí bắt buộc của OffSec (chuỗi lệnh ip + whoami + cat cờ, giữ nguyên file cờ, chụp trọn cửa sổ).',
  },
};

export default function ReportEvidenceLab() {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('finding');
  const [included, setIncluded] = useState<string[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const scenario = SCENARIOS[activeScenario];
  const items = scenario.items;
  const goodIds = useMemo(() => items.filter((i) => i.good).map((i) => i.id), [items]);
  const pickedGood = included.filter((id) => goodIds.includes(id)).length;
  const pickedBad = included.filter((id) => !goodIds.includes(id)).length;
  const perfect = pickedGood === goodIds.length && pickedBad === 0;
  const lastItem = items.find((i) => i.id === lastId);

  function switchScenario(key: ScenarioKey) {
    setActiveScenario(key);
    setIncluded([]);
    setLastId(null);
    setChecked(false);
  }

  function toggle(id: string) {
    setChecked(false);
    setLastId(id);
    setIncluded((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function reset() {
    setIncluded([]);
    setLastId(null);
    setChecked(false);
  }

  return (
    <div className="sim report-lab">
      <div className="report-tabs">
        {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={activeScenario === key ? 'active' : ''}
            onClick={() => switchScenario(key)}
          >
            {SCENARIOS[key].tabLabel}
          </button>
        ))}
      </div>

      <p className="sim-title">{scenario.title}</p>
      <SimHow steps={scenario.how} />
      <p className="muted small">{scenario.desc}</p>

      <div className="report-grid">
        {items.map((item) => {
          const selected = included.includes(item.id);
          return (
            <button key={item.id} type="button" className={selected ? 'selected' : ''} onClick={() => toggle(item.id)} aria-pressed={selected}>
              <span>{selected ? '✓' : '○'}</span>
              <b>{item.label}</b>
              <small>{item.detail}</small>
            </button>
          );
        })}
      </div>

      {lastItem && (
        <p className="recon-takeaway" aria-live="polite">
          <b>{lastItem.good ? 'Nên có:' : 'Cần tránh:'}</b> {lastItem.why}
        </p>
      )}

      <div className="report-status" aria-live="polite">
        <p>
          {checked ? (
            perfect ? (
              <>
                <b>Chuẩn xác!</b> {scenario.goodVerdict}
              </>
            ) : (
              <>
                Bạn đã chọn <b>{pickedGood}/{goodIds.length}</b> phần đúng và <b>{pickedBad}</b> phần sai/nên tránh.{' '}
                {pickedBad > 0 ? scenario.badHelpBad : scenario.badHelpGood}
              </>
            )
          ) : (
            `Đã chọn ${included.length} mục. Hãy chọn đủ các phần tốt rồi bấm kiểm tra.`
          )}
        </p>
        <div className="sim-controls" style={{ marginTop: 0 }}>
          <button type="button" className="btn primary" onClick={() => setChecked(true)} disabled={included.length === 0}>
            Kiểm tra
          </button>
          {included.length > 0 && (
            <button type="button" className="btn" onClick={reset}>
              Làm lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
