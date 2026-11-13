// Cổng cuối mỗi cấp: một thử thách tổng hợp không kèm hướng dẫn, và danh sách việc phải tự làm được
// trước khi sang cấp sau. Hiện ở trang Lộ trình và ở cuối bài cuối cùng của mỗi cấp.
export interface LevelGate {
  level: number;
  challenge: string;
  target: string;
  done: string;
  ready: string[];
}

export const levelGates: LevelGate[] = [
  {
    level: 0,
    challenge:
      'Tắt hết máy ảo, rồi dựng lại phòng lab từ trạng thái tắt mà không mở bài 0.2: bật Kali và một máy mục tiêu, chứng minh hai máy thấy nhau và máy mục tiêu không ra được Internet.',
    target: 'Kali và Metasploitable 2',
    done: 'Kali ping được máy mục tiêu; từ máy mục tiêu ping 8.8.8.8 không có phản hồi; bạn có một snapshot sạch của mỗi máy.',
    ready: [
      'Tôi nói được việc nào hợp pháp, việc nào không, và cần giấy phép gì trước khi thử',
      'Tôi dựng lại được mạng lab cô lập mà không cần xem hướng dẫn',
      'Tôi quay về snapshot sạch sau khi làm hỏng một máy',
      'Tôi có một mẫu ghi chú và dùng nó cho mỗi máy',
    ],
  },
  {
    level: 1,
    challenge:
      'Chỉ dùng lệnh có sẵn và một script do bạn tự viết (không dùng nmap), tìm xem máy mục tiêu mở những cổng TCP nào trong khoảng 1 đến 1024, rồi đăng nhập SSH vào và liệt kê mọi file có bit SUID.',
    target: 'Metasploitable 2 (10.10.14.20), tài khoản msfadmin',
    done: 'Script in ra đúng các cổng mở (đối chiếu lại bằng nmap sau khi xong), và bạn có danh sách file SUID kèm giải thích vì sao bit đó đáng chú ý.',
    ready: [
      'Tôi tính được dải địa chỉ của một subnet và nói được máy nào cùng mạng với máy nào',
      'Tôi giải thích được bắt tay ba bước và vì sao cổng đóng trả lời khác cổng bị lọc',
      'Tôi dùng được dig và curl để hỏi DNS và đọc header HTTP',
      'Tôi tìm file, lọc nội dung và đọc quyền trên Linux bằng dòng lệnh',
      'Tôi liệt kê người dùng, dịch vụ và quyền trên Windows bằng dòng lệnh',
      'Tôi viết được một script ngắn lặp qua một danh sách và xử lý kết quả',
    ],
  },
  {
    level: 2,
    challenge:
      'Bắt đầu chỉ với địa chỉ IP của máy mục tiêu, không dùng tài khoản nào bạn đã biết trước: lấy một shell trên máy bằng hai đường vào khác nhau (một qua dịch vụ mạng, một qua ứng dụng web), mỗi đường ghi lại thành một mục phát hiện.',
    target: 'Metasploitable 2 (10.10.14.20)',
    done: 'Hai shell từ hai lỗ hổng khác nhau, mỗi cái có ảnh chụp lệnh id và địa chỉ IP, kèm số CVE hoặc tên lỗi và cách khắc phục.',
    ready: [
      'Tôi quét đủ cổng và liệt kê từng dịch vụ mà không bỏ sót cái nào',
      'Tôi đi từ một số phiên bản tới CVE và mã khai thác phù hợp',
      'Tôi khai thác SQL injection bằng tay, không cần sqlmap',
      'Tôi biến một lỗi tải file hoặc LFI thành chạy lệnh',
      'Tôi bẻ được một hash và biết khi nào nên thử trực tuyến',
      'Tôi lấy reverse shell, nâng TTY và chuyển file theo cả hai chiều',
    ],
  },
  {
    level: 3,
    challenge:
      'Trong lab Active Directory của bạn, bắt đầu bằng một tài khoản domain thường: lấy quyền quản trị trên máy trạm, rồi đi tới Domain Controller và rút được hash của krbtgt. Không dùng Metasploit.',
    target: 'Lab AD tự dựng (một Domain Controller, một máy trạm)',
    done: 'Bạn có hash krbtgt, một sơ đồ BloodHound của đường đã đi, và với mỗi bước ghi được sự kiện Windows nào đã sinh ra trên máy đích.',
    ready: [
      'Tôi leo quyền trên Linux bằng ít nhất ba dạng khác nhau',
      'Tôi leo quyền trên Windows bằng dịch vụ cấu hình sai và bằng SeImpersonate',
      'Tôi dựng được tunnel để chạm tới một dịch vụ không mở ra ngoài',
      'Tôi liệt kê một domain và đọc được đường đi trong BloodHound',
      'Tôi làm được Kerberoasting, Pass-the-Hash và DCSync trong lab',
      'Tôi sửa được một mã khai thác công khai cho khớp với mục tiêu của mình',
    ],
  },
  {
    level: 4,
    challenge:
      'Làm một buổi thi thử: chọn ba máy đơn và một cụm AD từ danh sách ở bài 4.3, đặt đồng hồ 23 giờ 45 phút, không dùng AI, không dùng sqlmap, Metasploit tối đa một máy. Sau đó viết báo cáo trong 24 giờ.',
    target: 'Máy luyện trên nền tảng hợp pháp bạn đã đăng ký',
    done: 'Một báo cáo hoàn chỉnh có ảnh bằng chứng đúng yêu cầu cho mỗi mã, và bảng tự chấm điểm theo cách tính ở bài 4.2.',
    ready: [
      'Tôi viết một mục phát hiện mà người khác làm theo tái hiện được',
      'Tôi thuộc các công cụ bị cấm và yêu cầu ảnh bằng chứng',
      'Tôi có bảng tra nhanh do chính mình viết',
      'Tôi giữ được mốc thời gian cho mỗi máy và biết lúc nào nên đổi máy',
    ],
  },
  {
    level: 5,
    challenge:
      'Chọn một máy bạn chưa từng làm trên nền tảng luyện tập, không đọc lời giải. Chiếm trọn máy và nộp cho chính mình một báo cáo. Lặp lại cho đủ ba dạng: Linux đơn, Windows đơn, cụm AD.',
    target: 'Ba máy chưa làm, mỗi dạng một máy',
    done: 'Ba báo cáo, mỗi báo cáo ghi rõ chỗ bạn bế tắc lâu nhất và điều đã gỡ được nó.',
    ready: [
      'Tôi chiếm được một máy Linux đơn mà không cần gợi ý',
      'Tôi chiếm được một máy Windows đơn mà không cần gợi ý',
      'Tôi đi trọn một cụm AD từ một tài khoản thường',
      'Tôi xử lý được khi công cụ đầu tiên không chạy',
    ],
  },
  {
    level: 6,
    challenge:
      'Chọn một quy trình có thật ở nơi bạn làm hoặc học (duyệt chuyển tiền, cấp lại mật khẩu, tuyển người từ xa). Viết một trang mô tả kẻ tấn công dùng AI sẽ nhắm vào bước nào, và một bước xác minh ngoài kênh để chặn nó.',
    target: 'Một quy trình thật, làm trên giấy',
    done: 'Một trang có sơ đồ quy trình, điểm yếu được đánh dấu, và quy tắc xác minh mà người không rành kỹ thuật làm theo được.',
    ready: [
      'Tôi giải thích được AI làm chiêu lừa cũ rẻ và nhanh hơn ra sao',
      'Tôi nêu được ba dấu hiệu của một cuộc gọi hoặc video giả',
      'Tôi biết các rủi ro riêng của một hệ thống AI trong doanh nghiệp',
    ],
  },
  {
    level: 7,
    challenge:
      'Chạy một công cụ đo cấu hình trên lab của bạn (Lynis cho Linux, PingCastle cho AD), sửa năm phát hiện nặng nhất, rồi chạy lại để thấy điểm thay đổi.',
    target: 'Lab của bạn: một máy Linux và lab AD',
    done: 'Hai bản kết quả trước và sau, cùng ghi chú mỗi thay đổi chặn kỹ thuật tấn công nào ở Cấp 2 và 3.',
    ready: [
      'Tôi xếp được thứ tự vá theo mức bị khai thác thật chứ không chỉ theo điểm CVSS',
      'Tôi cứng hoá được một máy Windows, một máy Linux và một domain theo baseline',
      'Tôi cấu hình và kiểm tra được SPF, DKIM, DMARC',
      'Tôi nêu được các điểm cần siết trên một tài khoản đám mây hoặc SaaS',
    ],
  },
  {
    level: 8,
    challenge:
      'Trên lab Wazuh của bạn, tự ra ba đòn đã học ở Cấp 2 và 3, rồi tìm cảnh báo tương ứng. Với đòn nào không có cảnh báo, viết luật phát hiện cho nó.',
    target: 'Lab Wazuh và Sysmon ở bài 8.3',
    done: 'Ba đòn đều có cảnh báo, kèm thời gian từ lúc ra đòn tới lúc cảnh báo hiện, và một trang kế hoạch 90 ngày cho một doanh nghiệp cụ thể.',
    ready: [
      'Tôi đọc được log và nối một cảnh báo với kỹ thuật tấn công đã gây ra nó',
      'Tôi đặt được mồi nhử và một hành động ngăn chặn tự động có hẹn giờ gỡ',
      'Tôi kiểm tra được một bản sao lưu có khôi phục được hay không',
      'Tôi điều phối được một buổi diễn tập ứng phó trên giấy',
    ],
  },
];
