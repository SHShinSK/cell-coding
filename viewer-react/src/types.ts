export interface SignalInstance {
  type: string;
  data: Record<string, unknown>;
}

export interface TraceEntry {
  from: string;
  signal: SignalInstance;
  atMs?: number;
  backoffMs?: number;
}

export interface FlowStep {
  index: number;
  from: string;
  fromKind: 'external' | 'cell' | 'immune';
  signal: SignalInstance;
  consumers: string[];
  atMs?: number;
  backoffMs?: number;
}

export type CellLifecyclePhase =
  | 'genesis'
  | 'dormant'
  | 'active'
  | 'emitting'
  | 'apoptosis';

export interface LifecycleTransition {
  cell: string;
  from: CellLifecyclePhase;
  to: CellLifecyclePhase;
  reason: string;
  step: number;
}

export interface LifecycleSnapshot {
  states: Record<string, CellLifecyclePhase>;
  transitions: LifecycleTransition[];
}

export interface CellGraphNode {
  name: string;
  role: string;
  accepts: string[];
  emits: string[];
  handlers: string[];
}

export interface ImmuneGraphNode {
  name: string;
  errorType: string;
  strategy: string;
}

export interface ProgramGraph {
  cells: CellGraphNode[];
  tissueFlow: string[][];
  immune: ImmuneGraphNode[];
}

export interface ViewerScenario {
  id: string;
  title: string;
  titleKo: string;
  file: string;
  input: SignalInstance;
  graph: ProgramGraph;
  trace: TraceEntry[];
  steps: FlowStep[];
  lifecycle: LifecycleSnapshot;
  inspect: ViewerInspectSnapshot;
}

export interface ViewerHierarchyCell {
  name: string;
  role: string;
  tissue?: string;
  organ?: string;
}

export interface ViewerHierarchyOrgan {
  name: string;
  tissues: string[];
  cells: ViewerHierarchyCell[];
  exports: string[];
}

export interface ViewerNervousRoute {
  source: string;
  targets: string[];
  branchKind?: string;
  hasTransform: boolean;
}

export interface ViewerImmunePolicy {
  block: string;
  errorType: string;
  strategy: string;
  escalate?: boolean;
}

export interface ViewerInspectSnapshot {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    signalCount: number;
    cellCount: number;
    tissueCount: number;
    organCount: number;
  };
  organism?: {
    name: string;
    organs: string[];
  };
  hierarchy: ViewerHierarchyOrgan[];
  nervousRoutes: ViewerNervousRoute[];
  immunePolicies: ViewerImmunePolicy[];
}

/** OTel/Jaeger links from cell run --jaeger · 관측성 링크 */
export interface LiveRunObservability {
  jaegerUrl?: string;
  otelService?: string;
}

export interface TracesPayload {
  version: number;
  generatedAt: string;
  live?: boolean;
  watch?: boolean;
  pollIntervalMs?: number;
  observability?: LiveRunObservability;
  scenarios: ViewerScenario[];
}

export type NodeKind = 'cell' | 'external' | 'immune';

export interface NodePosition {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: NodeKind;
  label?: string;
}

export interface FlowEdge {
  key: string;
  fromKind: FlowStep['fromKind'];
  d: string;
  labelX: number;
  labelY: number;
  label?: string;
  active: boolean;
}

export interface GraphLayout {
  positions: Map<string, NodePosition>;
  width: number;
  height: number;
  staticEdges: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  flowEdges: FlowEdge[];
  nodes: Array<{ name: string; pos: NodePosition; phase?: CellLifecyclePhase }>;
}
