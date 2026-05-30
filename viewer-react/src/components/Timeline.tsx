import type { FlowStep } from '../types';

interface Props {
  steps: FlowStep[];
  activeStep: number;
  filter: string;
  onSelect: (index: number) => void;
}

function filteredItems(steps: FlowStep[], filter: string) {
  const q = filter.trim().toLowerCase();
  if (!q) return steps.map((step, index) => ({ step, index }));
  return steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) =>
      step.from.toLowerCase().includes(q) ||
      step.signal.type.toLowerCase().includes(q) ||
      step.consumers.some(c => c.toLowerCase().includes(q)),
    );
}

/** 타임라인 패널 */
export default function Timeline({ steps, activeStep, filter, onSelect }: Props) {
  const items = filteredItems(steps, filter);

  return (
    <div className="timeline">
      {items.length === 0 && (
        <div className="status">No matching steps · 일치하는 단계 없음</div>
      )}
      {items.map(({ step, index }) => {
        const data = Object.keys(step.signal.data).length
          ? ` ${JSON.stringify(step.signal.data)}`
          : '';
        const consumers = step.consumers.length
          ? `→ ${step.consumers.join(', ')}`
          : '(no consumer · 소비 세포 없음)';
        const timing = step.backoffMs != null
          ? `⏱ backoff ${step.backoffMs}ms · t=${step.atMs ?? 0}ms`
          : step.atMs != null && step.atMs > 0
            ? `⏱ t=${step.atMs}ms`
            : '';

        return (
          <article
            key={index}
            className={`step${index === activeStep ? ' active' : ''}`}
            onClick={() => onSelect(index)}
          >
            <div className="step-num">{index + 1}</div>
            <div>
              <div className={`step-from ${step.fromKind}`}>{step.from}</div>
              <div className="step-signal">{step.signal.type}{data}</div>
              <div className="step-meta">
                {consumers}
                {timing && <span>{consumers ? ' · ' : ''}{timing}</span>}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
