# Bộ game mẫu tương tác (OSCP)

Tài liệu này ghi nhận các mẫu game/lab tương tác đã kiểm thử ổn định trong dự án để tái sử dụng hoặc nhân bản cho các bài học tiếp theo.

## Mẫu 1: Mô phỏng 2 máy & luồng mạng (`DualMachineLab`)

- **Thành phần chuẩn:** `src/components/sim/DualMachineLab.tsx`
- **Trang mẫu thử:** `/mau-thu-hai-may/` (`src/pages/mau-thu-hai-may.astro`)
- **Bài học đã áp dụng:** **Bài 2.7 — Shell, truyền file và nâng cấp TTY** (`src/content/lessons/2-7-shell-truyen-file.mdx`)
- **CSS dùng chung:** `src/styles/sim.css` (`.gba-*`, `.crt-*`, `.dual-*`)

### Bố cục chuẩn (vừa khung 1280×720 khi mở toàn màn hình)

1. **Thẻ thu gọn trong bài học:** giới thiệu ngắn + nút `▶ CHƠI LAB TOÀN MÀN HÌNH` + ảnh thu nhỏ sân khấu bấm để mở.
2. **Sân khấu mạng SVG (trên-trái):** hai trạm (`KALI 10.10.14.7` ↔ `UFW` ↔ `UBUNTU 10.10.14.30`), thanh gói tin phản ánh đúng chiều đi/về/bị chặn, trạng thái tường lửa, đường hầm kết nối khi chiếm quyền và hậu quả trực quan trên máy đích.
3. **Bảng điều khiển & nhiệm vụ (trên-phải):**
   - Trước khi mở terminal: giải thích bối cảnh chiến dịch tổng quan.
   - Khi mở 1 hoặc 2 màn hình: liệt kê bảng nhiệm vụ cụ thể kèm hướng dẫn rõ làm gì ở máy nào.
   - Hàng nút chuyển chế độ xem (`KALI`, `UBUNTU`, `CẢ 2`, `UFW`, `LÀM LẠI`, `THOÁT`).
4. **Cụm màn hình dòng lệnh bên dưới:** dùng thuần túy để gõ lệnh thật hoặc bấm nút lệnh gợi ý; hỗ trợ tách 1 màn, 2 màn song song, hoặc bảng rule/log UFW; đổi sang màn hình cảnh báo đỏ khi máy đích bị thực thi payload hậu quả.

### Tiêu chí thiết kế cần giữ khi nhân bản mẫu này

- **Ngôn ngữ tự nhiên kiểu game:** diễn đạt rõ hành động và kết quả thực tế (ai quét ai, cổng nào mở, kết nối đi chiều nào), tránh chữ kỹ thuật khô khan thiếu ngữ cảnh.
- **Giữ bí mật phong cách đồ họa:** không nhắc tên hệ máy hay phong cách cổ điển trong văn bản hiển thị ra màn hình.
- **Vừa khung nhìn desktop 1280×720:** không tạo thanh cuộn ngoài ở chế độ toàn màn hình; không để chữ trên SVG hoặc nhãn tiêu đề terminal bị cắt ngang.

### Ý tưởng bài học phù hợp để mở rộng từ Mẫu 1

- **Bài 3.3 / 3.9 — Pivoting & Tunneling:** 3 điểm (Kali ↔ Jump Host ↔ Internal Host) với đường hầm SSH/Chisel.
- **Bài 3.5 — Active Directory:** Workstation ↔ Domain Controller với luồng lấy vé Kerberos / DCSync.
- **Bài 8.3 / 8.4 — Wazuh, Sysmon & Phòng thủ tốc độ máy:** Attacker ↔ Mục tiêu ↔ Trung tâm cảnh báo SOC/Wazuh tự động chặn IP.

> Ghi chú: Dạng game giải đố cú pháp (như Web SQLi) được tách riêng và sẽ thiết kế lại trong đợt sau.
