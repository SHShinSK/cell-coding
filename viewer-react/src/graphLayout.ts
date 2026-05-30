import type {
  CellLifecyclePhase,
  FlowStep,
  GraphLayout,
  NodePosition,
  ProgramGraph,
  ViewerScenario,
} from './types';

/** 세포 lifecycle phase → SVG stroke 색상 */
export function phaseStroke(phase: CellLifecyclePhase): string {
  switch (phase) {
    case 'apoptosis': return '#ff6b6b';
    case 'emitting': return '#ffd166';
    case 'active': return '#2dff8f';
    case 'genesis': return '#888888';
    default: return '#74c0fc';
  }
}

/** tissue flow + immune 노드 배치 */
export function nodeLayout(scenario: ViewerScenario): {
  positions: Map<string, NodePosition>;
  width: number;
  height: number;
} {
  const flow = scenario.graph.tissueFlow[0] || scenario.graph.cells.map(c => c.name);
  const cellW = 130;
  const cellH = 52;
  const gap = 48;
  const pad = 40;
  const positions = new Map<string, NodePosition>();

  flow.forEach((name, i) => {
    positions.set(name, {
      x: pad + i * (cellW + gap),
      y: 80,
      w: cellW,
      h: cellH,
      kind: 'cell',
    });
  });

  positions.set('external', {
    x: pad - 60,
    y: 80,
    w: 90,
    h: 44,
    kind: 'external',
  });

  scenario.graph.immune.forEach((pol, i) => {
    positions.set(`immune:${pol.name}`, {
      x: pad + ((flow.length - 1) * (cellW + gap)) / 2 + i * 20,
      y: 180,
      w: 120,
      h: 40,
      kind: 'immune',
      label: pol.name,
    });
  });

  const width = pad * 2 + flow.length * cellW + Math.max(0, flow.length - 1) * gap;
  return { positions, width, height: 250 };
}

function resolveFromPosition(
  step: FlowStep,
  graph: ProgramGraph,
  positions: Map<string, NodePosition>,
): NodePosition | undefined {
  if (step.fromKind === 'external') return positions.get('external');
  if (step.fromKind === 'immune') {
    const pol = graph.immune.find(p => step.from.includes(p.name));
    if (pol) return positions.get(`immune:${pol.name}`);
  }
  return positions.get(step.from);
}

/** activeStep까지의 SVG 그래프 레이아웃 계산 */
export function buildGraphLayout(
  scenario: ViewerScenario,
  activeStep: number,
): GraphLayout {
  const { positions, width, height } = nodeLayout(scenario);
  const flow = scenario.graph.tissueFlow[0] || [];
  const staticEdges: GraphLayout['staticEdges'] = [];

  for (let i = 0; i < flow.length - 1; i++) {
    const a = positions.get(flow[i]);
    const b = positions.get(flow[i + 1]);
    if (!a || !b) continue;
    staticEdges.push({
      x1: a.x + a.w,
      y1: a.y + a.h / 2,
      x2: b.x,
      y2: b.y + b.h / 2,
    });
  }

  const flowEdges: GraphLayout['flowEdges'] = [];

  for (let i = 0; i <= activeStep; i++) {
    const step = scenario.steps[i];
    if (!step) continue;

    const fromPos = resolveFromPosition(step, scenario.graph, positions);
    if (!fromPos) continue;

    const targets = step.consumers.length ? step.consumers : [];
    if (targets.length === 0 && step.fromKind === 'cell') continue;

    for (const target of targets) {
      const toPos = positions.get(target);
      if (!toPos) continue;

      const x1 = fromPos.x + fromPos.w;
      const y1 = fromPos.y + fromPos.h / 2;
      const x2 = toPos.x;
      const y2 = toPos.y + toPos.h / 2;
      const mx = (x1 + x2) / 2;
      const my = Math.min(y1, y2) - 20 - i * 2;

      flowEdges.push({
        key: `edge-${i}-${target}`,
        fromKind: step.fromKind,
        d: `M${x1},${y1} Q${mx},${my} ${x2},${y2}`,
        labelX: mx,
        labelY: my - 4,
        label: i === activeStep ? step.signal.type : undefined,
        active: i === activeStep,
      });
    }
  }

  const nodes: GraphLayout['nodes'] = [];
  for (const [name, pos] of positions) {
    nodes.push({
      name,
      pos,
      phase: pos.kind === 'cell' ? scenario.lifecycle.states[name] : undefined,
    });
  }

  return { positions, width, height, staticEdges, flowEdges, nodes };
}

export function nodeLabel(name: string, pos: NodePosition): string {
  const raw = pos.label || (name === 'external' ? 'external' : name.replace(/^immune:/, ''));
  return raw.length > 14 ? `${raw.slice(0, 12)}…` : raw;
}
