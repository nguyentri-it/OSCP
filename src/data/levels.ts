export interface Level {
  id: number;
  name: string;
  blurb: string;
  shortBlurb: string;
  tags: string[];
}

// Mỗi mô tả cấp trả lời ba câu: ở cấp này bạn đang đóng vai gì, làm được gì khi học xong,
// và vì sao cấp này cần cho cấp sau.
export const levels: Level[] = [
  {
    id: 0,
    name: 'Khởi động',
    shortBlurb: 'Dựng phòng lab an toàn trên máy cá nhân và nắm vững ranh giới pháp lý trước khi chạm vào công cụ.',
    tags: ['Phòng lab', 'Đạo đức nghề', 'Phương pháp'],
    blurb:
      'Làm quen với nghề kiểm thử xâm nhập (pentest) trước khi chạm vào công cụ nào: ai được phép thử cái gì, và dựng một phòng lab riêng trên máy mình. Có sân tập an toàn này thì mọi lệnh ở các cấp sau mới gõ thử được mà không đụng tới hệ thống của ai.',
  },
  {
    id: 1,
    name: 'Nền tảng',
    shortBlurb: 'Làm chủ dòng lệnh Linux, Windows, mô hình mạng TCP/IP và tự động hóa tác vụ bằng script.',
    tags: ['TCP/IP', 'Linux', 'Windows', 'Scripting'],
    blurb:
      'Bạn đứng trước một cỗ máy lạ và cần đọc được nó: các máy nói chuyện với nhau qua mạng ra sao, cách dùng terminal Linux và Windows, và vài dòng script để khỏi gõ tay việc lặp lại. Phần này chắc thì ở các cấp sau bạn mới hiểu vì sao một lệnh chạy được hay báo lỗi.',
  },
  {
    id: 2,
    name: 'Trung cấp',
    shortBlurb: 'Dò quét cổng, phân tích dịch vụ và khai thác các lỗ hổng Web/Hệ thống để lấy chỗ đứng ban đầu.',
    tags: ['Nmap', 'Web Exploit', 'CVE/CVSS', 'Foothold'],
    blurb:
      'Bước chân đầu tiên vào một hệ thống lạ: tìm ra mục tiêu đang mở cửa nào, chạy dịch vụ gì, rồi tận dụng các điểm yếu phổ biến (lỗi web, mật khẩu yếu, lỗ hổng đã công bố) để lấy được chỗ đứng đầu tiên (foothold) bên trong máy. Chưa có chỗ đứng này thì cấp 3 chưa có gì để leo tiếp.',
  },
  {
    id: 3,
    name: 'Nâng cao',
    shortBlurb: 'Leo quyền root/SYSTEM, bắc cầu qua mạng nội bộ và thâm nhập Active Directory doanh nghiệp.',
    tags: ['Privesc', 'Pivoting', 'Active Directory', 'Evasion'],
    blurb:
      'Bạn đã vào được một máy, giờ đi tiếp: leo lên quyền cao nhất (root hoặc SYSTEM), len từ máy này sang máy khác trong mạng nội bộ, và chiếm Active Directory, hệ thống quản lý tài khoản của cả mạng doanh nghiệp. Đây là phần tách người mới biết công cụ với người biết tự xoay xở khi bị kẹt.',
  },
  {
    id: 4,
    name: 'Ôn thi và nghề nghiệp',
    shortBlurb: 'Chiến thuật phân bổ thời gian trong phòng thi 24h, viết báo cáo chuẩn OffSec và lộ trình luyện lab.',
    tags: ['Viết báo cáo', 'Chiến lược 24h', 'Lộ trình lab'],
    blurb:
      'Kỹ thuật chỉ có giá trị khi đem ra dùng được trong 24 giờ thi và trong công việc thật. Cấp này dạy viết báo cáo mà người đọc làm theo được, chia thời gian giữa các máy khi bị kẹt, và xếp lộ trình luyện lab sau khi học xong.',
  },
  {
    id: 5,
    name: 'Thực chiến tổng hợp',
    shortBlurb: 'Tự tay giải trọn vẹn 3 đề capstone mô phỏng thi thật: máy Linux đơn lẻ, chuỗi miền AD và máy Windows đơn lẻ.',
    tags: ['Capstone Linux', 'Capstone AD', 'Capstone Windows'],
    blurb:
      'Bài tập lớn của cả lộ trình: tự đi trọn một cuộc tấn công từ quét tới báo cáo, một lần trên máy Linux đơn lẻ, một lần trên Active Directory và một lần trên máy Windows đơn lẻ, đúng ba dạng bạn sẽ gặp trong phòng thi. Làm xong bạn biết mình còn hổng ở đâu để quay lại vá.',
  },
  {
    id: 6,
    name: 'AI và mối đe doạ mới',
    shortBlurb: 'Nhận diện các hình thức tấn công mới: lừa đảo tạo bởi AI, deepfake, gián điệp và bảo vệ hệ thống AI.',
    tags: ['AI Threats', 'Deepfake', 'Social Engineering'],
    blurb:
      'Bước ra khỏi đề thi để nhìn mối đe doạ hôm nay: AI giúp kẻ tấn công làm chiêu cũ nhanh hơn, rẻ hơn, thuyết phục hơn (thư lừa đảo, giọng nói và video giả, nhân sự giả, người trong nội bộ), và chính hệ thống AI của doanh nghiệp cũng thành mục tiêu. Hiểu kẻ tấn công đang làm gì thì cấp 7 và 8 mới biết cần chặn và phát hiện cái gì. Ví dụ hay lấy ở ngân hàng, nguyên tắc dùng cho mọi ngành.',
  },
  {
    id: 7,
    name: 'Phòng ngừa',
    shortBlurb: 'Đổi vai sang phòng thủ: vá lỗ hổng theo ưu tiên, cứng hóa OS/AD, siết danh tính và bảo mật Cloud.',
    tags: ['Cứng hóa hệ thống', 'Quản lý lỗ hổng', 'Cloud/SaaS'],
    blurb:
      'Bạn đổi vai sang người bảo vệ: đóng cửa trước khi lắp camera. Mỗi thứ bạn tấn công ở cấp 2–3 được biến thành một việc phải làm: vá lỗ hổng theo thứ tự ưu tiên, cứng hoá AD, Windows và Linux, siết danh tính sau MFA, chặn thư giả, bảo mật đám mây, SaaS và chuỗi cung ứng. Cửa đóng được càng nhiều thì cấp 8 càng ít việc phải chạy theo.',
  },
  {
    id: 8,
    name: 'Phát hiện, phản ứng và phục hồi',
    shortBlurb: 'Triển khai Wazuh/Sysmon, phát hiện xâm nhập tốc độ máy, ứng phó sự cố và phục hồi sau tống tiền.',
    tags: ['SOC & SIEM', 'Lab Wazuh', 'Phục hồi Ransomware'],
    blurb:
      'Cửa nào rồi cũng có lúc bị mở, nên bạn cần biết khi nào có người bước vào, chặn họ ở tốc độ máy, và dựng lại hệ thống nếu bị tống tiền. Cấp này có hai lab tự tay (Wazuh; mồi nhử và ngăn chặn tự động), buổi diễn tập ứng phó, và kế hoạch 90 ngày cho doanh nghiệp chưa có SOC.',
  },
];

export interface Stage {
  id: number;
  name: string;
  levels: number[];
  intro: string;
}

// Ba chặng giúp người mới khỏi ngợp trước 9 cấp: học nền, học tấn công như đề thi, rồi chuyển sang phòng thủ.
export const stages: Stage[] = [
  {
    id: 1,
    name: 'Nền móng',
    levels: [0, 1],
    intro:
      'Hiểu luật chơi, dựng phòng lab an toàn trên máy cá nhân, và nắm cách mạng máy tính, Linux, Windows vận hành trước khi nghĩ tới chuyện "hack". Vội bỏ qua chặng này là lý do phổ biến nhất khiến người mới bị kẹt ở chặng sau.',
  },
  {
    id: 2,
    name: 'Cốt lõi OSCP',
    levels: [2, 3, 4, 5],
    intro:
      'Đi trọn quy trình tấn công một hệ thống từ ngoài vào trong, đúng như đề thi: dò tìm thông tin, khai thác dịch vụ hoặc web để có chỗ đứng đầu tiên, leo lên quyền cao nhất, chiếm mạng Active Directory của doanh nghiệp, rồi chia thời gian trong phòng thi và viết báo cáo đạt chuẩn.',
  },
  {
    id: 3,
    name: 'Mở rộng thực tế và phòng thủ doanh nghiệp',
    levels: [6, 7, 8],
    intro:
      'Đưa kiến thức ra ngoài phòng thi để đối phó với mối đe doạ hiện nay (AI, deepfake, đám mây và SaaS), và đứng ở phía đội phòng thủ (Blue Team, SOC) để bảo vệ một doanh nghiệp thật.',
  },
];
