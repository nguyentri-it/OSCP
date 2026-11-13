import { useState } from 'react';
import SimHow from './SimHow';

export interface WalkStep {
  phase: string;
  title: string;
  cmd?: string;
  // Giải nghĩa lệnh: mỗi phần tử một ý.
  explain?: string[];
  prompt?: string;
  output?: { text: string; hit?: boolean }[];
  takeaway: string;
  tone?: 'good' | 'warn' | 'bad';
}

interface Props {
  title?: string;
  steps: WalkStep[];
}

// Trình xem walkthrough: hé lộ từng bước của một chuỗi tấn công hư cấu, kèm lệnh,
// output mẫu và bài học rút ra. Dữ liệu là giả, chỉ để minh hoạ cách ráp kỹ thuật.
export default function Walkthrough({ title, steps }: Props) {
  const [cur, setCur] = useState(0);
  if (steps.length === 0) return null;
  const atEnd = cur >= steps.length - 1;

  // Danh sách phase duy nhất, theo thứ tự, để vẽ thanh tiến trình.
  const phases: string[] = [];
  for (const s of steps) if (!phases.includes(s.phase)) phases.push(s.phase);
  const curPhase = steps[cur].phase;

  return (
    <div className="sim walk">
      {title && <p className="sim-title">{title}</p>}
      <SimHow steps={["Bấm \"Bước tiếp →\" để xem từng bước của câu chuyện. Mỗi bước có lệnh, kết quả mẫu và một dòng \"Rút ra\".", "Bấm tên một giai đoạn ở thanh phía trên để nhảy thẳng tới đó. Mọi dữ liệu ở đây là giả, không có gì chạy thật."]} />
      <ol className="walk-phases" aria-label="Các giai đoạn">
        {phases.map((p) => {
          const firstIdx = steps.findIndex((s) => s.phase === p);
          const done = cur > steps.map((s) => s.phase).lastIndexOf(p);
          const active = p === curPhase;
          return (
            <li key={p} className={`${active ? 'on' : ''} ${done ? 'done' : ''}`}>
              <button type="button" onClick={() => setCur(firstIdx)} title={`Tới giai đoạn: ${p}`}>
                {p}
              </button>
            </li>
          );
        })}
      </ol>

      {cur > 0 && (
        <details className="walk-history">
          <summary>Đã xem {cur} bước trước — bấm để quay lại một bước</summary>
          <ol>
            {steps.slice(0, cur).map((s, i) => (
              <li key={i}>
                <button type="button" onClick={() => setCur(i)}>
                  <span>{s.phase}</span> {s.title}
                </button>
              </li>
            ))}
          </ol>
        </details>
      )}

      <ol className="walk-steps">
        <li className="walk-step active">
          <div className="walk-head">
            <span className="walk-badge">{steps[cur].phase}</span>
            <strong>{steps[cur].title}</strong>
          </div>
          {steps[cur].cmd && (
            <pre className="walk-cmd">
              <span className="walk-prompt">{steps[cur].prompt ?? 'kali@lab:~$'}</span> {steps[cur].cmd}
            </pre>
          )}
          {steps[cur].cmd && steps[cur].explain && steps[cur].explain.length > 0 && (
            <div className="walk-explain">
              <p className="walk-explain-h">Giải nghĩa lệnh</p>
              <ul>
                {steps[cur].explain.map((e, k) => (
                  <li key={k}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {steps[cur].output && (
            <pre className="walk-out">
              {steps[cur].output.map((l, j) => (
                <span key={j} className={l.hit ? 'walk-hit' : ''}>
                  {l.text || ' '}
                  {'\n'}
                </span>
              ))}
            </pre>
          )}
          <p className={`walk-take ${steps[cur].tone ?? ''}`}>
            <span className="walk-take-label">Rút ra</span>
            {steps[cur].takeaway}
          </p>
        </li>
      </ol>

      <div className="sim-controls">
        <button type="button" className="btn" onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0}>
          ← Lùi
        </button>
        <button type="button" className="btn primary" onClick={() => setCur((c) => Math.min(steps.length - 1, c + 1))} disabled={atEnd}>
          {atEnd ? 'Đã hết' : 'Bước tiếp →'}
        </button>
        <button type="button" className="btn" onClick={() => setCur(0)} disabled={cur === 0}>
          Từ đầu
        </button>
        <span className="walk-count">
          Bước {cur + 1}/{steps.length}
        </span>
      </div>
    </div>
  );
}
