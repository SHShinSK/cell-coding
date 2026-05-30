import type { ViewerInspectSnapshot } from '../types';

interface Props {
  inspect: ViewerInspectSnapshot;
}

/** organism → organ → tissue → cell 계층 트리 */
export default function OrganismPanel({ inspect }: Props) {
  const org = inspect.organism;

  return (
    <div className="organism-panel">
      {org ? (
        <div className="org-root">
          <div className="org-name">{org.name}</div>
          {inspect.hierarchy.map(organ => (
            <div key={organ.name} className="organ-block">
              <div className="organ-head">
                <span className="organ-label">organ · 기관</span>
                <strong>{organ.name}</strong>
                {organ.exports.length > 0 && (
                  <span className="organ-meta">exports: {organ.exports.join(', ')}</span>
                )}
              </div>
              <ul className="tissue-list">
                {organ.tissues.map(tissue => (
                  <li key={tissue}>
                    <span className="tissue-name">{tissue}</span>
                    <ul className="cell-list">
                      {organ.cells
                        .filter(c => c.tissue === tissue)
                        .map(cell => (
                          <li key={cell.name} title={cell.role}>
                            {cell.name}
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No organism block · organism 선언 없음</p>
      )}

      {inspect.nervousRoutes.length > 0 && (
        <div className="route-block">
          <div className="section-label">nervous · 신경계</div>
          <ul className="route-list">
            {inspect.nervousRoutes.map(route => (
              <li key={`${route.source}-${route.targets.join('-')}`}>
                <code>{route.source}</code>
                <span> → {route.targets.join(', ')}</span>
                {route.branchKind && route.branchKind !== 'plain' && (
                  <span className="tag">{route.branchKind}</span>
                )}
                {route.hasTransform && <span className="tag">transform</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {inspect.immunePolicies.length > 0 && (
        <div className="route-block">
          <div className="section-label">immune · 면역계</div>
          <ul className="route-list">
            {inspect.immunePolicies.map(p => (
              <li key={`${p.errorType}-${p.strategy}`}>
                <code>{p.errorType}</code>
                <span> → {p.strategy}</span>
                {p.escalate && <span className="tag warn">escalate</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
