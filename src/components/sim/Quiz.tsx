import { useState } from 'react';
import SimHow from './SimHow';

// Chữ nằm giữa hai dấu ` được hiển thị như mã (<code>), thay vì lộ nguyên dấu backtick.
function inline(text: string) {
  return text.split('`').map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part));
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export default function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  const answered = picked.filter((p) => p !== null).length;
  const correct = picked.filter((p, i) => p === questions[i].answer).length;

  function choose(qi: number, oi: number) {
    if (picked[qi] !== null) return;
    setPicked((prev) => prev.map((p, i) => (i === qi ? oi : p)));
  }

  return (
    <div className="sim quiz">
      <p className="sim-title">Kiểm tra nhanh</p>
      <SimHow steps={["Bấm vào đáp án bạn chọn. Chọn xong sẽ hiện ngay đúng hay sai kèm lời giải thích. Muốn thử lại thì bấm \"Làm lại\" ở cuối."]} />
      {questions.map((item, qi) => {
        const p = picked[qi];
        return (
          <fieldset key={qi} className="quiz-q">
            <legend>
              <span className="quiz-n">{qi + 1}.</span> {inline(item.q)}
            </legend>
            <div className="quiz-opts">
              {item.options.map((opt, oi) => {
                let state = '';
                if (p !== null) {
                  if (oi === item.answer) state = 'right';
                  else if (oi === p) state = 'wrong';
                }
                return (
                  <button
                    key={oi}
                    type="button"
                    className={`quiz-opt ${state}`}
                    onClick={() => choose(qi, oi)}
                    disabled={p !== null}
                  >
                    {inline(opt)}
                  </button>
                );
              })}
            </div>
            {p !== null && (
              <p className={`quiz-explain ${p === item.answer ? 'ok' : 'no'}`}>
                <strong>{p === item.answer ? 'Đúng.' : 'Chưa đúng.'}</strong> {inline(item.explain)}
              </p>
            )}
          </fieldset>
        );
      })}
      <div className="sim-controls">
        <span>
          {answered < questions.length
            ? `Đã trả lời ${answered}/${questions.length}`
            : `Kết quả: ${correct}/${questions.length} câu đúng`}
        </span>
        {answered > 0 && (
          <button type="button" className="btn" onClick={() => setPicked(questions.map(() => null))}>
            Làm lại
          </button>
        )}
      </div>
    </div>
  );
}
