import { buildGraphLayout, nodeLabel, phaseStroke } from '../graphLayout';
import type { ViewerScenario } from '../types';

interface Props {
  scenario: ViewerScenario;
  activeStep: number;
}

/** SVG 신호 그래프 · static viewer/index.html 포팅 */
export default function SignalGraph({ scenario, activeStep }: Props) {
  const layout = buildGraphLayout(scenario, activeStep);

  return (
    <div className="graph-wrap">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker
            id="arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L6,3 z" fill="rgba(45,255,143,0.6)" />
          </marker>
        </defs>

        {layout.staticEdges.map((e, i) => (
          <line
            key={`static-${i}`}
            className="edge-static"
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
          />
        ))}

        {layout.flowEdges.map(edge => (
          <g key={edge.key}>
            <path
              className={[
                'edge-flow',
                edge.fromKind,
                edge.active ? 'active' : '',
              ].filter(Boolean).join(' ')}
              d={edge.d}
              markerEnd="url(#arrow)"
            />
            {edge.label && (
              <text className="edge-label" x={edge.labelX} y={edge.labelY} textAnchor="middle">
                {edge.label}
              </text>
            )}
          </g>
        ))}

        {layout.nodes.map(({ name, pos, phase }) => {
          const cls =
            pos.kind === 'external'
              ? 'node-external'
              : pos.kind === 'immune'
                ? 'node-immune'
                : 'node-cell';
          const stroke = phase ? phaseStroke(phase) : undefined;

          return (
            <g key={name} transform={`translate(${pos.x},${pos.y})`}>
              <rect
                className={cls}
                width={pos.w}
                height={pos.h}
                rx={8}
                stroke={stroke}
              />
              <text className="node-label" x={pos.w / 2} y={pos.h / 2 - 2} textAnchor="middle">
                {nodeLabel(name, pos)}
              </text>
              {phase && (
                <text className="node-sub" x={pos.w / 2} y={pos.h / 2 + 12} textAnchor="middle">
                  {phase}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
