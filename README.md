# OSCP — Học bảo mật từ đầu

Một website tiếng Việt dạy kiến thức bảo mật theo hướng chứng chỉ OSCP, đi từ con số 0 tới nâng cao. Mỗi bài giải thích bằng ví dụ đời thường trước, rồi tới kiến thức, kèm sơ đồ hoặc mô phỏng tương tác chạy ngay trong trình duyệt.

## 🌐 Truy cập website

**👉 https://nguyentri-it.github.io/OSCP/**

Mở trực tiếp trên trình duyệt (máy tính hoặc điện thoại), không cần cài gì. Một vài điểm vào nhanh:

| Trang | Đường dẫn |
|---|---|
| Trang chủ | <https://nguyentri-it.github.io/OSCP/> |
| Lộ trình 52 bài | <https://nguyentri-it.github.io/OSCP/lo-trinh/> |
| Nhánh phòng thủ (cho người bảo vệ doanh nghiệp) | <https://nguyentri-it.github.io/OSCP/phong-thu/> |
| Từ điển thuật ngữ | <https://nguyentri-it.github.io/OSCP/thuat-ngu/> |
| Quy tắc đạo đức | <https://nguyentri-it.github.io/OSCP/quy-tac/> |
| Bài đầu tiên (0.1) | <https://nguyentri-it.github.io/OSCP/bai/0-1-pentest-la-gi/> |

> Trang được đăng tự động bằng GitHub Pages. Nếu vừa cập nhật mà chưa thấy đổi, chờ 1–2 phút rồi tải lại trang (hoặc mở ở chế độ ẩn danh để bỏ qua cache).

> **Về đạo đức và pháp lý:** tài liệu này để học cách hệ thống bị tấn công và cách bảo vệ nó. Chỉ thực hành trong lab của chính bạn hoặc nơi bạn được cho phép bằng văn bản. Mọi mô phỏng trên trang chạy hoàn toàn trong trình duyệt với dữ liệu giả, không kết nối tới hệ thống thật nào. Đọc trang **Quy tắc** trước khi học.

## Nội dung

52 bài, chia 9 cấp:

- **Cấp 0 — Khởi động:** pentest là gì, dựng lab an toàn (kèm máy mục tiêu cụ thể cho từng cấp: Metasploitable 2, DVWA, Juice Shop, Windows bản đánh giá), tư duy và phương pháp.
- **Cấp 1 — Nền tảng:** mạng (OSI, IP, subnet, TCP/UDP), DNS/HTTP, Linux, Windows, scripting. Mỗi bài có phần bài tập tự làm trên lab, kèm gợi ý và đáp án thu gọn.
- **Cấp 2 — Trung cấp:** thu thập thông tin, dò quét và liệt kê, lỗ hổng web (cơ bản và nâng cao: upload, traversal, LFI/RFI), kỹ thuật xã hội, CVE/CVSS, mật khẩu, shell và truyền file, bảo mật đám mây AWS.
- **Cấp 3 — Nâng cao:** leo thang đặc quyền (Linux & Windows), pivoting, Active Directory, bộ nhớ chương trình, chỉnh sửa exploit và Metasploit, né tránh phát hiện, di chuyển ngang và tunneling nâng cao.
- **Cấp 4 — Ôn thi và nghề nghiệp:** viết báo cáo, chiến lược thi, lộ trình luyện lab.
- **Cấp 5 — Thực chiến tổng hợp:** ba bài capstone đi trọn một cuộc tấn công từ quét tới báo cáo — một máy Linux đơn, một chuỗi Active Directory, và một máy Windows đơn — ráp mọi kỹ thuật ở các cấp trước vào một mạch.
- **Cấp 6 — AI và mối đe doạ mới** (mở rộng, ngoài đề thi OSCP): AI làm chiêu cũ nhanh, rẻ và thuyết phục hơn ra sao, vì sao doanh nghiệp nhỏ cũng bị nhắm; chống gian lận và mạo danh deepfake; nhân sự giả qua phỏng vấn video và mối đe doạ nội bộ; bảo vệ chính hệ thống AI của doanh nghiệp (OWASP Top 10 cho LLM và cho agent, MCP, shadow AI).
- **Cấp 7 — Phòng ngừa:** quản lý lỗ hổng và vá khẩn (KEV, EPSS, thiết bị biên, vá ảo); hardening AD, Windows và Linux theo baseline (phân tầng quản trị, LAPS, SMB signing, tắt LLMNR, giảm NTLM, Credential Guard, luật ASR, chặn ClickFix, SSH và sudo, đo bằng PingCastle và Lynis); danh tính sau MFA; help desk và khôi phục tài khoản; SPF, DKIM, DMARC và tên miền nhái; Microsoft 365, Google Workspace, Azure, GCP và chiêu LLMjacking; chuỗi cung ứng phần mềm, CI/CD, container và Kubernetes.
- **Cấp 8 — Phát hiện, phản ứng và phục hồi:** SOC và SIEM có AI (kèm luật Sigma cho Kerberoasting, DCSync); bản đồ phát hiện cho mọi kỹ thuật ở Cấp 2–3; lab Wazuh và Sysmon tự ra đòn, tự đọc log; phòng thủ ở tốc độ máy trước tấn công do AI agent điều phối (mồi nhử, ngăn chặn tự động duyệt trước); lab cài mồi nhử và nối với chặn tự động có hẹn giờ tự gỡ; phục hồi trước tống tiền (sao lưu bất biến, phát hiện dữ liệu bị đưa ra ngoài); diễn tập ứng phó; và kế hoạch 90 ngày cho doanh nghiệp chưa có SOC.

**Nhánh phòng thủ:** người muốn bảo vệ doanh nghiệp chứ không thi OSCP có thể đi theo trang `/phong-thu/`: 35 bài bắt buộc và 7 bài tuỳ chọn, xếp theo sáu chặng (nền tảng, hiểu đòn để đỡ, mối đe doạ mới, phòng ngừa, phát hiện và phục hồi, ráp thành kế hoạch) và kết thúc bằng kế hoạch 90 ngày. Thứ tự nằm trong `src/data/defense-track.ts`.

Mỗi bài có phần thực hành với lệnh và output mẫu thật (nmap, enum4linux, hashcat, impacket, BloodHound...), payload minh hoạ, và góc phòng thủ. Mọi mô phỏng chạy trong trình duyệt với dữ liệu giả; các kỹ thuật tấn công trình bày để hiểu cơ chế và cách phòng, chỉ thực hành trong lab.

## Trải nghiệm học trong mỗi bài

- **Chia pha học:** thân bài tự tách thành các pha Mở bài → Hình dung → Lý thuyết → Thực hành & Lab → Phòng thủ → Kiểm tra, mỗi pha có một câu gợi ý cách đọc. Thanh pha dính trên đầu trang cho phép lọc xem từng pha, kèm chế độ **Từng chặng** (nút trước/sau) để học từng phần một, và tiến độ đọc trong từng pha.
- **Định hướng:** mục lục tự sinh có tô sáng mục đang đọc, thanh tiến độ đọc, vị trí bài trong cấp, danh sách bài nên học trước và câu hỏi nhắc lại kiến thức của các bài đó.
- **Sơ đồ và mô phỏng:** sơ đồ kiến trúc (`ConceptMap`, `SequenceDiagram`, `DecisionTree`) và gần 30 mô phỏng tương tác dùng lại được giữa các bài (terminal giả lập, dựng lệnh nmap, tính CVSS, lab AD, pivoting, phân loại vá, chặn tấn công tự động...).
- **Lab tự làm:** khung `LabBrief` ở mọi bài Cấp 2–3 và nhiều bài khác (24 bài) — sơ đồ mạng, mục tiêu, thời gian, điều kiện xong, gợi ý ba bậc và phần tự đối chiếu. Cuối mỗi cấp có **thử thách cấp** và danh sách tự đánh giá trước khi sang cấp sau.
- **Khối lệnh:** mỗi lệnh có nơi gõ, mục đích, giải nghĩa và cách đọc output; nút chép chỉ chép dòng lệnh, kết quả quan trọng được đánh dấu, giá trị mẫu (IP, tên miền) gạch chân để biết cần thay. Cuối bài có thẻ gom toàn bộ lệnh.
- **Dễ đọc:** đoạn mở bài giới hạn khoảng 65 ký tự mỗi dòng, phần Kiểm tra nhanh hiện dạng thẻ quiz có lời giải thích, giao diện sáng/tối và đọc tốt trên điện thoại.

## Công nghệ

- [Astro](https://astro.build) + MDX cho nội dung
- React cho các thành phần tương tác (mô phỏng, quiz, sơ đồ)
- SVG tự vẽ cho sơ đồ, không phụ thuộc thư viện đồ hoạ nặng
- Trang tĩnh, triển khai trên GitHub Pages

## Chạy ở máy

```bash
npm install
npm run dev
```

Mở địa chỉ mà terminal in ra (thường là `http://localhost:4321/OSCP`).

## Kiểm tra và build

```bash
npm run check:content   # kiểm tra nội dung: đủ 52 bài, không trùng mã, import đúng, link "bài x.y" tồn tại, cảnh báo đoạn chữ quá dài
npm run check:diagrams  # kiểm tra mọi sơ đồ theo tiêu chí hiển thị: ô không đè nhau, chữ vừa ô, đường nối không cắt qua ô
npm run build           # tự chạy hai bước kiểm tra trên rồi build ra thư mục dist/
```

Tiêu chí hiển thị sơ đồ nằm trong [CONTRIBUTING.md](CONTRIBUTING.md#tiêu-chí-hiển-thị-sơ-đồ).

## Triển khai (GitHub Pages)

Trang đang chạy tại **https://nguyentri-it.github.io/OSCP/**.

Cách hoạt động: mỗi lần đẩy lên nhánh `main`, GitHub Actions tự build và đăng lên GitHub Pages (xem `.github/workflows/deploy.yml`). Nguồn Pages đã đặt là **GitHub Actions** (trong Settings → Pages của repository).

Lần đầu bật thủ công (nếu dựng một bản mới): vào **Settings → Pages → Build and deployment → Source → GitHub Actions**.

Trang được cấu hình cho địa chỉ `https://<tài-khoản>.github.io/OSCP/` qua `site` và `base` trong `astro.config.mjs`. Nếu đổi tên tài khoản hoặc repository, sửa hai giá trị này cho khớp.

## Thêm hoặc sửa bài

Mỗi bài là một file `.mdx` trong `src/content/lessons/`, có phần frontmatter mô tả. Trường `updated` (YYYY-MM-DD) hiện thành ngày cập nhật trên trang bài; nhớ sửa nó khi đổi nội dung, nhất là các bài về mối đe doạ AI. Khi đổi mã hay đường dẫn một bài đã đăng, thêm đường dẫn cũ vào `movedLessons` trong `astro.config.mjs` để link cũ vẫn chạy. Các thành phần tương tác nằm trong `src/components/sim/` và dùng được lại giữa các bài.

Quy tắc viết bài (khung bài, `<Lenh>`, 14 tiêu chí dễ tiếp thu) nằm trong [CONTRIBUTING.md](CONTRIBUTING.md).

## Việc còn mở

- Capstone 5.3 mới có lời giải từng bước, chưa có terminal giả lập tự gõ như bài 5.1.
- Một số lệnh mới viết theo cú pháp công cụ, chưa chạy lại trên lab thật để đối chiếu từng dòng output.
- Quy định thi OSCP đổi thường xuyên: vài tháng một lần đọc lại hướng dẫn thi của OffSec và sửa bài 4.2.

## Bảo trì

Kho lưu trữ được duy trì bởi [@nguyentri-it](https://github.com/nguyentri-it). Xem [CONTRIBUTING.md](CONTRIBUTING.md) nếu bạn muốn đóng góp hoặc sửa bài.

## Giấy phép

Xem [LICENSE](LICENSE). Đây là tài liệu học tập phi lợi nhuận. OSCP là chứng chỉ của OffSec; dự án này không liên kết với OffSec.
