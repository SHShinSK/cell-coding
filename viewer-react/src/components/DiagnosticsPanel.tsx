import type { ViewerInspectSnapshot } from '../types';

interface Props {
  inspect: ViewerInspectSnapshot;
}

/** 막 계약·타입 checker 오류·경고 */
export default function DiagnosticsPanel({ inspect }: Props) {
  const hasIssues = inspect.errors.length > 0 || inspect.warnings.length > 0;

  return (
    <div className="diagnostics-panel">
      <div className="diag-stats">
        <span className={inspect.ok ? 'ok' : 'bad'}>
          {inspect.ok ? '✓ membrane OK · 막 계약 OK' : '✗ membrane issues · 막 계약 문제'}
        </span>
        <span className="muted">
          {inspect.stats.signalCount} sig · {inspect.stats.cellCount} cells
        </span>
      </div>

      {!hasIssues && (
        <p className="muted">No checker errors or warnings · checker 오류·경고 없음</p>
      )}

      {inspect.errors.length > 0 && (
        <ul className="diag-list errors">
          {inspect.errors.map(msg => (
            <li key={msg}>✗ {msg}</li>
          ))}
        </ul>
      )}

      {inspect.warnings.length > 0 && (
        <ul className="diag-list warnings">
          {inspect.warnings.map(msg => (
            <li key={msg}>⚠ {msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
