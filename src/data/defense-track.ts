// Nhánh phòng thủ: thứ tự đọc cho người muốn bảo vệ một doanh nghiệp, không nhắm thi OSCP.
// Mỗi mục trỏ tới một bài bằng mã bài; trang /phong-thu/ báo lỗi khi build nếu mã không tồn tại.

export interface TrackStep {
  code: string;
  note: string;
  optional?: boolean;
}

export interface TrackStage {
  id: string;
  name: string;
  why: string;
  steps: TrackStep[];
}

export const defenseTrack: TrackStage[] = [
  {
    id: 'nen-tang',
    name: 'Nền tảng',
    why: 'Không hiểu mạng và hệ điều hành thì không đọc được log. Chặng này không bỏ được.',
    steps: [
      { code: '0.1', note: 'Luật chơi và đạo đức. Người phòng thủ cũng cần văn bản cho phép trước khi thử bất cứ gì trên hệ thống thật.' },
      { code: '0.2', note: 'Dựng lab. Bạn sẽ quay lại chính lab này ở bài 8.3 và 8.5 để thêm máy giám sát và mồi nhử.' },
      { code: '1.1', note: 'IP, subnet, phân đoạn mạng: nền của mọi luật tường lửa và mọi truy vấn log.' },
      { code: '1.2', note: 'Cổng và kết nối: đọc được log tường lửa và luồng mạng.' },
      { code: '1.3', note: 'DNS và HTTP: nền cho bài thư giả (7.5) và cho việc phát hiện mã độc gọi ra ngoài.' },
      { code: '1.4', note: 'Linux: quyền, tiến trình, log hệ thống. Đây là nơi bạn sẽ đọc auditd và Wazuh.' },
      { code: '1.5', note: 'Windows: tài khoản, dịch vụ, Event Log. Phần lớn mã sự kiện ở Cấp 7 nằm ở đây.' },
      { code: '1.6', note: 'Scripting giúp tự động hoá việc kiểm kê và đọc log.', optional: true },
    ],
  },
  {
    id: 'hieu-don',
    name: 'Hiểu đòn để đỡ',
    why: 'Không cần thành thạo công cụ tấn công, nhưng phải biết mỗi kỹ thuật làm gì thì mới biết nó để lại dấu gì. Đọc kỹ phần cơ chế và Góc phòng thủ; phần lệnh tấn công đọc lướt là đủ.',
    steps: [
      { code: '2.1', note: 'Kẻ tấn công thấy gì về công ty bạn từ bên ngoài. Dùng chính cách này để kiểm kê bề mặt của mình (7.1).' },
      { code: '2.2', note: 'Quét cổng: để tự quét dải IP của chính đơn vị và nhận ra mình đang bị quét.', optional: true },
      { code: '2.3', note: 'Lỗ hổng web cơ bản. Cần nếu đơn vị có website hoặc ứng dụng web tự viết.', optional: true },
      { code: '2.4', note: 'Lừa đảo và tài liệu độc hại: đường vào hay gặp nhất, nay được AI viết hộ.' },
      { code: '2.5', note: 'CVE và CVSS: nền cho việc xếp ưu tiên vá ở bài 7.1.' },
      { code: '2.6', note: 'Mật khẩu, hash, bắt mã xác thực trên mạng: hiểu vì sao cần MFA và tắt LLMNR.' },
      { code: '2.8', note: 'Web nâng cao: upload, traversal, LFI. Cùng điều kiện như bài 2.3.', optional: true },
      { code: '2.9', note: 'Đám mây: IAM, dịch vụ metadata, kho lưu trữ cấu hình sai. Gần như doanh nghiệp nào cũng có một phần trên mây.' },
      { code: '3.1', note: 'Leo quyền trên Linux. Cần nếu đơn vị chạy nhiều máy chủ Linux.', optional: true },
      { code: '3.2', note: 'Leo quyền trên Windows: dịch vụ cấu hình sai, quyền thừa.', optional: true },
      { code: '3.4', note: 'Kiến trúc Active Directory: trung tâm danh tính của đa số doanh nghiệp dùng Windows.' },
      { code: '3.5', note: 'Điểm yếu AD: Kerberoasting, Pass-the-Hash, DCSync. Đây là các kỹ thuật bạn sẽ viết luật phát hiện.' },
      { code: '3.8', note: 'Vì sao mã độc bị chặn và EDR nhìn thấy gì. Giúp chọn và cấu hình EDR đúng, nền cho bài hardening 7.2.' },
      { code: '3.9', note: 'Di chuyển ngang: chặng giữa của mọi cuộc xâm nhập, nơi việc tách tài khoản quản trị phát huy tác dụng.' },
      { code: '5.2', note: 'Đi trọn một chuỗi tấn công AD, rồi đối chiếu từng bước với bản đồ phát hiện ở bài 8.2.', optional: true },
    ],
  },
  {
    id: 'moi-de-doa',
    name: 'Mối đe doạ mới (Cấp 6)',
    why: 'AI không đẻ ra kiểu tấn công mới, nhưng làm chiêu cũ nhanh hơn, rẻ hơn và thuyết phục hơn. Nhiều bài lấy ví dụ ở ngân hàng; nguyên tắc dùng được cho mọi doanh nghiệp.',
    steps: [
      { code: '6.1', note: 'Bốn nhóm mối đe doạ có dùng AI, vì sao doanh nghiệp nhỏ cũng bị nhắm, và lớp chặn cho từng nhóm.' },
      { code: '6.2', note: 'Mạo danh bằng giọng nói, video giả, và quy trình chặn mà không cần nhận ra hàng giả. Phần chấm điểm giao dịch đọc lướt nếu đơn vị không xử lý thanh toán của khách.' },
      { code: '6.3', note: 'Ứng viên giả qua phỏng vấn video, nhân viên IT từ xa mạo danh, và người bên trong lạm dụng quyền. Cần cho mọi đơn vị có tuyển dụng từ xa.' },
      { code: '6.4', note: 'Chatbot, AI agent, MCP, shadow AI. Cần cho mọi đơn vị có nhân viên dùng AI, tức là gần như tất cả.' },
    ],
  },
  {
    id: 'phong-ngua',
    name: 'Phòng ngừa (Cấp 7)',
    why: 'Đóng cửa trước khi lắp camera. Mỗi bài có quy trình, lệnh kiểm tra và danh sách kiểm tra dùng được ngay; thứ tự khớp với chặng 1 của kế hoạch 90 ngày.',
    steps: [
      { code: '7.1', note: 'Kiểm kê, xếp ưu tiên vá theo KEV, thiết bị biên, và làm gì khi chưa có bản vá.' },
      { code: '7.2', note: 'Hardening AD, Windows và Linux theo chuẩn: phân tầng quản trị, LAPS, SMB signing, tắt giao thức cũ, chặn ClickFix và macro.' },
      { code: '7.3', note: 'MFA chống phishing, Conditional Access, phiên đăng nhập bị đánh cắp sau MFA.' },
      { code: '7.4', note: 'Quy trình cấp lại mật khẩu và MFA khi kẻ gian giả giọng gọi bộ phận IT.' },
      { code: '7.5', note: 'SPF, DKIM, DMARC, tên miền nhái, và chia sẻ tình báo.' },
      { code: '7.6', note: 'Microsoft 365, Google Workspace, Azure, GCP: quản trị viên, ứng dụng được cấp quyền, audit log, khoá đám mây bị dùng để chạy AI.' },
      { code: '7.7', note: 'Phần mềm của nhà cung cấp, gói mã nguồn mở, CI/CD và container. Phần đầu cho mọi đơn vị; phần sau cho đơn vị tự viết phần mềm hoặc chạy container.' },
    ],
  },
  {
    id: 'phat-hien',
    name: 'Phát hiện, phản ứng và phục hồi (Cấp 8)',
    why: 'Phòng ngừa sẽ có ngày thủng. Cấp 8 đi từ thu log và viết luật, qua hai lab tự tay, tới phục hồi và diễn tập. Hai bài lab là chỗ đọc để biết thành tự tay làm được.',
    steps: [
      { code: '8.1', note: 'SOC và SIEM: phát hiện theo luật và theo hành vi, trợ lý AI cho analyst, tự động hoá phản ứng.' },
      { code: '8.2', note: 'Mỗi kỹ thuật ở Cấp 2–3 để lại dấu gì, cần bật nguồn log nào, chỗ nào đang mù.' },
      { code: '8.3', note: 'Lab: dựng Wazuh và Sysmon, tự ra đòn rồi tự tìm dấu vết.' },
      { code: '8.4', note: 'Mồi nhử, ngăn chặn tự động duyệt trước, luật bám hành vi trước AI agent tấn công.' },
      { code: '8.5', note: 'Lab: cài mồi nhử vào chính lab Wazuh, nối với ngăn chặn tự động có hẹn giờ tự gỡ, đo thời gian từ đòn tới lúc chặn.' },
      { code: '8.6', note: 'Sao lưu bất biến, phát hiện dữ liệu bị đưa ra ngoài, chuẩn bị các quyết định khi bị tống tiền.' },
      { code: '8.7', note: 'Diễn tập ứng phó một chiến dịch có dùng AI, và cách tổ chức một buổi diễn tập cho đơn vị bạn.' },
    ],
  },
  {
    id: 'rap-lai',
    name: 'Ráp thành kế hoạch',
    why: 'Biến mọi thứ ở trên thành việc cụ thể, có thứ tự, cho một doanh nghiệp thật.',
    steps: [
      { code: '8.8', note: 'Kế hoạch 90 ngày cho doanh nghiệp chưa có SOC: việc gì trước, chọn cách giám sát vừa sức, đo và báo cáo.' },
    ],
  },
];
