import type { LifecycleSnapshot } from '../types';

interface Props {
  lifecycle: LifecycleSnapshot;
}

/** 생존 주기 패널 */
export default function LifecyclePanel({ lifecycle }: Props) {
  const transitions = lifecycle.transitions.slice(-12);

  return (
    <>
      <div className="lifecycle-states">
        {Object.entries(lifecycle.states).map(([cell, phase]) => (
          <div className="lc-row" key={cell}>
            <span>{cell}</span>
            <span className={`badge ${phase}`}>{phase}</span>
          </div>
        ))}
      </div>
      <div className="lifecycle-list">
        {transitions.map(t => (
          <div className="lc-trans" key={t.step}>
            {t.step}. {t.cell}: {t.from} → {t.to}
          </div>
        ))}
      </div>
    </>
  );
}
