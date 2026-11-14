# Bộ game mẫu tương tác (OSCP)

Tài liệu này ghi nhận các quy định chung và mẫu game/lab tương tác đã kiểm thử ổn định trong dự án để tái sử dụng hoặc nhân bản cho các bài học tiếp theo.

## Quy định chung cho mọi mẫu game

Mọi game/lab tương tác nhúng trong bài học đều tuân theo một mẫu khung chuẩn:

1. **Thẻ thu gọn trong bài học (`.sim.dual-launcher`):** hiển thị phần giới thiệu ngắn (`<SimHow>`), nút `▶ CHƠI LAB TOÀN MÀN HÌNH` và khung xem trước sân khấu có thể bấm trực tiếp để mở.
2. **Mở toàn màn hình (`isFullscreen`):** mọi game đều chơi trong chế độ toàn màn hình (`position: fixed; inset: 0`), khóa cuộn trang nền (`document.body.style.overflow = 'hidden'`), hỗ trợ thoát nhanh bằng nút `✕ THOÁT` hoặc phím `Escape`.
3. **Vừa khung nhìn desktop 1280×720:** không tạo thanh cuộn ngoài ở chế độ toàn màn hình; chữ trên canvas/SVG và nhãn điều khiển không bị cắt ngang.
4. **Ngôn ngữ tự nhiên & giữ bí mật phong cách đồ họa:** diễn đạt rõ hành động và cơ chế thực tế; không nhắc tên hệ máy hay phong cách cổ điển trong văn bản hiển thị ra màn hình.

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

## Mẫu 2: Bản đồ luồng & Cận cảnh cơ chế (`PrivescOverworldLab`)

- **Thành phần chuẩn:** `src/components/sim/PrivescOverworldLab.tsx`
- **Bài học đã áp dụng:** **Bài 3.1 — Leo thang đặc quyền Linux** (`src/content/lessons/3-1-privesc-linux.mdx`)
- **CSS dùng chung:** `src/styles/sim.css` (`.dual-launcher`, `.gba-btn*`, `.ow-preview-canvas`, `.ow-fs-*`)

### Bố cục chuẩn (vừa khung 1280×720 khi mở toàn màn hình)

1. **Thẻ thu gọn trong bài học:** giới thiệu ngắn + nút `▶ CHƠI LAB TOÀN MÀN HÌNH` + khung canvas xem trước bản đồ luồng 5 hướng leo quyền (bấm để mở toàn màn hình).
2. **Thanh điều khiển trên cùng (`.ow-fs-bar`):** 5 nút chọn hướng khai thác (`1. Sudo`..`5. Docker`), tùy chọn lọc (`Chỉ #4 hở`), nút `⏸ Tạm dừng` / `▶ Tiếp tục`, `↻ Chạy cả 3 bước` và `✕ THOÁT`.
3. **Sân khấu chia 2 vùng (`minmax(0, 1fr)`):**
   - **Trái — Bản đồ Overworld:** user thường đi qua các chốt kiểm tra tới mục tiêu `root (UID 0)` tùy trạng thái mở/khóa.
   - **Phải — Cận cảnh cơ chế 3 bước:** mô phỏng trực quan cách lỗ hổng thực sự leo thang (ví dụ: `sudo find -exec /bin/sh`, `SUID` giữ `EUID=0` qua `sh -p`, `cron` chạy file ghi được, `Capabilities` `cap_setuid+ep` gọi `os.setuid(0)`, `docker` gắn `/` vào container).
4. **Thanh bước & thuyết minh phía dưới (`.ow-fs-bottom`):** 3 thẻ bước `① ② ③` kèm thanh tiến trình, lệnh đang chạy và dòng giải thích tiếng Việt dễ hiểu.

> Ghi chú: Dạng game giải đố cú pháp (như Web SQLi) được tách riêng và sẽ thiết kế lại trong đợt sau.
