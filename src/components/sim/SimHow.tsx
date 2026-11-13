// Khung "Cách dùng" nằm ngay dưới tiêu đề mỗi bài mô phỏng:
// nói ngắn gọn bấm vào đâu, làm gì thì thấy gì. Có thể thu gọn lại sau khi đã quen.
export default function SimHow({ steps, defaultOpen = false }: { steps: string[]; defaultOpen?: boolean }) {
  if (steps.length === 0) return null;
  // Chỉ một ý thì ghi gọn một dòng, khỏi cần khung thu gọn.
  if (steps.length === 1) {
    return (
      <p className="sim-how sim-how-line">
        <strong>Cách dùng:</strong> {steps[0]}
      </p>
    );
  }
  return (
    <details className="sim-how" open={defaultOpen}>
      <summary>Cách dùng</summary>
      <ol>
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </details>
  );
}
