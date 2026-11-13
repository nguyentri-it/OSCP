# Góp phần

Cảm ơn bạn muốn đóng góp cho dự án.

## Nguyên tắc nội dung

1. **Cho người mới.** Bắt đầu bằng ví dụ đời thường, rồi mới tới thuật ngữ. Tránh viết như tài liệu kỹ thuật khô khan.
2. **Có đạo đức.** Mọi bài phải có phần "Góc phòng thủ". Các kỹ thuật tấn công trình bày ở mức giúp hiểu cơ chế và cách phòng, không phải hướng dẫn từng bước để gây hại. Mọi mô phỏng chạy trong trình duyệt với dữ liệu giả.
3. **Ngắn gọn, không nhồi nhét.** Mỗi bài tập trung vài ý chính. Thà ít mà rõ còn hơn nhiều mà rối.
4. **Sơ đồ phục vụ việc hiểu.** Chỉ thêm sơ đồ hoặc mô phỏng khi nó làm rõ cơ chế, không thêm cho đẹp.

## Cấu trúc một bài

Mỗi file `.mdx` trong `src/content/lessons/` theo mẫu:

- Frontmatter: `title`, `code` (dạng `N.N`), `level`, `summary`, `duration`, `objectives`, và `updated` (dạng `YYYY-MM-DD`, ngày sửa nội dung gần nhất).
- Nhắc tới bài khác bằng "bài x.y". `npm run check:content` báo lỗi nếu mã đó không tồn tại.
- Đổi mã hoặc đường dẫn một bài đã đăng: thêm đường dẫn cũ vào `movedLessons` trong `astro.config.mjs`.
- Thêm hoặc sửa sơ đồ (`ConceptMap`, `SequenceDiagram`): phải đạt **Tiêu chí hiển thị sơ đồ** bên dưới. `npm run check:diagrams` (tự chạy trong `npm run build`) kiểm tra toàn bộ.
- Dùng từ gốc tiếng Anh khi bản dịch tiếng Việt khó hiểu (hardening, baseline, agent, audit...), kèm một câu giải thích ở lần nhắc đầu tiên.
- Thân bài: Hình dung trước → Kiến thức chính → Mô phỏng/Sơ đồ → Góc phòng thủ → Lỗi người mới hay gặp → Kiểm tra nhanh → Ghi nhớ.
- **Mọi lệnh thật đưa cho người học gõ phải có bối cảnh, không chỉ lệnh và output trần.** Bọc khối `<Terminal>` trong `<Lenh>` (`src/components/ui/Lenh.astro`):
  - `noi`: chạy ở đâu (máy nào, cửa sổ nào) và cần quyền gì (`quyen`, nếu không hiển nhiên).
  - `muc`: một câu nói lệnh này để làm gì — người học cần biết lý do trước khi gõ.
  - `slot="giai"` (**Giải nghĩa lệnh**): từng phần của lệnh/cờ nghĩa là gì.
  - `slot="doc"` (**Đọc output**): dòng nào quan trọng, dòng nào bình thường, lỗi hay gặp nghĩa là gì.
  - Bài [0-2-dung-lab.mdx](src/content/lessons/0-2-dung-lab.mdx) hoặc [2-2-do-quet-liet-ke.mdx](src/content/lessons/2-2-do-quet-liet-ke.mdx) là ví dụ mẫu.
  - Nội dung trong `<Terminal>` luôn đặt trong khối ```` ```text ```` (xem `Terminal.astro`): MDX sẽ không biến dòng bắt đầu bằng `#` thành tiêu đề, không tự đổi `"..."` hay dấu nháy thẳng thành ký tự "đẹp" — điều này làm hỏng lệnh khi người học chép lại.
  - Với `EnumExplorer` và `Walkthrough` (lệnh tương tác, bấm để xem), thêm mảng `explain: [...]` cho mỗi mục có `cmd` thật (cú pháp CLI), không cần cho các bước chỉ là mô tả hành động bằng tiếng Việt (ví dụ kịch bản SOC ở bài 8.7).
  - Không cần `<Lenh>` cho khối chỉ là mẫu ghi chú, bảng tham khảo, hay sơ đồ ASCII không phải lệnh thật để gõ.

## 14 tiêu chí dễ tiếp thu

Mỗi bài mới hoặc bài sửa lớn nên qua được cả hai nhóm dưới đây.

**Từ tổng quan tới chi tiết**

1. Lộ trình: người học biết mình đang ở đâu trong cả khoá và bài kế tiếp là bài nào (thanh tiến độ, "Bài x trên y", nút học tiếp).
2. Cấp: mô tả cấp nói rõ học xong làm được gì và vì sao cần cho cấp sau (`src/data/levels.ts`).
3. Đầu bài: có tóm tắt một câu, thời lượng, mục tiêu, và trường `prereq` ghi các bài nên học trước.
4. Khung bài: đủ thứ tự Hình dung trước → Kiến thức chính → Thực hành → Góc phòng thủ → Lỗi hay gặp → Kiểm tra nhanh → Ghi nhớ; đề mục đặt tên theo nội dung để mục lục tự sinh đọc được.
5. Mỗi mục: một ý chính, nói vì sao trước khi nói gõ gì, và nối sang mục sau.
6. Mỗi lệnh: bọc trong `<Lenh>` với nơi gõ, mục đích, giải nghĩa và cách đọc output.
7. Mỗi thuật ngữ: giải thích ở lần đầu xuất hiện, hoặc dùng `<Term>`.

**Từ nội dung tới hình ảnh**

8. Câu chữ: đoạn văn thường không quá khoảng 75 từ, ô ghi chú không quá khoảng 110 từ mỗi đoạn; dài hơn thì tách.
9. Ví dụ: dùng cùng một bối cảnh xuyên bài (megacorp.lab, dải 10.10.14.x) để người học không phải dựng lại hình dung.
10. Tự làm: mỗi bài có ít nhất một hoạt động tương tác ngoài quiz, hoặc một bài tập trên lab.
11. Phản hồi: mỗi câu quiz có lời giải thích; bài có nút đánh dấu đã học.
12. Sơ đồ: mỗi quy trình nhiều bước hoặc quan hệ nhiều bên có một sơ đồ (`ConceptMap`, `SequenceDiagram`, `DecisionTree`).
13. Bảng và lệnh: đọc được trên điện thoại; bảng rộng thì cuộn ngang, lệnh không bị bẻ giữa từ.
14. Thị giác: chỉ dùng màu và kiểu ô có sẵn (ghi chú, cẩn thận, phòng thủ), mỗi màu một nghĩa; kiểm tra cả giao diện sáng và tối.

## Tiêu chí hiển thị sơ đồ

Áp dụng cho mọi `ConceptMap` và `SequenceDiagram`. `scripts/check-diagrams.mjs` đọc toạ độ trong file bài, dựng lại hình bằng đúng các hàm vẽ của component (`src/lib/diagram-layout.js`) và báo lỗi nếu vi phạm điều nào dưới đây. Build dừng khi có lỗi. Đơn vị là px trong khung `width × height` của sơ đồ.

**Nội dung**

1. Sơ đồ khớp tiêu đề: tiêu đề nói "5 hướng" thì có đủ 5 ô; mỗi ô có phần giải thích (`detail`).
2. Mỗi ô một ý: nhãn ngắn (tối đa 2 dòng, tự xuống dòng), dòng phụ (`sub`) là lệnh hoặc ví dụ ngắn. Ô tự nới rộng theo chữ, nên chữ dài sẽ đẩy ô to ra và có thể làm hỏng bố cục: rút gọn chữ trước khi nới khung.
3. Chỉ dùng `tone` có sẵn: `accent`, `warn`, `bad`, `good`, `muted`.

**Bố cục**

4. Khung: ô cách mép khung ít nhất 8px. Khung rộng tối đa 760; rộng hơn thì chữ bị thu quá nhỏ, nên tách thành hai sơ đồ.
5. Ô không đè nhau: hai ô bất kỳ cách nhau ít nhất 14px.
6. Vùng (`zones`): ô nằm gọn trong vùng chứa tâm của nó, cách viền vùng ít nhất 8px, không ô nào vắt qua viền vùng. Tên vùng nằm gọn trong vùng và không bị ô hay đường nối che. Vùng không đè lên nhau (trừ khi lồng hẳn vào nhau).
7. Đường nối: không cắt ngang ô nào ngoài hai ô ở hai đầu, không cắt qua tên vùng hay nhãn của đường nối khác, và dài ít nhất 22px để thấy mũi tên. Một ô nối tới nhiều ô xếp thành cột dễ làm đường nối cắt qua ô giữa; xếp các ô đích thành một hàng ngang (như sơ đồ bài 3.1) thì đường nối toả ra không cắt nhau.
8. Nhãn đường nối: ngắn hơn đường nối ít nhất 16px, không đè lên ô, tên vùng hay nhãn khác. Đường có nhãn cần hai ô cách nhau xa hơn (khoảng 90–140px tuỳ độ dài nhãn).
9. Sơ đồ tuần tự: tên vai vừa ô, nhãn mũi tên không dài hơn mũi tên, nhãn bước tự xử lý vừa ô 160px.

**Hiển thị**

10. Chữ trên điện thoại: sơ đồ giữ bề rộng tối thiểu 560px và cho cuộn ngang, để chữ không bị thu dưới khoảng 10px.
11. Kiểm tra cả giao diện sáng và tối; màu chỉ lấy từ biến CSS có sẵn.

Sửa sơ đồ: `node scripts/check-diagrams.mjs --dump <file>.mdx` in toạ độ và kích thước thật của từng ô (sau khi tự nới theo chữ) để biết cần dời ô nào bao nhiêu. Muốn đo chữ thật trên trình duyệt, mở trang bài, dán `scripts/check-diagrams-browser.js` vào console rồi chạy `await kiemTraSoDo()`; kết quả rỗng là đạt.

## Trước khi gửi thay đổi

```bash
npm run check:content
npm run check:diagrams
npm run build
```

Cả ba phải chạy không lỗi. Nếu bạn thêm thành phần tương tác mới, nhớ truyền chỉ thị `client:visible` để nó hoạt động trên trang tĩnh.
