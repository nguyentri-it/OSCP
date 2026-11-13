import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

// Trang được host tại https://nguyentri-it.github.io/OSCP/
const base = '/OSCP';

// Tháng 11/2026 các bài phòng thủ được sắp lại thành Cấp 6 (mối đe doạ), 7 (phòng ngừa), 8 (phát hiện,
// phản ứng, phục hồi), nên một số bài đổi mã và đổi đường dẫn. Giữ đường dẫn cũ chuyển sang bài mới
// để link đã chia sẻ không chết. Đích phải ghi cả base vì Astro không tự thêm base cho đích chuyển hướng.
const movedLessons = {
  '6-2-soc-dung-ai': '8-1-soc-dung-ai',
  '6-3-chong-gian-lan-deepfake': '6-2-chong-gian-lan-deepfake',
  '6-5-capstone-dien-tap-ung-pho': '8-7-capstone-dien-tap-ung-pho',
  '7-2-phong-thu-toc-do-may': '8-4-phong-thu-toc-do-may',
  '7-3-phuc-hoi-tong-tien': '8-6-phuc-hoi-tong-tien',
  '7-4-ban-do-phat-hien': '8-2-ban-do-phat-hien',
  '7-5-lab-phong-thu-wazuh': '8-3-lab-phong-thu-wazuh',
  '7-6-danh-tinh-sau-mfa': '7-3-danh-tinh-sau-mfa',
  '7-7-help-desk-khoi-phuc-tai-khoan': '7-4-help-desk-khoi-phuc-tai-khoan',
  '7-8-thu-gia-ten-mien-nhai': '7-5-thu-gia-ten-mien-nhai',
};

export default defineConfig({
  site: 'https://nguyentri-it.github.io',
  base,
  trailingSlash: 'always',
  integrations: [mdx(), react()],
  // Tắt smartypants: nó đổi dấu nháy thẳng thành nháy cong cả trong thẻ <code> viết bằng HTML,
  // làm lệnh chép ra không chạy được (ví dụ 'Summer2024!' thành ‘Summer2024!’).
  markdown: { smartypants: false },
  redirects: Object.fromEntries(
    Object.entries(movedLessons).map(([from, to]) => [`/bai/${from}/`, `${base}/bai/${to}/`]),
  ),
});
